ALTER TABLE public.drugs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'curated';

ALTER TABLE public.drugs
  ADD CONSTRAINT drugs_source_check CHECK (source IN ('curated','api_cache'));

UPDATE public.drugs SET source = 'curated' WHERE source IS DISTINCT FROM 'curated';

CREATE INDEX IF NOT EXISTS drugs_source_idx ON public.drugs (source);