-- Migration: Add RLS SELECT policies so authenticated users can read clinical cases.
-- Without these policies, students see "Caso no encontrado" even when the record exists.
-- Run this in Supabase SQL Editor as project owner.
--
-- NOTE: Only targets "clinical_cases". The app falls back to this table when
-- "casos_clinicos" does not exist (which is the case in this project).

BEGIN;

-- ── casos_clinicos (skip gracefully if not present) ───────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'casos_clinicos'
  ) THEN
    EXECUTE 'ALTER TABLE public.casos_clinicos ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_read_casos_clinicos" ON public.casos_clinicos';
    EXECUTE $pol$
      CREATE POLICY "authenticated_read_casos_clinicos"
        ON public.casos_clinicos FOR SELECT TO authenticated USING (true)
    $pol$;
  END IF;
END;
$$;

-- ── clinical_cases ────────────────────────────────────────────────────────────
ALTER TABLE public.clinical_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_clinical_cases" ON public.clinical_cases;
DROP POLICY IF EXISTS "teachers_write_clinical_cases"     ON public.clinical_cases;

-- All authenticated users can read cases
CREATE POLICY "authenticated_read_clinical_cases"
  ON public.clinical_cases
  FOR SELECT
  TO authenticated
  USING (true);

-- Teachers / instructors can insert, update, delete
DO $$
DECLARE
  has_role_text boolean;
  has_role_id   boolean;
  teacher_check text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) INTO has_role_text;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role_id'
  ) INTO has_role_id;

  IF has_role_text AND has_role_id THEN
    teacher_check := $cond$EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('teacher','instructor') OR profiles.role_id = 2))$cond$;
  ELSIF has_role_id THEN
    teacher_check := $cond$EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role_id = 2)$cond$;
  ELSE
    teacher_check := $cond$EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('teacher','instructor'))$cond$;
  END IF;

  EXECUTE format(
    'CREATE POLICY "teachers_write_clinical_cases" ON public.clinical_cases FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
    teacher_check, teacher_check
  );
END;
$$;

COMMIT;
