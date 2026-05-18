-- =============================================================================
-- MEDICAL SCHOLAR BUAP — Setup Completo (Safe / Idempotente)
-- Fecha: 2026-05-14
--
-- Incluye TODO lo implementado en esta sesión:
--   ✅ Tablas nuevas: course_members, case_files, rubrics, rubric_criteria
--   ✅ Columna evaluaciones.rubric_id
--   ✅ RLS para todas las tablas (existentes + nuevas)
--   ✅ Fix: profiles_select policy (USING true) → permite buscar por email
--   ✅ Fix: sync profiles.email desde auth.users (usuarios registrados antes del trigger)
--   ✅ Fix: trigger handle_new_user con ON CONFLICT para nuevos registros
--
-- ⚠️  Es seguro correr múltiples veces (IF NOT EXISTS, DROP POLICY IF EXISTS, etc.)
-- Ejecutar completo en Supabase SQL Editor → botón "Run"
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. TABLAS NUEVAS
-- =============================================================================

-- 1a. COURSE_MEMBERS — alumnos inscritos a un grupo/curso
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_members (
  id        BIGSERIAL PRIMARY KEY,
  course_id bigint NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id   uuid   NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_course_members_course ON public.course_members(course_id);
CREATE INDEX IF NOT EXISTS idx_course_members_user   ON public.course_members(user_id);

-- 1b. CASE_FILES — archivos adjuntos a un caso clínico (subidos por el docente)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.case_files (
  id          BIGSERIAL PRIMARY KEY,
  case_id     bigint NOT NULL REFERENCES public.clinical_cases(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.profiles(id),
  file_name   text NOT NULL,
  file_url    text NOT NULL,
  file_type   text CHECK (file_type = ANY (ARRAY['pdf','imagen','otro'])),
  mime        text,
  size        bigint,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_case_files_case ON public.case_files(case_id);

-- 1c. RUBRICS — rúbricas de evaluación por caso
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rubrics (
  id         BIGSERIAL PRIMARY KEY,
  case_id    bigint NOT NULL REFERENCES public.clinical_cases(id) ON DELETE CASCADE,
  title      text NOT NULL DEFAULT 'Rúbrica de evaluación',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1d. RUBRIC_CRITERIA — criterios de una rúbrica
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rubric_criteria (
  id          BIGSERIAL PRIMARY KEY,
  rubric_id   bigint NOT NULL REFERENCES public.rubrics(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  max_score   numeric NOT NULL CHECK (max_score > 0),
  sort_order  smallint DEFAULT 0
);

-- 1e. Columna rubric_id en evaluaciones (registra qué rúbrica se usó)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.evaluaciones
  ADD COLUMN IF NOT EXISTS rubric_id bigint REFERENCES public.rubrics(id) ON DELETE SET NULL;


-- =============================================================================
-- 2. ROW LEVEL SECURITY — Tablas nuevas
-- =============================================================================

ALTER TABLE public.course_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_files      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;

-- course_members
DROP POLICY IF EXISTS "cm_select"     ON public.course_members;
CREATE POLICY "cm_select"     ON public.course_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "cm_insert"     ON public.course_members;
CREATE POLICY "cm_insert"     ON public.course_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "cm_delete_own" ON public.course_members;
CREATE POLICY "cm_delete_own" ON public.course_members FOR DELETE USING (auth.uid() IS NOT NULL);

-- case_files
DROP POLICY IF EXISTS "cf_select"     ON public.case_files;
CREATE POLICY "cf_select"     ON public.case_files FOR SELECT USING (true);
DROP POLICY IF EXISTS "cf_insert"     ON public.case_files;
CREATE POLICY "cf_insert"     ON public.case_files FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "cf_delete_own" ON public.case_files;
CREATE POLICY "cf_delete_own" ON public.case_files FOR DELETE USING (auth.uid() = uploaded_by);

-- rubrics
DROP POLICY IF EXISTS "rubrics_select"     ON public.rubrics;
CREATE POLICY "rubrics_select"     ON public.rubrics FOR SELECT USING (true);
DROP POLICY IF EXISTS "rubrics_insert"     ON public.rubrics;
CREATE POLICY "rubrics_insert"     ON public.rubrics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "rubrics_update_own" ON public.rubrics;
CREATE POLICY "rubrics_update_own" ON public.rubrics FOR UPDATE USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "rubrics_delete_own" ON public.rubrics;
CREATE POLICY "rubrics_delete_own" ON public.rubrics FOR DELETE USING (auth.uid() = created_by);

-- rubric_criteria
DROP POLICY IF EXISTS "criteria_select" ON public.rubric_criteria;
CREATE POLICY "criteria_select" ON public.rubric_criteria FOR SELECT USING (true);
DROP POLICY IF EXISTS "criteria_insert" ON public.rubric_criteria;
CREATE POLICY "criteria_insert" ON public.rubric_criteria FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "criteria_update" ON public.rubric_criteria;
CREATE POLICY "criteria_update" ON public.rubric_criteria FOR UPDATE USING (true);
DROP POLICY IF EXISTS "criteria_delete" ON public.rubric_criteria;
CREATE POLICY "criteria_delete" ON public.rubric_criteria FOR DELETE USING (true);


-- =============================================================================
-- 3. FIX RLS — profiles (causa del bug "no se encontró el usuario")
--    La policy profiles_select debe existir con USING(true) para que
--    cualquier usuario autenticado pueda buscar perfiles por email.
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select"     ON public.profiles;
CREATE POLICY "profiles_select"     ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Política de INSERT para cuando el trigger no existe (seguridad definer)
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NOT NULL);


-- =============================================================================
-- 4. FIX TRIGGER — handle_new_user con ON CONFLICT
--    Asegura que al registrarse siempre se llene profiles.email.
--    ON CONFLICT DO UPDATE garantiza que si el row ya existe, se actualice el email.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    3
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- 5. FIX DATA — Sincronizar profiles.email para usuarios ya registrados
--    (usuarios cuyo email era NULL porque se registraron antes del trigger)
-- =============================================================================

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');


-- =============================================================================
-- 6. VERIFICACIÓN — Resultados esperados al terminar
-- =============================================================================

-- 6a. Políticas activas en profiles
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd;

-- 6b. Tablas nuevas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('course_members','case_files','rubrics','rubric_criteria')
ORDER BY table_name;

-- 6c. Columna rubric_id en evaluaciones
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'evaluaciones'
  AND column_name = 'rubric_id';

-- 6d. Usuarios reales con email sincronizado
SELECT id, full_name, email
FROM public.profiles
WHERE email NOT LIKE '%seed@example.com'
  AND email NOT LIKE '%demo@example.com'
ORDER BY created_at DESC;

COMMIT;
