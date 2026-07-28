// Thin server-fn wrapper — all runtime logic lives in drug-lookup.server.ts.
//
// SECURITY MODEL: this endpoint is public (any anonymous visitor can call it).
// It may persist a drug row, but ONLY data it fetched itself from RxNorm and
// openFDA. The caller-supplied term is used solely as a query parameter to
// those trusted APIs — it is never stored as freeform content, so a caller
// cannot inject arbitrary rows or field values. Writes go through the
// service-role client on the server (never exposed to the browser) and are
// rate limited per IP. Everything else in the app stays read-only.
import { createServerFn } from "@tanstack/react-start";

const MAX_CACHE_WRITES_PER_IP_PER_HOUR = 20;

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

    const { rxNormLookup, openFdaLabel, buildCachedDrugRow, slugify, medlinePlusUrl } =
      await import("./drug-lookup.server");
    const { createClient } = await import("@supabase/supabase-js");
    const { getRequest, getRequestHeader } = await import("@tanstack/react-start/server");
    const { createHash } = await import("crypto");
    type Db = import("@/integrations/supabase/types").Database;

    const rx = await rxNormLookup(term);
    if (!rx) {
      return {
        status: "not_found" as const,
        message: `No drug named “${term}” found in the RxNorm vocabulary.`,
      };
    }

    // Public read — publishable key, RLS applies as anon.
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

    // Already in the catalog (curated or previously cached)? Point at that page.
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

    // Row is built exclusively from RxNorm + openFDA payloads.
    const row = buildCachedDrugRow(rx, label);
    const mp = await medlinePlusUrl(rx.rxcui);
    if (mp) row.source_url = mp;

    // ---- Organic caching, rate limited per IP -------------------------------
    try {
      let ip = "unknown";
      try {
        ip =
          getRequestHeader("cf-connecting-ip") ??
          getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
          getRequest().headers.get("x-real-ip") ??
          "unknown";
      } catch {
        /* request context unavailable (e.g. prerender) — fall through */
      }
      const ipHash = createHash("sha256")
        .update(`${ip}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "salt"}`)
        .digest("hex");

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from("lookup_cache_writes")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since);

      if ((count ?? 0) < MAX_CACHE_WRITES_PER_IP_PER_HOUR) {
        const { error: insErr } = await supabaseAdmin
          .from("drugs")
          .upsert(row, { onConflict: "slug", ignoreDuplicates: true });
        if (!insErr) {
          await supabaseAdmin
            .from("lookup_cache_writes")
            .insert({ ip_hash: ipHash, slug: row.slug });
          return { status: "ok" as const, slug: row.slug, cached: true as const };
        }
        console.error("[lookup-drug] cache write failed", insErr.message);
      }
    } catch (e) {
      // Caching is best-effort: never fail the user's lookup because of it.
      console.error("[lookup-drug] cache step error", (e as Error).message);
    }

    // Fallback: ephemeral result rendered live, nothing persisted.
    return { status: "ok" as const, live: true as const, drug: row };
  });
