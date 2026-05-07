-- Distribute notifications to all members of a course
-- Behaviour: when a row is inserted into public.notifications with course_id NOT NULL and user_id IS NULL,
-- the trigger will create one notification row per member of that course (one user_id per row) and prevent the original row from being stored.
-- Run this in Supabase SQL editor as an admin.

BEGIN;

-- Create function
CREATE OR REPLACE FUNCTION public.distribute_notification_to_course()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  candidate_tables text[] := array[
    'course_members', 'course_users', 'course_enrollments', 'enrollments', 'memberships', 'group_members', 'grupos_miembros'
  ];
  tbl text;
  found boolean := false;
  inserted_count int := 0;
BEGIN
  -- Only act when course_id is present and no specific user target
  IF NEW.course_id IS NULL OR NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  FOR i IN array_lower(candidate_tables,1) .. array_upper(candidate_tables,1) LOOP
    tbl := candidate_tables[i];
    -- check table exists in public schema
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      -- Attempt to insert one notification per user in the membership table
      BEGIN
        EXECUTE format(
          'INSERT INTO public.notifications (user_id, title, message, course_id, case_id, created_at, is_read) \n' ||
          'SELECT user_id, $1, $2, $3, $4, now(), false FROM public.%I WHERE course_id = $3', tbl
        ) USING NEW.title, NEW.message, NEW.course_id, COALESCE(NEW.case_id, NULL);
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        found := true;
        EXIT; -- stop after first matching table
      EXCEPTION WHEN others THEN
        -- If the membership table has different column names (not user_id/course_id), we'll skip and continue
        RAISE NOTICE 'Could not insert using membership table %: %', tbl, SQLERRM;
      END;
    END IF;
  END LOOP;

  IF NOT found THEN
    -- No membership table found or inserts failed: fallback behaviour - just keep the original row
    RAISE NOTICE 'No membership table found to distribute course notification, keeping original notification for course %', NEW.course_id;
    RETURN NEW;
  END IF;

  -- If we got here and distributed notifications, skip inserting the original row
  RETURN NULL;
END;
$$;

-- Create trigger on notifications BEFORE INSERT
DROP TRIGGER IF EXISTS notifications_distribute_course_trg ON public.notifications;
CREATE TRIGGER notifications_distribute_course_trg
BEFORE INSERT ON public.notifications
FOR EACH ROW
WHEN (NEW.course_id IS NOT NULL AND NEW.user_id IS NULL)
EXECUTE FUNCTION public.distribute_notification_to_course();

COMMIT;

-- Notes:
-- 1) This function assumes membership tables have columns named `user_id` and `course_id`. If your membership table uses different column names (e.g., student_id, grupo_id), either add it to the candidate_tables array and adapt the function accordingly, or rename columns/create a view.
-- 2) The trigger will skip storing the original notifications row (it returns NULL) because it expands into per-user rows.
-- 3) Test in a staging DB first. If you'd rather keep the original row and also create per-user copies, change the function to RETURN NEW at the end instead of RETURN NULL.
