-- Migration: create case_invites table so cases can be joined via a code
BEGIN;

CREATE TABLE IF NOT EXISTS public.case_invites (
  id bigserial PRIMARY KEY,
  case_id bigint NOT NULL,
  code text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  used_by uuid REFERENCES auth.users(id),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_invites_case_id ON public.case_invites(case_id);
CREATE INDEX IF NOT EXISTS idx_case_invites_code ON public.case_invites(code);

-- Enable Row Level Security
ALTER TABLE public.case_invites ENABLE ROW LEVEL SECURITY;

-- Helper: returns true if the current user is a teacher/instructor
-- Supports both schemas: role text column OR role_id numeric column (role_id=2)
-- We use a DO block to create the policy conditionally based on what columns exist.

DO $$
DECLARE
  has_role_text   boolean;
  has_role_id     boolean;
  teacher_check   text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) INTO has_role_text;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role_id'
  ) INTO has_role_id;

  -- Build the teacher check expression
  IF has_role_text AND has_role_id THEN
    teacher_check := $cond$
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND (profiles.role IN ('teacher','instructor') OR profiles.role_id = 2)
      )
    $cond$;
  ELSIF has_role_id THEN
    teacher_check := $cond$
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role_id = 2
      )
    $cond$;
  ELSE
    teacher_check := $cond$
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('teacher','instructor')
      )
    $cond$;
  END IF;

  -- Drop existing policies if any (idempotent)
  DROP POLICY IF EXISTS "teachers_manage_invites" ON public.case_invites;
  DROP POLICY IF EXISTS "authenticated_read_invites" ON public.case_invites;
  DROP POLICY IF EXISTS "student_mark_invite_used" ON public.case_invites;

  -- Teachers: full access
  EXECUTE format(
    'CREATE POLICY "teachers_manage_invites" ON public.case_invites FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
    teacher_check, teacher_check
  );

  -- Any authenticated user: SELECT (to validate a code when joining)
  EXECUTE 'CREATE POLICY "authenticated_read_invites" ON public.case_invites FOR SELECT TO authenticated USING (true)';

  -- Students: UPDATE only to mark used_by as themselves
  EXECUTE 'CREATE POLICY "student_mark_invite_used" ON public.case_invites FOR UPDATE TO authenticated USING (used_by IS NULL OR used_by = auth.uid()) WITH CHECK (used_by = auth.uid())';
END;
$$;

COMMIT;
