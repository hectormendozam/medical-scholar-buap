-- Migration: Add RLS policies so students can INSERT resolutions
-- and teachers can SELECT/UPDATE all resolutions.
-- Run this in Supabase SQL Editor as project owner.

BEGIN;

-- ── case_resolutions (english table) ─────────────────────────────────────────
DO $body$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'case_resolutions'
  ) THEN
    EXECUTE 'ALTER TABLE public.case_resolutions ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "students_insert_case_resolutions" ON public.case_resolutions';
    EXECUTE 'DROP POLICY IF EXISTS "owner_select_case_resolutions" ON public.case_resolutions';
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_read_case_resolutions" ON public.case_resolutions';

    EXECUTE 'CREATE POLICY "students_insert_case_resolutions" ON public.case_resolutions FOR INSERT TO authenticated WITH CHECK (resolved_by = auth.uid())';

    EXECUTE 'CREATE POLICY "authenticated_read_case_resolutions" ON public.case_resolutions FOR SELECT TO authenticated USING (true)';
  END IF;
END;
$body$;

-- ── resoluciones (spanish table) ──────────────────────────────────────────────
DO $body$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'resoluciones'
  ) THEN
    EXECUTE 'ALTER TABLE public.resoluciones ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "students_insert_resoluciones" ON public.resoluciones';
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_read_resoluciones" ON public.resoluciones';

    EXECUTE 'CREATE POLICY "students_insert_resoluciones" ON public.resoluciones FOR INSERT TO authenticated WITH CHECK (estudiante_id = auth.uid())';

    EXECUTE 'CREATE POLICY "authenticated_read_resoluciones" ON public.resoluciones FOR SELECT TO authenticated USING (true)';
  END IF;
END;
$body$;

COMMIT;
