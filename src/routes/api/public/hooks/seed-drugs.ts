import { createFileRoute } from "@tanstack/react-router";

// Scheduled catalog-growth endpoint, called weekly by pg_cron via pg_net.
// Public prefix (no site auth), so the handler authenticates the caller itself
// with the project's publishable key and does its own input validation.
export const Route = createFileRoute("/api/public/hooks/seed-drugs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        const provided =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!expected || provided !== expected) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let limit = 50;
        try {
          const body = (await request.json()) as { limit?: unknown };
          if (typeof body?.limit === "number" && Number.isFinite(body.limit)) {
            limit = Math.min(Math.max(Math.floor(body.limit), 1), 75);
          }
        } catch {
          // no/invalid body — use the default
        }

        const { runSeedBatchLogged } = await import("@/lib/drug-seed.server");
        try {
          const res = await runSeedBatchLogged(limit, "cron");
          return Response.json({
            ok: true,
            attempted: res.attempted,
            added: res.added,
            skipped: res.skipped,
            failed: res.failed,
          });
        } catch (e) {
          console.error("[seed-drugs] batch failed", e);
          return Response.json({ ok: false, error: "Seed batch failed" }, { status: 500 });
        }
      },
    },
  },
});
