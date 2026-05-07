Run order and instructions — Supabase SQL steps (safe, copy/paste)

Overview
--------
These steps will prepare your Supabase database to support:
- Case expiry notifications (expire_at + cron job)
- Normalized file storage (`case_files`) and UI uploads
- Notifications distribution for course broadcasts

Important: I cannot run these commands against your Supabase project from here. Paste each SQL file into your Supabase SQL editor (Project → SQL) and run them as an admin.

Recommended order (copy/paste these exact filenames into the SQL editor):

1) Migration: add expire_at, notified, files, course_id and create `case_files`
   - File: db/migrate_cases_add_expiry_and_files.sql
   - Paste and run.

2) Allow notification targets and make user_id nullable on notifications
   - File: db/alter_notifications_add_targets.sql
   - Paste and run.

3) Trigger: distribute course notifications to members
   - File: db/notifications_distribute_course.sql
   - Paste and run.

4) Scheduled expiry job (pg_cron) — optional activation
   - File: db/case_expiry_notify_pg_cron.sql
   - Paste and run. If you want the job enabled automatically, uncomment the cron.schedule line in the file or schedule it manually in your project.

5) Create sample data to test notifications (optional)
   - File: db/create_sample_course_and_members.sql
   - Paste and run. This creates a course and five test students and links them to the course.

Verifications to run in SQL editor after steps
---------------------------------------------
-- Courses exist
SELECT id, name FROM public.courses LIMIT 10;

-- A sample course members list
SELECT cm.course_id, cm.user_id, p.full_name, p.email
FROM public.course_members cm
JOIN public.profiles p ON p.id = cm.user_id
LIMIT 20;

-- Case files
SELECT * FROM public.case_files LIMIT 10;

-- Notifications recent
SELECT * FROM public.notifications ORDER BY created_at DESC LIMIT 20;

Policies and RLS notes
----------------------
- If you have Row Level Security (RLS) enabled, ensure policies allow the following actions:
  - Instructors (authenticated) can INSERT into `casos_clinicos` (or `clinical_cases`) and insert into `case_files` or upload to storage.
  - The trigger `distribute_notification_to_course()` will perform inserts into `notifications` for other users. If RLS prevents that, create the function as SECURITY DEFINER or run as owner. Example:

    CREATE OR REPLACE FUNCTION public.distribute_notification_to_course()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    ...function body...
    $$;

- The pg_cron job also requires elevated privileges; use the SQL editor as project owner.

How to test end-to-end (quick)
------------------------------
1) Create a test case via the app (Dashboard → Nuevo Caso). Select "Curso Prueba - Medical Scholar" and check "Notificar ahora".
2) Open SQL editor and check `public.notifications` — you should see one notification row per course member.
3) If you enabled pg_cron and created a case with a short `Tiempo estimado` (e.g. 1 minute), wait and verify `notify_expired_cases()` created notifications and `casos_clinicos.notified` toggled to TRUE.

If you want, I can also:
- Provide an executable shell script for running these files using the Supabase CLI (if you confirm you have the CLI installed),
- Or, if you want me to perform these steps remotely, provide a secure way (temporary admin SQL token) and I can execute them for you (I recommend running them yourself for security).

Tell me which you prefer and I will prepare the exact command/script accordingly.
