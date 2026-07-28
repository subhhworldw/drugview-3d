// Server-only bulk-seed engine shared by the scheduled job.
// Uses the service-role client, so it must never be imported from client code.
import { rxNormLookup, openFdaLabel, buildCachedDrugRow, slugify, medlinePlusUrl } from "./drug-lookup.server";
import { SEED_CANDIDATE_NAMES } from "./seed-pool.server";

export interface SeedResult {
  attempted: number;
  added: number;
  skipped: number;
  failed: number;
  addedSlugs: string[];
  failures: Array<{ name: string; reason: string }>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolve up to `limit` new candidate names and persist them as source='api_cache'. */
export async function runSeedBatch(limit = 60): Promise<SeedResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const cap = Math.min(Math.max(limit, 1), 75);
  const result: SeedResult = {
    attempted: 0,
    added: 0,
    skipped: 0,
    failed: 0,
    addedSlugs: [],
    failures: [],
  };

  const { data: rows, error } = await supabaseAdmin.from("drugs").select("slug");
  if (error) throw error;
  const existing = new Set((rows ?? []).map((r) => r.slug));

  const candidates = SEED_CANDIDATE_NAMES.filter((n) => !existing.has(slugify(n)));

  for (const name of candidates) {
    if (result.added >= cap) break;
    result.attempted += 1;
    try {
      const rx = await rxNormLookup(name);
      if (!rx) {
        result.failed += 1;
        result.failures.push({ name, reason: "rxnorm_miss" });
        continue;
      }
      if (existing.has(slugify(rx.name))) {
        result.skipped += 1;
        continue;
      }
      const label = await openFdaLabel(rx.name);
      if (!label) {
        result.failed += 1;
        result.failures.push({ name, reason: "no_fda_label" });
        continue;
      }
      const row = buildCachedDrugRow(rx, label);
      if (existing.has(row.slug)) {
        result.skipped += 1;
        continue;
      }
      const mp = await medlinePlusUrl(rx.rxcui);
      if (mp) row.source_url = mp;

      const { error: insErr } = await supabaseAdmin
        .from("drugs")
        .upsert(row, { onConflict: "slug", ignoreDuplicates: true });
      if (insErr) {
        result.failed += 1;
        result.failures.push({ name, reason: `insert_error: ${insErr.message}` });
        continue;
      }
      existing.add(row.slug);
      result.added += 1;
      result.addedSlugs.push(row.slug);
    } catch (e) {
      result.failed += 1;
      result.failures.push({ name, reason: `error: ${(e as Error).message}` });
    }
    // Be polite to RxNorm / openFDA.
    await sleep(300);
  }

  return result;
}

/** Run a batch and record the outcome in seed_runs. */
export async function runSeedBatchLogged(limit: number, kind: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: run } = await supabaseAdmin
    .from("seed_runs")
    .insert({ kind })
    .select("id")
    .single();

  try {
    const res = await runSeedBatch(limit);
    if (run?.id) {
      await supabaseAdmin
        .from("seed_runs")
        .update({
          finished_at: new Date().toISOString(),
          attempted: res.attempted,
          added: res.added,
          skipped: res.skipped,
          failed: res.failed,
          notes: JSON.stringify({
            added: res.addedSlugs.slice(0, 100),
            failures: res.failures.slice(0, 50),
          }).slice(0, 8000),
        })
        .eq("id", run.id);
    }
    return res;
  } catch (e) {
    if (run?.id) {
      await supabaseAdmin
        .from("seed_runs")
        .update({
          finished_at: new Date().toISOString(),
          notes: `fatal: ${(e as Error).message}`.slice(0, 2000),
        })
        .eq("id", run.id);
    }
    throw e;
  }
}
