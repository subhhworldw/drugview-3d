ALTER TABLE public.drugs
  ALTER COLUMN half_life_hours DROP NOT NULL,
  ALTER COLUMN metabolism_organ DROP NOT NULL,
  ALTER COLUMN elimination DROP NOT NULL;