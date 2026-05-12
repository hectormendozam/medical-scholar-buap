-- Migration: ensure case_assignments has a user_id column and correct RLS policies
-- The table already exists with (case_id, course_id, assigned_by).
-- We add user_id for individual student assignments (used when joining via invite code).
BEGIN;

-- Create the table only if it does not exist yet (fresh DB)
CREATE TABLE IF NOT EXISTS public.case_assignments (
  id          bigserial PRIMARY KEY,
  case_id     bigint NOT NULL,
  course_id   bigint,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now()
);

-- Add user_id column to existing table if it's missing
ALTER TABLE public.case_assignments
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add course_id column if missing (keeps backwards compatibility)
ALTER TABLE public.case_assignments
  ADD COLUMN IF NOT EXISTS course_id bigint;

CREATE INDEX IF NOT EXISTS idx_case_assignments_case_id ON public.case_assignments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_assignments_user_id ON public.case_assignments(user_id);

-- Enable RLS
ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;

-- Drop old policies if re-running
DROP POLICY IF EXISTS "teachers_manage_assignments"    ON public.case_assignments;
DROP POLICY IF EXISTS "students_read_own_assignments"  ON public.case_assignments;
DROP POLICY IF EXISTS "students_insert_own_assignment" ON public.case_assignments;

-- Build teacher-check expression dynamically (handles role text vs role_id numeric)
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
    'CREATE POLICY "teachers_manage_assignments" ON public.case_assignments FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
    teacher_check, teacher_check
  );
END;
$$;

-- Students can SELECT rows where they are the assigned user
CREATE POLICY "students_read_own_assignments"
  ON public.case_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Students can INSERT a row assigning themselves (when joining via invite code)
CREATE POLICY "students_insert_own_assignment"
  ON public.case_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

COMMIT;
