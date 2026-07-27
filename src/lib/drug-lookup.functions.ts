// Thin server-fn wrapper — all runtime logic lives in drug-lookup.server.ts.
import { createServerFn } from "@tanstack/react-start";

export const lookupDrug = createServerFn({ method: "POST" })
  .inputValidator((data: { term: string }) => ({
    term: String(data?.term ?? "").slice(0, 80),
  }))
  .handler(async ({ data }) => {
    const term = data.term.trim();
    if (term.length < 3) {
      return { status: "not_found" as const, message: "Search term too short." };
    }

    const { rxNormLookup, openFdaLabel, buildCachedDrugRow, slugify } = await import(
      "./drug-lookup.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rx = await rxNormLookup(term);
    if (!rx) {
      return {
        status: "not_found" as const,
        message: `No drug named “${term}” found in the RxNorm vocabulary.`,
      };
    }

    // Cache hit? Never overwrite curated rows.
    const existing = await supabaseAdmin
      .from("drugs")
      .select("slug")
      .eq("slug", slugify(rx.name))
      .maybeSingle();
    if (existing.data) {
      return { status: "ok" as const, slug: existing.data.slug };
    }

    const label = await openFdaLabel(rx.name);
    if (!label) {
      return {
        status: "no_data" as const,
        message: `“${rx.name}” exists in RxNorm, but no structured FDA label data is available for it.`,
      };
    }

    const row = buildCachedDrugRow(rx, label);
    const { error } = await supabaseAdmin
      .from("drugs")
      .upsert(row, { onConflict: "slug", ignoreDuplicates: true });
    if (error) {
      return { status: "no_data" as const, message: "Could not save the looked-up drug." };
    }

    return { status: "ok" as const, slug: row.slug };
  });
