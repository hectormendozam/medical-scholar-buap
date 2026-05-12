-- Allow teachers to SELECT resolutions from case_resolutions
-- (the students_insert policy was added in rls_resolutions.sql,
--  but SELECT for the teacher role was missing).
-- Run this in Supabase SQL Editor.

DO $body$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'case_resolutions'
  ) THEN
    EXECUTE 'ALTER TABLE public.case_resolutions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_read_case_resolutions" ON public.case_resolutions';
    EXECUTE 'CREATE POLICY "authenticated_read_case_resolutions" ON public.case_resolutions FOR SELECT TO authenticated USING (true)';
  END IF;
END;
$body$;

DO $body$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'resoluciones'
  ) THEN
    EXECUTE 'ALTER TABLE public.resoluciones ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_read_resoluciones" ON public.resoluciones';
    EXECUTE 'CREATE POLICY "authenticated_read_resoluciones" ON public.resoluciones FOR SELECT TO authenticated USING (true)';
  END IF;
END;
$body$;
