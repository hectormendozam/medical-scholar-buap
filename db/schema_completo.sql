-- =============================================================================
-- MEDICAL SCHOLAR BUAP — Schema Completo (limpio)
-- Última revisión: 2026-05-14
--
-- Ejecutar en Supabase SQL Editor de una sola vez.
-- Tablas ordenadas por dependencias FK.
--
-- ✅ TABLAS ACTIVAS (usadas en el frontend)
--   roles, profiles, courses, clinical_cases, case_invites, course_invites,
--   case_assignments, case_resolutions, resoluciones, evaluaciones,
--   chat_messages, chat_typing, message_attachments, notifications,
--   archivos_apoyo
--
-- �� TABLAS OPCIONALES / FUTURAS (comentadas al final)
--   course_members, case_files, tasks, task_assignees,
--   evaluations, rubrics, rubric_criteria, evaluation_scores,
--   case_feedback, activity_logs
-- =============================================================================

-- 1. ROLES
CREATE TABLE IF NOT EXISTS public.roles (
  id   SMALLSERIAL PRIMARY KEY,
  name text NOT NULL UNIQUE CHECK (name = ANY (ARRAY['administrador','instructor','estudiante']))
);
INSERT INTO public.roles (name) VALUES ('administrador'),('instructor'),('estudiante')
  ON CONFLICT (name) DO NOTHING;

-- 2. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  email       text UNIQUE,
  role_id     smallint NOT NULL DEFAULT 3 REFERENCES public.roles(id),
  is_active   boolean  NOT NULL DEFAULT true,
  specialty   text,
  level       text,
  institution text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. COURSES
