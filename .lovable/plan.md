# Drug-View — Plan

A 3D visualization tool for medical students. Users search any drug (backed by a live drug information source), pick one, and watch a Three.js animation of the drug moving through the body — ingestion, absorption, distribution, target binding, metabolism, excretion — with pharmacokinetic detail (route, half-life, receptors, metabolizing enzymes, elimination pathway).

## Scope reality check

"Every drug on drugs.com" is thousands of entries. Hand-authoring a unique 3D scene per drug is not feasible. The workable approach: **one generic 3D body model + a set of animation templates keyed by drug class / route / target organ**, driven by a per-drug data record. Any drug can be visualized as soon as we have (or fetch) its metadata.

## v1 experience

```text
 ┌──────────────────────────────────────────────────────────┐
 │  Drug-View                                    [search…]  │
 ├────────────┬─────────────────────────────────────────────┤
 │  Library   │        3D Body Viewer (Three.js)            │
 │  ──────    │   ┌─────────────────────────────────────┐   │
 │  Popular   │   │                                     │   │
 │  • Ibuprof │   │        [ rotating body ]            │   │
 │  • Metform │   │     animated drug particles         │   │
 │  • Warfar. │   │                                     │   │
 │  • Aspirin │   └─────────────────────────────────────┘   │
 │  Classes   │   ▶ Play  ⏸  ⟲    Phase: Distribution      │
 │  • NSAIDs  │   ────●────────────────  t = 45 min         │
 │  • Statins │                                             │
 │  ...       │   Info panel: MoA, half-life, CYP, targets │
 └────────────┴─────────────────────────────────────────────┘
```

Two routes:
- `/` — library + search (seeded featured drugs, live search across full catalog).
- `/drug/$slug` — 3D viewer + info panel for one drug.

## Data strategy

- **Seed catalog (in migration):** ~30 hand-curated drugs across major classes (NSAIDs, statins, beta-blockers, ACE-i, SSRIs, opioids, anticoagulants, antibiotics, antidiabetics, PPIs, etc.) with full animation metadata. Enough to feel populated on first load.
- **Live lookup:** search box queries **RxNorm** (free, no key) for drug names/RxCUI, then pulls structured detail from **openFDA** (label, route, pharmacology). Results are cached in a `drugs` table so the second visit is instant.
- **Fallback:** if openFDA lacks fields (MoA, half-life, target), a server function calls the Lovable AI Gateway (Gemini) with the label text to extract a strict JSON schema (`route`, `target_organ`, `receptors[]`, `metabolizing_enzymes[]`, `elimination`, `half_life_hours`, `class`, `mechanism_summary`). Result is cached.
- No drugs.com scraping — their ToS forbids it. RxNorm + openFDA covers the same universe of drugs with a proper license.

## Animation engine

One `<BodyScene>` component (React Three Fiber + drei) renders:
- Stylized translucent human body (GLB model from a free source, or a composed primitive body — see technical notes).
- Highlightable organs: GI tract, liver, kidneys, heart, brain, lungs, target organ.
- A **particle system** representing drug molecules, animated along splines.

A drug record specifies:
```ts
{
  route: 'oral' | 'iv' | 'im' | 'inhaled' | 'topical' | 'sublingual',
  absorptionSite: 'stomach' | 'small_intestine' | 'lungs' | 'skin' | 'bloodstream',
  targetOrgan: 'brain' | 'heart' | 'joints' | 'vessels' | ...,
  receptors: ['COX-1','COX-2'],
  metabolism: { organ: 'liver', enzymes: ['CYP2C9'] },
  elimination: 'renal' | 'hepatic' | 'both',
  halfLifeHours: 2,
  onset: 'fast' | 'medium' | 'slow',
}
```

The engine composes phases from this record: **Route-in → Absorption → Distribution (bloodstream) → Target binding (pulse at target organ) → Metabolism (liver glow + enzyme label) → Elimination (kidney/bile particles out)**. A timeline scrubber + play/pause controls the shared animation clock. Phase labels + on-screen callouts explain what's happening.

This gives every drug a correct, distinct-looking animation without bespoke authoring.

## Screens & components

- `routes/index.tsx` — hero, search input, featured grid, class browser.
- `routes/drug/$slug.tsx` — 3D viewer (left), info panel (right) with tabs: *Overview*, *Pharmacokinetics*, *Mechanism*, *Clinical notes*.
- `components/body-scene/*` — R3F scene, organ meshes, particle system, camera rig, phase timeline.
- `components/drug-info-panel.tsx`.
- `components/drug-search.tsx` — command-palette style, hits RxNorm.

## Backend (Lovable Cloud)

Tables:
- `drugs` — cached drug records with animation metadata JSON.
- `drug_aliases` — brand/generic name → drug id.

Server functions (`src/lib/drugs.functions.ts`):
- `searchDrugs({ q })` — RxNorm approximate match; returns cached hits first.
- `getDrug({ slug })` — cache lookup, else fetch openFDA + AI-extract, then upsert and return.

RLS: public SELECT on `drugs` and `drug_aliases`; writes only via server functions using service role. Grants per project rules.

## Design direction

Medical-clinical, dark theme, high contrast, restrained color. Body model in cool translucent blue; drug particles in warm accent (amber/coral) so they read against tissue. Data panels use monospaced numerics for half-life, dose, Tmax. No purple gradients, no generic marketing hero.

## Technical notes

- **Stack:** React Three Fiber (`@react-three/fiber`), `@react-three/drei`, `three`, `leva` (dev only, optional). All client-only — the scene component is lazy-loaded behind `<ClientOnly>` to avoid SSR of WebGL.
- **Body model:** use a permissively licensed low-poly anatomy GLB (e.g. from Sketchfab CC0) placed in `public/models/`. If none is acceptable at build time, fall back to a composed silhouette from primitive meshes (torso capsule + head sphere + labeled organ meshes) — still readable and fully controllable.
- **Particles:** `THREE.InstancedMesh` of ~200–500 small spheres animated along `CatmullRomCurve3` splines per phase. Cheap, smooth, works on mid-range laptops.
- **Route data flow:** `/drug/$slug` uses `ensureQueryData` in the loader calling `getDrug`. Search uses `useQuery`.
- **APIs:** RxNorm (`https://rxnav.nlm.nih.gov/REST/`) and openFDA (`https://api.fda.gov/drug/label.json`) — both free, no key. Called from server functions to keep responses cached and CORS-clean.
- **AI extraction:** Lovable AI Gateway, `google/gemini-2.5-flash`, JSON response format with a Zod-validated schema.
- **Seed data:** literal INSERTs in the initial migration for the ~30 curated drugs, so the home page is populated on first load.

## Out of scope for v1

- Dose calculators, interactions checker, patient-specific PK modeling.
- Compare-two-drugs view (possible v2).
- Molecular-structure rendering (SMILES → 3D) — possible v2.
- Auth / user accounts / saved drugs — add later if wanted.

## Milestones

1. Enable Lovable Cloud, create schema + seed migration, RxNorm/openFDA server functions.
2. Library page (`/`) with search and featured grid.
3. `BodyScene` with body model, organ meshes, and a static particle path — wired to one seeded drug (ibuprofen) end-to-end.
4. Generalize the animation engine to consume any drug record; add timeline + phase labels + info panel.
5. Cache-on-demand for arbitrary drug lookups via AI extraction fallback.
6. Polish: loading states, empty states, mobile fallback (2D diagram when WebGL unavailable), SEO head per route.
