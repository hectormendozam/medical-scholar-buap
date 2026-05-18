-- ============================================================
-- Fix: políticas RLS faltantes en case_resolutions
-- (resoluciones no existe — solo se usa case_resolutions)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE public.case_resolutions ENABLE ROW LEVEL SECURITY;

-- SELECT: todos los autenticados pueden leer (el instructor necesita ver las de sus estudiantes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'case_resolutions' AND policyname = 'case_resolutions_select'
  ) THEN
    CREATE POLICY "case_resolutions_select"
      ON public.case_resolutions FOR SELECT USING (true);
  END IF;
END $$;

-- INSERT: solo el propio estudiante puede crear su resolución
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'case_resolutions' AND policyname = 'case_resolutions_insert_own'
  ) THEN
    CREATE POLICY "case_resolutions_insert_own"
      ON public.case_resolutions FOR INSERT
      WITH CHECK (resolved_by = auth.uid());
  END IF;
END $$;

-- UPDATE: solo el propio estudiante puede editar su resolución
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'case_resolutions' AND policyname = 'case_resolutions_update_own'
  ) THEN
    CREATE POLICY "case_resolutions_update_own"
      ON public.case_resolutions FOR UPDATE
      USING     (resolved_by = auth.uid())
      WITH CHECK (resolved_by = auth.uid());
  END IF;
END $$;

-- DELETE: solo el propio estudiante puede borrar (fallback cuando UPDATE es bloqueado)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'case_resolutions' AND policyname = 'case_resolutions_delete_own'
  ) THEN
    CREATE POLICY "case_resolutions_delete_own"
      ON public.case_resolutions FOR DELETE
      USING (resolved_by = auth.uid());
  END IF;
END $$;
