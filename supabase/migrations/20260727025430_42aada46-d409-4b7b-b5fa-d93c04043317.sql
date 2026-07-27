REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.drugs FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.drugs FROM authenticated;
GRANT SELECT ON public.drugs TO anon;
GRANT SELECT ON public.drugs TO authenticated;
GRANT ALL ON public.drugs TO service_role;