-- Add columns for targeting notifications to a case or a course (run in Supabase SQL editor as an admin)
BEGIN;
ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS case_id bigint,
  ADD COLUMN IF NOT EXISTS course_id bigint;

-- Allow broadcast-style notifications where user_id is null (we'll distribute them via trigger)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop NOT NULL on public.notifications.user_id: %', SQLERRM;
  END;
END $$;

-- Optionally add foreign keys if those tables use uuid PKs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'notifications' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'case_id'
  ) THEN
    BEGIN
      ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.clinical_cases(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add foreign key notifications_case_id_fkey: %', SQLERRM;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'notifications' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'course_id'
  ) THEN
    BEGIN
      ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add foreign key notifications_course_id_fkey: %', SQLERRM;
    END;
  END IF;
END $$;

COMMIT;

-- Note: adjust referenced table names (clinical_cases/courses) if your schema uses Spanish table names (casos_clinicos, grupos, etc.