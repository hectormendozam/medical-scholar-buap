-- This script creates a function and a pg_cron job that inserts notifications for cases
-- whose expire_at has passed. Run as a project SQL admin in Supabase (pg_cron is available in Supabase projects).

-- Function: notify_expired_cases()
CREATE OR REPLACE FUNCTION public.notify_expired_cases()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  rec RECORD;
  member RECORD;
BEGIN
  FOR rec IN SELECT id, titulo, sintomas, expire_at FROM public.casos_clinicos WHERE expire_at IS NOT NULL AND expire_at <= now() AND notified = FALSE LOOP
    -- find students to notify; adapt this query to your course_members logic if needed
    FOR member IN SELECT id as user_id FROM public.profiles WHERE role = 'student' LOOP
      INSERT INTO public.notifications(user_id, title, body, case_id, read)
      VALUES(member.user_id, 'Caso expirado: ' || coalesce(rec.titulo, 'Caso clínico'), left(coalesce(rec.sintomas,''), 240), rec.id, false);
    END LOOP;
    -- mark as notified to avoid duplicates
    UPDATE public.casos_clinicos SET notified = TRUE WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Schedule: run every 5 minutes
-- Note: You must have pg_cron enabled in your Supabase project and run this as an owner. Uncomment to create the job.
-- SELECT cron.schedule('*/5 * * * *', 'SELECT public.notify_expired_cases()');

-- Guidance: create a boolean column `notified` on `casos_clinicos` to avoid duplicate notifications:
-- ALTER TABLE public.casos_clinicos ADD COLUMN IF NOT EXISTS notified boolean DEFAULT false;

-- IMPORTANT: Run this file in the Supabase SQL editor as an admin. pg_cron jobs require elevated privileges.
