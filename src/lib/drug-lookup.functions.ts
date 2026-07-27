// Thin server-fn wrapper — all runtime logic lives in drug-lookup.server.ts.
//
// SECURITY: this endpoint is public (any anonymous visitor can call it), so it
// is strictly READ-ONLY. It never writes to the drugs table. Live RxNorm/openFDA
// results are returned to the caller for ephemeral rendering only; persisting a
// new drug row is a trusted/curated operation done outside this path.
import { createServerFn } from "@tanstack/react-start";

export const lookupDrug = createServerFn({ method: "POST" })
  .inputValidator((data: { term: string }) => ({
    // Whitelist: drug names only — letters, digits, space, - . / + ( ).
    // Blocks quotes/braces that could alter the downstream openFDA query string.
    term: String(data?.term ?? "")
      .slice(0, 80)
      .replace(/[^A-Za-z0-9 .\-/+()]/g, " ")
      .replace(/\s+/g, " "),
  }))
  .handler(async ({ data }) => {
    const term = data.term.trim();
    if (term.length < 3) {
      return { status: "not_found" as const, message: "Search term too short." };
    }

    const { rxNormLookup, openFdaLabel, buildCachedDrugRow, slugify } = await import(
      "./drug-lookup.server"
    );
    const { createClient } = await import("@supabase/supabase-js");
    type Db = import("@/integrations/supabase/types").Database;

    const rx = await rxNormLookup(term);
    if (!rx) {
      return {
        status: "not_found" as const,
        message: `No drug named “${term}” found in the RxNorm vocabulary.`,
      };
    }

    // Already in the catalog (curated or previously cached)? Point at that page.
    // Public read only — publishable key, RLS applies as anon.
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabasePublic = createClient<Db>(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const existing = await supabasePublic
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

    // Ephemeral result: returned to the caller, never persisted.
    const row = buildCachedDrugRow(rx, label);
    return { status: "ok" as const, live: true as const, drug: row };
  });
