# Drug-View

A 3D pharmacology visualizer — see a drug move through the body.

## About

Drug-View is an interactive web app that turns pharmacokinetic data into an animated 3D
walkthrough of a drug's journey through the human body. Pick a medication and watch it
animate step by step through:

1. **Absorption** — entry at the route of administration (oral, IV, inhaled, topical…)
2. **Distribution** — transport through systemic circulation to target tissue
3. **Receptor binding** — the target organ and the receptors/enzymes involved
4. **Metabolism** — the metabolizing organ and the enzyme systems responsible
5. **Elimination** — renal, hepatic/biliary, or pulmonary clearance

Each phase is paired with the numbers clinicians actually use: half-life, onset, time to
peak, typical dosing, mechanism of action, and clinical notes.

Built for medical students and clinicians who want an intuitive spatial mental model of
ADME rather than another wall of text.

## Features

- **406+ drug catalog** — 49 hand-curated entries with detailed, reviewed pharmacology,
  plus 350+ auto-cached entries generated from public FDA label data.
- **Live lookup** — search anything outside the catalog and it is resolved on the fly via
  the RxNorm vocabulary and the openFDA label API, then rendered as an ephemeral preview.
- **Procedural 3D anatomy** — a translucent, anatomical-chart-style human figure with
  distinct organ silhouettes (two-lobed heart, asymmetric lungs, wedge liver, J-curve
  stomach, bean kidneys, coiled intestine, brain, marrow, muscle, lymph nodes). All
  geometry is generated in code — no external 3D assets.
- **Animated particle transport** along anatomical splines, driven by each drug's own
  metadata rather than a canned animation.
- **Light and dark themes** with no flash of the wrong theme on load.
- **Drug class filtering** with a top-classes pill row and a searchable overflow menu.
- **Source citations** — curated entries link out to MedlinePlus / DailyMed references,
  and auto-generated entries are badged as such so provenance is always visible.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | TanStack Start (TanStack Router + Vite) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS, Radix primitives |
| 3D | Three.js via React Three Fiber + drei |
| Data | Supabase (Postgres, Data API, row-level security) |
| Server logic | TanStack server functions (`createServerFn`) |
| Data fetching | TanStack Query |

External data sources: [RxNorm](https://www.nlm.nih.gov/research/umls/rxnorm/) (NLM) and
[openFDA](https://open.fda.gov/) drug label API.

## Local development

Requires [Bun](https://bun.sh) (or Node.js 20+ with npm).

```sh
git clone <this-repository-url>
cd drug-view

bun install        # or: npm install
bun run dev        # or: npm run dev
```

The dev server starts on `http://localhost:8080`.

### Environment variables

Create a `.env` file in the project root with the following keys (values come from your
own Postgres/Supabase project — never commit real values):

```sh
# Browser-visible
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=

# Server-side only
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_PROJECT_ID=
```

Only the publishable (anon) key is needed to run the app: the `drugs` table is read-only
to the public and the live-lookup server function is strictly read-only. A service-role
key is required only for applying database migrations, never at runtime in the browser.

### Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run preview` | Preview the production build |
| `bun run lint` | Lint with ESLint |
| `bun run format` | Format with Prettier |

### Database

Schema and seed data live in `supabase/migrations/`. The core table is `drugs`
(pharmacokinetic fields, receptor/enzyme arrays, source URL, and a `source` column marking
each row as `curated` or `api_cache`). Public read access is granted via row-level
security; all write privileges are revoked for anonymous and authenticated roles.

## Project structure

```text
src/
├── components/
│   ├── body-scene/        # Procedural Three.js anatomy + organ geometry
│   ├── drug-info-panel.tsx
│   ├── drug-viewer.tsx    # Shared viewer for stored and live drugs
│   └── phase-timeline.tsx
├── lib/
│   ├── anatomy.ts             # Organ coordinates in 3D space
│   ├── animation-phases.ts    # Drug metadata → animation phases
│   ├── drugs-data.ts          # Catalog fetching, types, search filter
│   ├── drug-lookup.functions.ts  # Public read-only lookup server function
│   └── drug-lookup.server.ts     # RxNorm / openFDA parsing
└── routes/
    ├── index.tsx          # Library + search
    ├── drug.$slug.tsx     # Catalog drug viewer
    └── live.$term.tsx     # Ephemeral live-lookup viewer
```

## Disclaimer

**Educational tool — not for clinical decision-making.** Drug-View simplifies complex
pharmacology for teaching purposes, and auto-generated entries are derived from public
label text without individual review. Always consult authoritative prescribing
information and clinical judgement for patient care.

## Credits

Built by **[Subham Samal](https://www.linkedin.com/in/subhh-worldw/)** (IMSC.Bi, BJB Autonomous College) 🧬

## License

License: TBD
