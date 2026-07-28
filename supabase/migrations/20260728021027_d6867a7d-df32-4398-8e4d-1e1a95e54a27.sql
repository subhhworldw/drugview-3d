CREATE TABLE public.drug_pk_backfill (
  drug_id uuid PRIMARY KEY,
  half_life_hours numeric,
  metabolism_organ text,
  elimination text,
  metabolism_enzymes text[] NOT NULL DEFAULT '{}'::text[]
);
GRANT ALL ON public.drug_pk_backfill TO service_role;
ALTER TABLE public.drug_pk_backfill ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drug_pk_backfill service only" ON public.drug_pk_backfill
  FOR ALL TO service_role USING (true) WITH CHECK (true);