// Server-only helpers for live drug lookup via RxNorm + openFDA.
// Kept out of *.functions.ts so server-fn splitting can't drop these siblings.
import type { TablesInsert } from "@/integrations/supabase/types";

const ROUTE_MAP: Record<string, string> = {
  oral: "oral",
  "by mouth": "oral",
  buccal: "sublingual",
  sublingual: "sublingual",
  intravenous: "iv",
  iv: "iv",
  infusion: "iv",
  intramuscular: "im",
  im: "im",
  subcutaneous: "subcutaneous",
  "sub-cutaneous": "subcutaneous",
  inhalation: "inhaled",
  "respiratory (inhalation)": "inhaled",
  nasal: "inhaled",
  topical: "topical",
  cutaneous: "topical",
  transdermal: "topical",
  ophthalmic: "topical",
  otic: "topical",
  rectal: "oral",
  vaginal: "topical",
};

export function mapRoute(raw?: string | null): string {
  if (!raw) return "oral";
  const key = raw.trim().toLowerCase();
  if (ROUTE_MAP[key]) return ROUTE_MAP[key];
  for (const [k, v] of Object.entries(ROUTE_MAP)) {
    if (key.includes(k)) return v;
  }
  return "oral";
}

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const LABEL_HEADINGS = [
  "indications and usage",
  "dosage and administration",
  "mechanism of action",
  "pharmacokinetics",
  "clinical pharmacology",
  "absorption",
  "distribution",
  "metabolism",
  "excretion",
];

function stripLabelHeading(text: string): string {
  let out = text.replace(/^\s*\d+(\.\d+)*\s*/, "");
  let changed = true;
  while (changed) {
    changed = false;
    for (const h of LABEL_HEADINGS) {
      if (out.slice(0, h.length).toLowerCase() === h) {
        out = out.slice(h.length).replace(/^[:\s-]+/, "").replace(/^\d+(\.\d+)*\s*/, "");
        changed = true;
      }
    }
  }
  return out.trim();
}

function firstSentences(text: string, count = 2): string {
  const clean = stripLabelHeading(text.replace(/\s+/g, " ").trim());
  const parts = clean.split(/(?<=\.)\s+/).slice(0, count).join(" ");
  return (parts || clean).slice(0, 600);
}

/** Normalize a search term to an RxNorm concept. Returns null when unmatched. */
export async function rxNormLookup(
  term: string,
): Promise<{ rxcui: string; name: string } | null> {
  const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(
    term,
  )}&maxEntries=5`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    approximateGroup?: { candidate?: Array<{ rxcui?: string; rank?: string }> };
  };
  const candidates = json.approximateGroup?.candidate ?? [];
  const candidate = candidates.find((c) => c.rank === "1" && c.rxcui) ?? candidates[0];
  if (!candidate?.rxcui) return null;

  const propRes = await fetch(
    `https://rxnav.nlm.nih.gov/REST/rxcui/${candidate.rxcui}/property.json?propName=RxNorm%20Name`,
    { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) },
  );
  let name = term.trim();
  if (propRes.ok) {
    const prop = (await propRes.json()) as {
      propConceptGroup?: { propConcept?: Array<{ propValue?: string }> };
    };
    name = prop.propConceptGroup?.propConcept?.[0]?.propValue ?? name;
  }
  // RxNorm names can carry dose form noise: keep the leading ingredient words.
  name = name.split(/\s+\d/)[0].trim() || term.trim();
  return { rxcui: candidate.rxcui, name };
}

interface FdaLabel {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    route?: string[];
    pharm_class_epc?: string[];
    pharm_class_moa?: string[];
  };
  mechanism_of_action?: string[];
  indications_and_usage?: string[];
  pharmacokinetics?: string[];
  clinical_pharmacology?: string[];
  dosage_and_administration?: string[];
}

export async function openFdaLabel(name: string): Promise<FdaLabel | null> {
  // Strip quotes/backslashes so the value can't break out of the quoted term.
  const safe = name.replace(/["\\]/g, "").slice(0, 80);
  const q = encodeURIComponent(
    `openfda.generic_name:"${safe}" OR openfda.brand_name:"${safe}"`,
  );
  const res = await fetch(`https://api.fda.gov/drug/label.json?search=${q}&limit=1`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { results?: FdaLabel[] };
  return json.results?.[0] ?? null;
}

export interface LookupOutcome {
  status: "ok" | "not_found" | "no_data";
  slug?: string;
  message?: string;
}

/** Build an api_cache drug row from RxNorm + openFDA data. */
export function buildCachedDrugRow(
  rx: { rxcui: string; name: string },
  label: FdaLabel | null,
): TablesInsert<"drugs"> {
  const of = label?.openfda ?? {};
  const displayName =
    (of.generic_name?.[0] ?? rx.name).toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  const brand = of.brand_name?.[0] ?? null;
  const drugClass = of.pharm_class_epc?.[0]?.replace(/\s*\[EPC\]\s*$/i, "") ?? "Unclassified";
  const route = mapRoute(of.route?.[0]);
  const indication = label?.indications_and_usage?.[0]
    ? firstSentences(label.indications_and_usage[0], 2)
    : "Indication not available in structured FDA label data.";
  const moa = label?.mechanism_of_action?.[0] ?? label?.clinical_pharmacology?.[0];
  const mechanism = moa
    ? firstSentences(moa, 3)
    : `Administered ${route.toUpperCase()}; acts systemically per FDA labeling — detailed mechanism not available in structured data.`;
  const receptors = (of.pharm_class_moa ?? [])
    .slice(0, 4)
    .map((r) => r.replace(/\s*\[(MoA|EPC)\]\s*$/i, ""));

  const notes: string[] = [
    "Auto-generated from RxNorm and openFDA label data — depth and accuracy are lower than curated entries.",
  ];
  if (label?.pharmacokinetics?.[0]) {
    notes.push(firstSentences(label.pharmacokinetics[0], 2));
  }
  if (label?.dosage_and_administration?.[0]) {
    notes.push(firstSentences(label.dosage_and_administration[0], 1));
  }

  const absorptionSite = route === "oral" ? "small_intestine" : route === "inhaled" ? "lungs" : "vessels";

  return {
    slug: slugify(displayName),
    name: displayName,
    brand,
    drug_class: drugClass,
    indication,
    route,
    absorption_site: absorptionSite,
    // Unconfident target: default to systemic circulation rather than guessing.
    target_organ: "vessels",
    receptors,
    mechanism,
    metabolism_organ: "liver",
    metabolism_enzymes: ["Not specified"],
    elimination: "mixed",
    half_life_hours: 6,
    onset_minutes: route === "iv" ? 2 : 30,
    peak_minutes: route === "iv" ? 10 : 90,
    typical_dose: label?.dosage_and_administration?.[0]
      ? firstSentences(label.dosage_and_administration[0], 1)
      : "See FDA label — dosing not available in structured data.",
    clinical_notes: notes,
    source_url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(displayName)}`,
    source: "api_cache",
  };
}
