-- Create a sample course and 5 student profiles, then add them as course members
-- Run this in Supabase SQL editor (as admin) after you have run the migrations.

BEGIN;

-- Create course
INSERT INTO public.courses (name, description)
VALUES ('Curso Prueba - Medical Scholar', 'Curso creado automáticamente para pruebas (no borrar)').;

-- Insert sample student profiles (use your own UUIDs if you prefer)
INSERT INTO public.profiles (id, full_name, email, role, created_at)
VALUES
  ('b3d7a1f2-3c4a-4d49-9f3a-1a2b3c4d5e01', 'Alumno Prueba 1', 'alumno1+prueba@example.com', 'student', now()),
  ('b3d7a1f2-3c4a-4d49-9f3a-1a2b3c4d5e02', 'Alumno Prueba 2', 'alumno2+prueba@example.com', 'student', now()),
  ('b3d7a1f2-3c4a-4d49-9f3a-1a2b3c4d5e03', 'Alumno Prueba 3', 'alumno3+prueba@example.com', 'student', now()),
  ('b3d7a1f2-3c4a-4d49-9f3a-1a2b3c4d5e04', 'Alumno Prueba 4', 'alumno4+prueba@example.com', 'student', now()),
  ('b3d7a1f2-3c4a-4d49-9f3a-1a2b3c4d5e05', 'Alumno Prueba 5', 'alumno5+prueba@example.com', 'student', now())
ON CONFLICT (email) DO NOTHING;

-- Link students to the course we just created
INSERT INTO public.course_members (course_id, user_id)
SELECT c.id, p.id
FROM public.courses c
JOIN public.profiles p ON p.email IN (
  'alumno1+prueba@example.com',
  'alumno2+prueba@example.com',
  'alumno3+prueba@example.com',
  'alumno4+prueba@example.com',
  'alumno5+prueba@example.com'
)
WHERE c.name = 'Curso Prueba - Medical Scholar'
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify: run
-- SELECT * FROM public.courses WHERE name = 'Curso Prueba - Medical Scholar';
-- SELECT * FROM public.course_members WHERE course_id = (SELECT id FROM public.courses WHERE name = 'Curso Prueba - Medical Scholar');
