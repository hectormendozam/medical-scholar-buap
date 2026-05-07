-- Create auth user if missing and upsert profile safely.
-- Run this in Supabase SQL editor as project owner (admin). It will:
-- 1) ensure an auth.users row exists for the email
-- 2) upsert the corresponding public.profiles row (uses the auth.users.id as FK)

DO $$
DECLARE
  target_email text := 'andres@gmail.com';
  target_full_name text := 'Andres Cruz';
  target_role_id smallint := 2; -- 1=admin,2=instructor,3=student
  target_specialty text := 'Medicina Interna';
  target_level text := 'Residente R1';
  target_institution text := 'Hospital Universitario BUAP';
  target_avatar text := 'https://www.google.com/url?sa=t&source=web&rct=j&url=https%3A%2F%2Fes.dreamstime.com%2Fstock-de-ilustraci%25C3%25B3n-dise%25C3%25B1o-de-la-persona-joven-image71776168&ved=0CBYQjRxqFwoTCNi1xoOqkpQDFQAAAAAdAAAAABAz&opi=89978449';
  uid uuid;
BEGIN
  -- find existing auth user
  SELECT id INTO uid FROM auth.users WHERE email = target_email LIMIT 1;

  IF uid IS NULL THEN
    -- create a lightweight auth.users row for staging/testing
    INSERT INTO auth.users (id, aud, email, email_confirmed_at, raw_user_meta_data, created_at)
    VALUES (uuid_generate_v4(), 'authenticated', target_email, now(), jsonb_build_object('full_name', target_full_name), now())
    RETURNING id INTO uid;
  END IF;

  -- upsert profile using the auth.users id
  INSERT INTO public.profiles (id, full_name, email, role_id, is_active, created_at, updated_at, specialty, level, institution, avatar_url)
  VALUES (uid, target_full_name, target_email, target_role_id, true, now(), now(), target_specialty, target_level, target_institution, target_avatar)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      role_id = EXCLUDED.role_id,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at,
      specialty = EXCLUDED.specialty,
      level = EXCLUDED.level,
      institution = EXCLUDED.institution,
      avatar_url = EXCLUDED.avatar_url;

  RAISE NOTICE 'User ensured with id % for email %', uid, target_email;
END$$;
