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
  metabolism: { organ: Organ; enzymes: string[] };
  elimination: Elimination;
  halfLifeHours: number;
  onsetMinutes: number;
  peakMinutes: number;
  typicalDose: string;
  clinicalNotes: string[];
  sourceUrl?: string;
  source: DrugSource;
}

export type DrugSource = "curated" | "api_cache";

/** True when the row came from FDA data with an unconfident organ target. */
export function isGenericTarget(drug: Drug): boolean {
  return drug.source === "api_cache" && drug.targetOrgan === "vessels";
}

type DrugRow = Tables<"drugs">;

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
      organ: r.metabolism_organ as Organ,
      enzymes: r.metabolism_enzymes,
    },
    elimination: r.elimination as Elimination,
    halfLifeHours: Number(r.half_life_hours),
    onsetMinutes: r.onset_minutes,
    peakMinutes: r.peak_minutes,
    typicalDose: r.typical_dose,
    clinicalNotes: r.clinical_notes,
    sourceUrl: r.source_url ?? undefined,
    source: (r.source === "api_cache" ? "api_cache" : "curated") as DrugSource,
  };
}

export async function fetchAllDrugs(): Promise<Drug[]> {
  const { data, error } = await supabase
    .from("drugs")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToDrug);
}

export async function fetchDrugBySlug(slug: string): Promise<Drug | null> {
  const { data, error } = await supabase
    .from("drugs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToDrug(data) : null;
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
