CREATE TABLE public.seed_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'cron',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  attempted integer NOT NULL DEFAULT 0,
  added integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.seed_runs TO service_role;
ALTER TABLE public.seed_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seed_runs service only" ON public.seed_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_seed_runs_updated_at
BEFORE UPDATE ON public.seed_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lookup_cache_writes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.lookup_cache_writes TO service_role;
ALTER TABLE public.lookup_cache_writes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lookup_cache_writes service only" ON public.lookup_cache_writes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX lookup_cache_writes_ip_time_idx ON public.lookup_cache_writes (ip_hash, created_at DESC);