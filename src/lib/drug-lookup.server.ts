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
  // openFDA does not reliably split these out — labels usually nest
  // Absorption/Distribution/Metabolism/Excretion inside `pharmacokinetics`.
  // They're declared anyway because a minority of SPLs do emit them.
  metabolism?: string[];
  excretion?: string[];
  description?: string[];
}

/* ------------------------------------------------------------------ */
/* ADMET extraction from free-text FDA label sections                  */
/* ------------------------------------------------------------------ */

export interface PkFacts {
  halfLifeHours: number | null;
  elimination: "renal" | "hepatic" | "biliary" | "mixed" | "pulmonary" | null;
  enzymes: string[];
  metabolismOrgan: "liver" | null;
}

/** Concatenated PK-relevant label text, normalized to single spaces. */
function pkText(label: FdaLabel | null): string {
  if (!label) return "";
  return [
    label.pharmacokinetics?.[0],
    label.clinical_pharmacology?.[0],
    label.metabolism?.[0],
    label.excretion?.[0],
  ]
    .filter(Boolean)
    .join("\n\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ");
}

const UNIT_TO_HOURS: Record<string, number> = {
  hour: 1,
  hours: 1,
  hr: 1,
  hrs: 1,
  h: 1,
  minute: 1 / 60,
  minutes: 1 / 60,
  min: 1 / 60,
  mins: 1 / 60,
  day: 24,
  days: 24,
  week: 168,
  weeks: 168,
};

/**
 * Pull a terminal/elimination half-life out of label prose.
 * Handles "half-life of approximately 14 hours", "half-life is 2 to 4 hours",
 * "half-life (t1/2) of 30 min", "t1/2 = 6.5 h", and en-dash ranges.
 */
export function extractHalfLifeHours(text: string): number | null {
  if (!text) return null;
  const unit = "(hours?|hrs?|h|minutes?|mins?|days?|weeks?)";
  const num = "(\\d+(?:[.,]\\d+)?)";
  // Up to ~120 chars of qualifiers ("of approximately", "in healthy adults is")
  // may sit between the phrase and the number, but never a sentence boundary.
  const gap = "[^.;\\n]{0,120}?";
  const patterns = [
    // range: "half-life of 20 to 30 hours" / "20-30 hours"
    new RegExp(
      `(?:half[-\\s]?life|t\\s?1?\\s?/\\s?2|t½)${gap}${num}\\s*(?:to|-|–|—|and)\\s*${num}\\s*${unit}\\b`,
      "i",
    ),
    // single value: "half-life of approximately 14 hours"
    new RegExp(`(?:half[-\\s]?life|t\\s?1?\\s?/\\s?2|t½)${gap}${num}\\s*${unit}\\b`, "i"),
  ];

  // Flattened label tables put the unit in the row header and the value after
  // it: "Half-life, hours [Mean (CV%)] 14.7 (33)". Handled separately because
  // here the unit precedes the number.
  const tableRe = new RegExp(
    `(?:half[-\\s]?life|t\\s?1?\\s?/\\s?2|t½)\\s*[,(\\[]?\\s*${unit}\\b[^.;\\n]{0,60}?${num}`,
    "i",
  );


  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const isRange = m.length === 5;
    const lo = parseFloat(m[1].replace(",", "."));
    const hi = isRange ? parseFloat(m[2].replace(",", ".")) : lo;
    const factor = UNIT_TO_HOURS[(isRange ? m[3] : m[2]).toLowerCase()];
    if (!factor || !isFinite(lo) || !isFinite(hi)) continue;
    // midpoint of a stated range, otherwise the stated value
    const hours = ((lo + hi) / 2) * factor;
    // sanity window: sub-second or multi-year values are parse noise
    if (hours <= 0 || hours > 24 * 365) continue;
    return Math.round(hours * 100) / 100;
  }

  const tm = text.match(tableRe);
  if (tm) {
    const factor = UNIT_TO_HOURS[tm[1].toLowerCase()];
    const value = parseFloat(tm[2].replace(",", "."));
    if (factor && isFinite(value)) {
      const hours = value * factor;
      if (hours > 0 && hours <= 24 * 365) return Math.round(hours * 100) / 100;
    }
  }
  return null;
}

/**
 * Recovered percentages per excretion route, e.g. "Feces 34% ... Urine 0.02%".
 * Labels state these as tables, where keyword counting is meaningless.
 */
function excretionPercents(scope: string): { renal: number; fecal: number } | null {
  let renal = 0;
  let fecal = 0;
  const route = "(urine|urinary|feces|faeces|fecal|faecal|bile|biliary)";
  const pctNum = "(\\d+(?:\\.\\d+)?)\\s*%";
  const add = (word: string, raw: string) => {
    const pct = parseFloat(raw);
    if (!isFinite(pct) || pct > 100) return;
    if (/^u/i.test(word)) renal = Math.max(renal, pct);
    else fecal = Math.max(fecal, pct);
  };
  // "Feces 34%" (table form) and "86% ... recovered in feces" (prose form)
  for (const m of scope.matchAll(new RegExp(`\\b${route}\\b[^.;\\n%]{0,40}?${pctNum}`, "gi"))) {
    add(m[1], m[2]);
  }
  for (const m of scope.matchAll(new RegExp(`${pctNum}[^.;\\n%]{0,60}?\\b${route}\\b`, "gi"))) {
    add(m[2], m[1]);
  }
  return renal || fecal ? { renal, fecal } : null;
}



