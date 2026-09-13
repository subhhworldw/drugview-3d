// Drug catalog is stored in the backend database (public.drugs table).
// This module exposes the shared Drug type plus fetch helpers.
// The 3D scene, info panel, and timeline components consume the Drug interface unchanged.
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Route = "oral" | "iv" | "im" | "inhaled" | "topical" | "sublingual" | "subcutaneous";
export type Organ =
  | "brain"
  | "heart"
  | "lungs"
  | "liver"
  | "kidney"
  | "stomach"
  | "small_intestine"
  | "joints"
  | "vessels"
  | "pancreas"
  | "thyroid"
  | "skin"
  | "bone"
  | "bone_marrow"
  | "muscle"
  | "lymph_node";
export type Elimination = "renal" | "hepatic" | "biliary" | "mixed" | "pulmonary";

export interface Drug {
  slug: string;
  name: string;
  brand?: string;
  drugClass: string;
  indication: string;
  route: Route;
  absorptionSite: Organ;
  targetOrgan: Organ;
  receptors: string[];
  mechanism: string;
  /** organ is null when the label never states where the drug is metabolized */
  metabolism: { organ: Organ | null; enzymes: string[] };
  /** null when the FDA label doesn't describe an excretion route */
  elimination: Elimination | null;
  /** null when no half-life is stated in the structured label data */
  halfLifeHours: number | null;
  onsetMinutes: number;
  peakMinutes: number;
  typicalDose: string;
  clinicalNotes: string[];
  sourceUrl?: string;
  source: DrugSource;
}

/** Shown wherever a PK value genuinely isn't in the source data. */
export const NOT_AVAILABLE = "Not available in structured data";


export type DrugSource = "curated" | "api_cache";

/** True when the row came from FDA data with an unconfident organ target. */
export function isGenericTarget(drug: Drug): boolean {
  return drug.source === "api_cache" && drug.targetOrgan === "vessels";
}

type DrugRow = Tables<"drugs">;

// The catalog is public by policy. Keep a publishable fallback so standalone
// hosts such as Vercel can read it even when their build-time variables were
// not configured. This key cannot bypass row-level security.
const PUBLIC_CATALOG_URL = "https://ntjhpbnzyaxttkkpakqc.supabase.co";
const PUBLIC_CATALOG_KEY = "sb_publishable_OasABkTxwmWT-q5S5UTR1g_NieriRzp";

async function fetchPublicRows(query: string): Promise<DrugRow[]> {
  const response = await fetch(`${PUBLIC_CATALOG_URL}/rest/v1/drugs?${query}`, {
    headers: {
      apikey: PUBLIC_CATALOG_KEY,
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
  return (await response.json()) as DrugRow[];
}

/** Row shape shared by stored rows and ephemeral live-lookup results. */
export type DrugRowLike = Omit<DrugRow, "id" | "created_at" | "updated_at"> & {
  source?: string | null;
  source_url?: string | null;
  brand?: string | null;
};

export function rowToDrug(r: DrugRowLike): Drug {

  return {
    slug: r.slug,
    name: r.name,
    brand: r.brand ?? undefined,
    drugClass: r.drug_class,
    indication: r.indication,
    route: r.route as Route,
    absorptionSite: r.absorption_site as Organ,
    targetOrgan: r.target_organ as Organ,
    receptors: r.receptors,
    mechanism: r.mechanism,
    metabolism: {
      organ: (r.metabolism_organ as Organ | null) ?? null,
      enzymes: r.metabolism_enzymes ?? [],
    },
    elimination: (r.elimination as Elimination | null) ?? null,
    halfLifeHours: r.half_life_hours === null ? null : Number(r.half_life_hours),

    onsetMinutes: r.onset_minutes,
    peakMinutes: r.peak_minutes,
    typicalDose: r.typical_dose,
    clinicalNotes: r.clinical_notes,
    sourceUrl: r.source_url ?? undefined,
    source: (r.source === "api_cache" ? "api_cache" : "curated") as DrugSource,
  };
}

export async function fetchAllDrugs(): Promise<Drug[]> {
  try {
    const { data, error } = await supabase
      .from("drugs")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(rowToDrug);
  } catch {
    const rows = await fetchPublicRows("select=*&order=name.asc");
    return rows.map(rowToDrug);
  }
}

export async function fetchDrugBySlug(slug: string): Promise<Drug | null> {
  try {
    const { data, error } = await supabase
      .from("drugs")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToDrug(data) : null;
  } catch {
    const rows = await fetchPublicRows(
      `select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    );
    return rows[0] ? rowToDrug(rows[0]) : null;
  }
}

export function uniqueDrugClasses(drugs: Drug[]): string[] {
  return Array.from(new Set(drugs.map((d) => d.drugClass))).sort();
}

export function filterDrugs(drugs: Drug[], q: string): Drug[] {
  const query = q.trim().toLowerCase();
  if (!query) return drugs;
  return drugs.filter(
    (d) =>
      d.name.toLowerCase().includes(query) ||
      d.brand?.toLowerCase().includes(query) ||
      d.drugClass.toLowerCase().includes(query) ||
      d.indication.toLowerCase().includes(query),
  );
}
