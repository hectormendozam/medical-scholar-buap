-- Example SQL: create a Supabase auth user and a matching profile in public.profiles
-- Variant A: You already have the auth.uid() (uuid) and want to insert a profile row.
-- Replace <AUTH_USER_UUID> and other fields.

INSERT INTO public.profiles (id, full_name, email, role_id, specialty, level, institution, avatar_url, created_at)
VALUES (
  '<AUTH_USER_UUID>'::uuid,
  'Juan Pérez',
  'juan.perez@student.example.com',
  3, -- role_id 3 = student (adjust to your roles table)
  'Medicina General',
  'Estudiante',
  'Facultad de Medicina BUAP',
  NULL,
  now()
);

-- Variant B: If you need to create the auth user via Supabase Admin API / Dashboard, do this from the Auth interface
-- After creating the auth user (in the Supabase Auth users panel) copy the user's uuid (id) and run the previous INSERT.

-- Variant C: Insert profile by looking up the user id by email (useful in SQL editor if the user exists)
-- Replace the email accordingly

WITH u AS (
  SELECT id FROM auth.users WHERE email = 'juan.perez@student.example.com' LIMIT 1
)
INSERT INTO public.profiles (id, full_name, email, role_id, specialty, level, institution, avatar_url, created_at)
SELECT u.id, 'Juan Pérez', 'juan.perez@student.example.com', 3, 'Medicina General', 'Estudiante', 'Facultad de Medicina BUAP', NULL, now()
FROM u
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, role_id = EXCLUDED.role_id, specialty = EXCLUDED.specialty, level = EXCLUDED.level, institution = EXCLUDED.institution;

-- If your profiles table uses a different schema (e.g., usuario_id, nombre_completo, etc.), adjust column names accordingly.