/** Narrow the text to the Excretion/Elimination subsection when the label has one. */
function excretionScope(text: string): string {
  // Prefer an explicit "Excretion" heading; "Elimination" often appears first
  // as a table row label with no route information under it.
  const m =
    text.match(/\bExcretion\b([\s\S]{0,2500})/i) ??
    text.match(/\bElimination\b([\s\S]{0,2500})/i);
  return m ? m[1] : text;

}

/**
 * Classify the dominant excretion route. Returns null when the label never
 * says — we do not guess.
 */
export function extractElimination(text: string): PkFacts["elimination"] {
  if (!text) return null;
  const scope = excretionScope(text);
  const count = (re: RegExp) => (scope.match(re) ?? []).length;

  const renal = count(/\b(urine|urinary|renal(?:ly)?\s+(?:excret|elimin|clear)\w*|kidneys?)\b/gi);
  const fecal = count(/\b(feces|faeces|fecal|faecal|bile|biliary|hepatobiliary)\b/gi);
  const pulmonary = count(/\b(exhaled|expired air|pulmonary excretion|via the lungs)\b/gi);

  if (pulmonary > 0 && pulmonary >= renal && pulmonary >= fecal) return "pulmonary";

  // Stated recovery percentages beat keyword frequency when the label has them.
  const pct = excretionPercents(scope);
  if (pct) {
    const { renal: r, fecal: f } = pct;
    if (r && f) {
      const hi = Math.max(r, f);
      const lo = Math.min(r, f);
      if (lo / hi >= 0.34) return "mixed";
      return r > f ? "renal" : "biliary";
    }
    if (r) return "renal";
    if (f) return "biliary";
  }

  if (renal === 0 && fecal === 0) return null;

  if (renal > 0 && fecal > 0) {
    const ratio = Math.min(renal, fecal) / Math.max(renal, fecal);
    // both routes described with comparable emphasis → genuinely mixed
    if (ratio >= 0.34) return "mixed";
  }
  return renal > fecal ? "renal" : "biliary";
}

/** CYP / UGT / other named metabolizing enzymes mentioned in the label. */
export function extractEnzymes(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  for (const m of text.matchAll(/\bCYP\s?-?\s?([1-9][A-Z]{1,2}\d{0,2})\b/gi)) {
    out.add(`CYP${m[1].toUpperCase()}`);
  }
  for (const m of text.matchAll(/\bUGT\s?([1-2][AB]\d{1,2})\b/gi)) {
    out.add(`UGT${m[1].toUpperCase()}`);
  }
  for (const [re, name] of [
    [/\bP-?glycoprotein\b|\bP-?gp\b/i, "P-gp"],
    [/\bmonoamine oxidase\b|\bMAO-[AB]\b/i, "MAO"],
    [/\bxanthine oxidase\b/i, "Xanthine oxidase"],
    [/\bcarboxylesterase\b/i, "Carboxylesterase"],
    [/\bcatechol-O-methyltransferase\b|\bCOMT\b/i, "COMT"],
    [/\balcohol dehydrogenase\b/i, "Alcohol dehydrogenase"],
    [/\bthiopurine methyltransferase\b|\bTPMT\b/i, "TPMT"],
  ] as Array<[RegExp, string]>) {
    if (re.test(text)) out.add(name);
  }
  return Array.from(out).slice(0, 8);
}

/** Only claim hepatic metabolism when the label actually describes it. */
export function extractMetabolismOrgan(text: string, enzymes: string[]): "liver" | null {
  if (enzymes.some((e) => e.startsWith("CYP") || e.startsWith("UGT"))) return "liver";
  if (!text) return null;
  return /\b(hepatic(?:ally)?\s+metaboli|metaboli\w+\s+(?:in|by)\s+the\s+liver|hepatocytes?|first-?pass\s+metabolism|hepatic\s+microsom)/i.test(
    text,
  )
    ? "liver"
    : null;
}

/** Full ADMET fact extraction for one FDA label. */
export function extractPkFacts(label: FdaLabel | null): PkFacts {
  const text = pkText(label);
  const enzymes = extractEnzymes(text);
  return {
    halfLifeHours: extractHalfLifeHours(text),
    elimination: extractElimination(text),
    enzymes,
    metabolismOrgan: extractMetabolismOrgan(text, enzymes),
  };
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

  // Real per-drug ADMET, parsed from the label. Anything the label doesn't
  // state stays null/empty — we never substitute a plausible-looking default.
  const pk = extractPkFacts(label);

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
    metabolism_organ: pk.metabolismOrgan,
    metabolism_enzymes: pk.enzymes,
    elimination: pk.elimination,
    half_life_hours: pk.halfLifeHours,

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

/** Verified consumer-drug reference URL from MedlinePlus Connect (by RXCUI). Null when unavailable. */
export async function medlinePlusUrl(rxcui: string): Promise<string | null> {
  try {
    const url =
      "https://connect.medlineplus.gov/service?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88" +
      `&mainSearchCriteria.v.c=${encodeURIComponent(rxcui)}&knowledgeResponseType=application/json`;
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      feed?: { entry?: Array<{ link?: Array<{ href?: string; url?: string }> }> };
    };
    for (const entry of json.feed?.entry ?? []) {
      for (const link of entry.link ?? []) {
        const href = link.href ?? link.url;
        if (href && href.includes("medlineplus.gov")) return href;
      }
    }
  } catch {
    return null;
  }
  return null;
}