CREATE TABLE IF NOT EXISTS public.courses (
  id          BIGSERIAL PRIMARY KEY,
  name        text NOT NULL,
  description text,
  created_by  uuid REFERENCES public.profiles(id),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 4. CLINICAL_CASES
CREATE TABLE IF NOT EXISTS public.clinical_cases (
  id                   BIGSERIAL PRIMARY KEY,
  title                text NOT NULL,
  description          text,
  initial_information  text,
  clinical_history     text,
  symptoms             text,
  antecedentes         text,
  consejo_mentor       text,
  category             text,
  level                text,
  tags                 text[],
  status               text NOT NULL DEFAULT 'borrador'
                         CHECK (status = ANY (ARRAY['borrador','publicado','cerrado'])),
  instructor_id        uuid REFERENCES auth.users(id),
  created_by           uuid REFERENCES public.profiles(id),
  course_id            bigint REFERENCES public.courses(id),
  estimated_minutes    integer,
  tiempo_estimado      text,
  expire_at            timestamptz,
  due_date             timestamptz,
  published_at         timestamptz,
  notified             boolean DEFAULT false,
  files                jsonb,
  veredicto_final      text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- 5. CASE_INVITES
CREATE TABLE IF NOT EXISTS public.case_invites (
  id         BIGSERIAL PRIMARY KEY,
  case_id    bigint NOT NULL,
  code       text   NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  used_by    uuid REFERENCES auth.users(id),
  used_at    timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 6. COURSE_INVITES
CREATE TABLE IF NOT EXISTS public.course_invites (
  id         BIGSERIAL PRIMARY KEY,
  course_id  bigint NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  code       text   NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  used_by    uuid REFERENCES auth.users(id),
  used_at    timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 7. CASE_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.case_assignments (
  id          BIGSERIAL PRIMARY KEY,
  case_id     bigint NOT NULL REFERENCES public.clinical_cases(id) ON DELETE CASCADE,
  course_id   bigint REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id),
  assigned_by uuid REFERENCES public.profiles(id),
  assigned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_case_assignments_case_id ON public.case_assignments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_assignments_user_id ON public.case_assignments(user_id);

-- 8. CASE_RESOLUTIONS  (envíos via CaseDetail — resolution + conclusion)
CREATE TABLE IF NOT EXISTS public.case_resolutions (
  id          BIGSERIAL PRIMARY KEY,
  case_id     bigint NOT NULL REFERENCES public.clinical_cases(id) ON DELETE CASCADE,
  resolved_by uuid REFERENCES public.profiles(id),
  resolution  text NOT NULL,
  conclusion  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 9. RESOLUCIONES  (envíos legacy — diagnostico + plan + justificacion)
CREATE TABLE IF NOT EXISTS public.resoluciones (
  id               BIGSERIAL PRIMARY KEY,
  caso_id          bigint REFERENCES public.clinical_cases(id) ON DELETE CASCADE,
  estudiante_id    uuid REFERENCES public.profiles(id),
  diagnostico      text,
  plan_terapeutico text,
  justificacion    text,
  fecha_entrega    timestamptz DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resoluciones_estudiante ON public.resoluciones(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_resoluciones_caso       ON public.resoluciones(caso_id);

-- 10. EVALUACIONES  (calificaciones de instructor)
CREATE TABLE IF NOT EXISTS public.evaluaciones (
  id                 BIGSERIAL PRIMARY KEY,
  resolucion_id      text,       -- FK lógica a resoluciones.id
  case_resolution_id bigint,     -- FK lógica a case_resolutions.id
  instructor_id      uuid REFERENCES public.profiles(id),
  calificacion       numeric(5,2),
  retroalimentacion  text,
  rubrica_detalle    jsonb,
  created_at         timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_resolucion ON public.evaluaciones(resolucion_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_case_res   ON public.evaluaciones(case_resolution_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_instructor ON public.evaluaciones(instructor_id);

-- 11. CHAT_MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         BIGSERIAL PRIMARY KEY,
  case_id    bigint NOT NULL REFERENCES public.clinical_cases(id) ON DELETE CASCADE,
  user_id    uuid   NOT NULL REFERENCES public.profiles(id),
  message    text   NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_case ON public.chat_messages(case_id);

-- 12. CHAT_TYPING  (presencia realtime)
CREATE TABLE IF NOT EXISTS public.chat_typing (
  case_id        bigint NOT NULL,
  user_id        uuid   NOT NULL,
  last_typing_at timestamptz DEFAULT now(),
  PRIMARY KEY (case_id, user_id)
);

-- 13. MESSAGE_ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id          BIGSERIAL PRIMARY KEY,
  message_id  bigint NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.profiles(id),
  file_name   text NOT NULL,
  file_url    text NOT NULL,
  file_type   text CHECK (file_type = ANY (ARRAY['pdf','imagen','otro'])),
  size        bigint,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id                BIGSERIAL PRIMARY KEY,
  user_id           uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id           bigint REFERENCES public.clinical_cases(id) ON DELETE SET NULL,
  course_id         bigint REFERENCES public.courses(id) ON DELETE SET NULL,
  title             text NOT NULL,
  message           text NOT NULL,
  notification_type text NOT NULL DEFAULT 'info'
                      CHECK (notification_type = ANY (ARRAY['info','comentario','tarea','evaluacion','retroalimentacion','archivo','caso'])),
  is_read           boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- 15. ARCHIVOS_APOYO  (material de estudio — Files.tsx)
CREATE TABLE IF NOT EXISTS public.archivos_apoyo (
  id         BIGSERIAL PRIMARY KEY,
  nombre     text NOT NULL,
  categoria  text,
  tipo       text,
  url        text NOT NULL,
  subido_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- RLS — Habilitar
-- =============================================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles','courses','clinical_cases',
    'case_invites','course_invites','case_assignments',
    'case_resolutions','resoluciones','evaluaciones',
    'chat_messages','chat_typing','message_attachments',
    'notifications','archivos_apoyo'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- =============================================================================
-- POLÍTICAS RLS
-- =============================================================================

DROP POLICY IF EXISTS "profiles_select"     ON public.profiles;
CREATE POLICY "profiles_select"     ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "cases_select"     ON public.clinical_cases;
CREATE POLICY "cases_select"     ON public.clinical_cases FOR SELECT USING (true);
DROP POLICY IF EXISTS "cases_insert"     ON public.clinical_cases;
CREATE POLICY "cases_insert"     ON public.clinical_cases FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "cases_update_own" ON public.clinical_cases;
CREATE POLICY "cases_update_own" ON public.clinical_cases FOR UPDATE
  USING (auth.uid() = created_by OR auth.uid() = instructor_id);

DROP POLICY IF EXISTS "resolutions_select"     ON public.case_resolutions;
CREATE POLICY "resolutions_select"     ON public.case_resolutions FOR SELECT USING (true);
DROP POLICY IF EXISTS "resolutions_insert"     ON public.case_resolutions;
CREATE POLICY "resolutions_insert"     ON public.case_resolutions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "resolutions_update_own" ON public.case_resolutions;
CREATE POLICY "resolutions_update_own" ON public.case_resolutions FOR UPDATE USING (auth.uid() = resolved_by);
DROP POLICY IF EXISTS "resolutions_delete_own" ON public.case_resolutions;
CREATE POLICY "resolutions_delete_own" ON public.case_resolutions FOR DELETE USING (auth.uid() = resolved_by);

DROP POLICY IF EXISTS "resoluciones_select"     ON public.resoluciones;
CREATE POLICY "resoluciones_select"     ON public.resoluciones FOR SELECT USING (true);
DROP POLICY IF EXISTS "resoluciones_insert"     ON public.resoluciones;
CREATE POLICY "resoluciones_insert"     ON public.resoluciones FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "resoluciones_update_own" ON public.resoluciones;
CREATE POLICY "resoluciones_update_own" ON public.resoluciones FOR UPDATE USING (auth.uid() = estudiante_id);

DROP POLICY IF EXISTS "evaluaciones_select" ON public.evaluaciones;
CREATE POLICY "evaluaciones_select" ON public.evaluaciones FOR SELECT USING (true);
DROP POLICY IF EXISTS "evaluaciones_insert" ON public.evaluaciones;
CREATE POLICY "evaluaciones_insert" ON public.evaluaciones FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "evaluaciones_update" ON public.evaluaciones;
CREATE POLICY "evaluaciones_update" ON public.evaluaciones FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "chat_select" ON public.chat_messages;
CREATE POLICY "chat_select" ON public.chat_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "chat_insert" ON public.chat_messages;
CREATE POLICY "chat_insert" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "attach_select" ON public.message_attachments;
CREATE POLICY "attach_select" ON public.message_attachments FOR SELECT USING (true);
DROP POLICY IF EXISTS "attach_insert" ON public.message_attachments;
CREATE POLICY "attach_insert" ON public.message_attachments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_insert"     ON public.notifications;
CREATE POLICY "notif_insert"     ON public.notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "invites_select" ON public.case_invites;
CREATE POLICY "invites_select" ON public.case_invites FOR SELECT USING (true);
DROP POLICY IF EXISTS "invites_insert" ON public.case_invites;
CREATE POLICY "invites_insert" ON public.case_invites FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "invites_update" ON public.case_invites;
CREATE POLICY "invites_update" ON public.case_invites FOR UPDATE USING (true);

DROP POLICY IF EXISTS "courses_select" ON public.courses;
CREATE POLICY "courses_select" ON public.courses FOR SELECT USING (true);
DROP POLICY IF EXISTS "courses_insert" ON public.courses;
CREATE POLICY "courses_insert" ON public.courses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "assignments_select" ON public.case_assignments;
CREATE POLICY "assignments_select" ON public.case_assignments FOR SELECT USING (true);
DROP POLICY IF EXISTS "assignments_insert" ON public.case_assignments;
CREATE POLICY "assignments_insert" ON public.case_assignments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "archivos_select" ON public.archivos_apoyo;
CREATE POLICY "archivos_select" ON public.archivos_apoyo FOR SELECT USING (true);
DROP POLICY IF EXISTS "archivos_insert" ON public.archivos_apoyo;
CREATE POLICY "archivos_insert" ON public.archivos_apoyo FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- ✅ TABLAS NUEVAS ACTIVADAS
-- =============================================================================

-- 16. COURSE_MEMBERS  (alumnos inscritos a un curso)
CREATE TABLE IF NOT EXISTS public.course_members (
  id        BIGSERIAL PRIMARY KEY,
  course_id bigint NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id   uuid   NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_course_members_course ON public.course_members(course_id);
CREATE INDEX IF NOT EXISTS idx_course_members_user  ON public.course_members(user_id);

-- 17. CASE_FILES  (archivos adjuntos a un caso clínico)
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

-- 18. RUBRICS  (rúbricas de evaluación por caso)
CREATE TABLE IF NOT EXISTS public.rubrics (
  id         BIGSERIAL PRIMARY KEY,
  case_id    bigint NOT NULL REFERENCES public.clinical_cases(id) ON DELETE CASCADE,
  title      text NOT NULL DEFAULT 'Rúbrica de evaluación',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 19. RUBRIC_CRITERIA  (criterios dentro de una rúbrica)
CREATE TABLE IF NOT EXISTS public.rubric_criteria (
  id          BIGSERIAL PRIMARY KEY,
  rubric_id   bigint NOT NULL REFERENCES public.rubrics(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  max_score   numeric NOT NULL CHECK (max_score > 0),
  sort_order  smallint DEFAULT 0
);

-- RLS para tablas nuevas
ALTER TABLE public.course_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_files      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cm_select" ON public.course_members;
CREATE POLICY "cm_select" ON public.course_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "cm_insert" ON public.course_members;
CREATE POLICY "cm_insert" ON public.course_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "cm_delete_own" ON public.course_members;
CREATE POLICY "cm_delete_own" ON public.course_members FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cf_select" ON public.case_files;
CREATE POLICY "cf_select" ON public.case_files FOR SELECT USING (true);
DROP POLICY IF EXISTS "cf_insert" ON public.case_files;
CREATE POLICY "cf_insert" ON public.case_files FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "cf_delete_own" ON public.case_files;
CREATE POLICY "cf_delete_own" ON public.case_files FOR DELETE USING (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "rubrics_select" ON public.rubrics;
CREATE POLICY "rubrics_select" ON public.rubrics FOR SELECT USING (true);
DROP POLICY IF EXISTS "rubrics_insert" ON public.rubrics;
CREATE POLICY "rubrics_insert" ON public.rubrics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "rubrics_update_own" ON public.rubrics;
CREATE POLICY "rubrics_update_own" ON public.rubrics FOR UPDATE USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "rubrics_delete_own" ON public.rubrics;
CREATE POLICY "rubrics_delete_own" ON public.rubrics FOR DELETE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "criteria_select" ON public.rubric_criteria;
CREATE POLICY "criteria_select" ON public.rubric_criteria FOR SELECT USING (true);
DROP POLICY IF EXISTS "criteria_insert" ON public.rubric_criteria;
CREATE POLICY "criteria_insert" ON public.rubric_criteria FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "criteria_update" ON public.rubric_criteria;
CREATE POLICY "criteria_update" ON public.rubric_criteria FOR UPDATE USING (true);
DROP POLICY IF EXISTS "criteria_delete" ON public.rubric_criteria;
CREATE POLICY "criteria_delete" ON public.rubric_criteria FOR DELETE USING (true);

-- =============================================================================
-- 💤 TABLAS FUTURAS (descomentar cuando se implementen)
-- =============================================================================
/*
-- tasks / task_assignees — sistema de tareas por caso (pendiente)
-- evaluations / evaluation_scores — calificación estructurada por rúbrica
--   NOTE: actualmente se usa "evaluaciones" (tabla unificada). "evaluations" es
--   para un flujo más granular con rubric_criteria + evaluation_scores.
--   Activar si se quiere reemplazar o complementar "evaluaciones".
-- case_feedback — retroalimentación grupal (pendiente)
-- activity_logs — auditoría (pendiente)
*/
