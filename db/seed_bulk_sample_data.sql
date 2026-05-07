-- Bulk seed script for local/staging Supabase project
-- WARNING: Run in a staging environment. This script creates many rows to help you test UI and RLS policies.
-- Execute in Supabase SQL editor as project admin/owner.

BEGIN;

-- 1) Create admin and instructor auth users (note: auth.users is managed by Supabase Auth; if you don't have direct access, create profiles only)
-- If you have admin access to auth.users, insert there; otherwise create profiles with known UUIDs and set role_id to the appropriate value

-- We'll create sample profiles directly (function handle_new_user triggers only when auth.users is created).

-- Create instructor and admin accounts as profiles
INSERT INTO public.profiles (id, full_name, email, role_id, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Admin Demo', 'admin.demo@example.com', 1, now()),
  ('22222222-2222-2222-2222-222222222222', 'Instructor Demo', 'instructor.demo@example.com', 2, now())
ON CONFLICT (email) DO NOTHING;

-- Create 20 student profiles
INSERT INTO public.profiles (id, full_name, email, role_id, created_at)
SELECT uuid_generate_v4(), 'Alumno Seed ' || g, 'student' || g || '+seed@example.com', 3, now()
FROM generate_series(1,20) g
ON CONFLICT (email) DO NOTHING;

-- 2) Create courses
INSERT INTO public.courses (name, description, created_by)
VALUES
  ('Cardiología 101', 'Curso básico de Cardiología', '22222222-2222-2222-2222-222222222222'),
  ('Urgencias - Nivel Básico', 'Casos de urgencias para estudiantes', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (name) DO NOTHING;

-- 3) Assign students to courses
INSERT INTO public.course_members (course_id, user_id)
SELECT c.id, p.id
FROM public.courses c
CROSS JOIN LATERAL (
  SELECT id FROM public.profiles WHERE role_id = 3 ORDER BY created_at LIMIT 10
) p
WHERE c.name = 'Cardiología 101'
ON CONFLICT DO NOTHING;

INSERT INTO public.course_members (course_id, user_id)
SELECT c.id, p.id
FROM public.courses c
CROSS JOIN LATERAL (
  SELECT id FROM public.profiles WHERE role_id = 3 ORDER BY created_at OFFSET 10 LIMIT 10
) p
WHERE c.name = 'Urgencias - Nivel Básico'
ON CONFLICT DO NOTHING;

-- 4) Create clinical cases (one per course)
INSERT INTO public.clinical_cases (title, description, initial_information, clinical_history, symptoms, status, created_by, published_at)
VALUES
  ('Infarto Agudo de Miocardio', 'Paciente con dolor torácico intenso', 'TA 140/90, FC 110', 'HTA, tabaquismo', 'Dolor torácico opresivo irradiado a brazo izquierdo', 'publicado', '22222222-2222-2222-2222-222222222222', now()),
  ('Shock Hipovolémico', 'Paciente con pérdida de volumen', 'TA baja, palidez', 'Antecedente de hemorragia', 'Mareo, síncope', 'publicado', '22222222-2222-2222-2222-222222222222', now())
ON CONFLICT (title) DO NOTHING;

-- 5) Link cases to courses via case_assignments
INSERT INTO public.case_assignments (case_id, course_id, assigned_by)
SELECT cc.id, c.id, '22222222-2222-2222-2222-222222222222'
FROM public.clinical_cases cc
JOIN public.courses c ON c.name = 'Cardiología 101'
WHERE cc.title = 'Infarto Agudo de Miocardio'
ON CONFLICT DO NOTHING;

INSERT INTO public.case_assignments (case_id, course_id, assigned_by)
SELECT cc.id, c.id, '22222222-2222-2222-2222-222222222222'
FROM public.clinical_cases cc
JOIN public.courses c ON c.name = 'Urgencias - Nivel Básico'
WHERE cc.title = 'Shock Hipovolémico'
ON CONFLICT DO NOTHING;

-- 6) Add case_files (sample URLs point to placeholder; replace with real storage URLs if available)
INSERT INTO public.case_files (case_id, uploaded_by, file_name, file_url, file_type)
SELECT cc.id, '22222222-2222-2222-2222-222222222222', 'rx_torax.jpg', 'https://via.placeholder.com/800x600.png?text=RX', 'imagen'
FROM public.clinical_cases cc
WHERE cc.title = 'Infarto Agudo de Miocardio'
ON CONFLICT DO NOTHING;

INSERT INTO public.case_files (case_id, uploaded_by, file_name, file_url, file_type)
SELECT cc.id, '22222222-2222-2222-2222-222222222222', 'labs.pdf', 'https://example.com/sample-labs.pdf', 'pdf'
FROM public.clinical_cases cc
WHERE cc.title = 'Shock Hipovolémico'
ON CONFLICT DO NOTHING;

-- 7) Create chat messages and attachments
INSERT INTO public.chat_messages (case_id, user_id, message)
SELECT cc.id, '22222222-2222-2222-2222-222222222222', 'Discusión del caso y hallazgos iniciales'
FROM public.clinical_cases cc
WHERE cc.title = 'Infarto Agudo de Miocardio'
ON CONFLICT DO NOTHING;

INSERT INTO public.message_attachments (message_id, uploaded_by, file_name, file_url, file_type)
SELECT m.id, m.user_id, 'ecg.png', 'https://via.placeholder.com/600x200.png?text=ECG', 'imagen'
FROM public.chat_messages m
JOIN public.clinical_cases cc ON cc.id = m.case_id
WHERE cc.title = 'Infarto Agudo de Miocardio'
ON CONFLICT DO NOTHING;

-- 8) Tasks and assignees
INSERT INTO public.tasks (case_id, title, description, status, created_by)
SELECT cc.id, 'Interpretación EKG', 'Analizar EKG y describir hallazgos', 'pendiente', '22222222-2222-2222-2222-222222222222'
FROM public.clinical_cases cc
WHERE cc.title = 'Infarto Agudo de Miocardio'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_assignees (task_id, user_id)
SELECT t.id, p.id
FROM public.tasks t
JOIN public.clinical_cases cc ON cc.id = t.case_id
JOIN public.profiles p ON p.role_id = 3
WHERE cc.title = 'Infarto Agudo de Miocardio'
LIMIT 5
ON CONFLICT DO NOTHING;

-- 9) Rubrics and criteria
INSERT INTO public.rubrics (case_id, title, created_by)
SELECT cc.id, 'Rúbrica Básica', '22222222-2222-2222-2222-222222222222'
FROM public.clinical_cases cc
WHERE cc.title = 'Infarto Agudo de Miocardio'
ON CONFLICT DO NOTHING;

INSERT INTO public.rubric_criteria (rubric_id, name, description, max_score)
SELECT r.id, 'Diagnóstico', 'Precisión del diagnóstico', 50 FROM public.rubrics r WHERE r.title = 'Rúbrica Básica'
ON CONFLICT DO NOTHING;

INSERT INTO public.rubric_criteria (rubric_id, name, description, max_score)
SELECT r.id, 'Plan terapéutico', 'Adecuación del plan terapéutico', 50 FROM public.rubrics r WHERE r.title = 'Rúbrica Básica'
ON CONFLICT DO NOTHING;

-- 10) Evaluations and evaluation_scores (simulate grading some students)
INSERT INTO public.evaluations (case_id, evaluator_id, evaluated_user_id, general_comment, total_score)
SELECT cc.id, '22222222-2222-2222-2222-222222222222', p.id, 'Buen enfoque, mejorar tiempos', 85
FROM public.clinical_cases cc
JOIN public.profiles p ON p.role_id = 3
WHERE cc.title = 'Infarto Agudo de Miocardio'
LIMIT 3
ON CONFLICT DO NOTHING;

INSERT INTO public.evaluation_scores (evaluation_id, criteria_id, score, comment)
SELECT e.id, rc.id, 40, 'Buen diagnóstico' FROM public.evaluations e JOIN public.rubric_criteria rc ON rc.rubric_id = (SELECT r.id FROM public.rubrics r WHERE r.title = 'Rúbrica Básica') LIMIT 3
ON CONFLICT DO NOTHING;

-- 11) Case feedback
INSERT INTO public.case_feedback (case_id, instructor_id, user_id, feedback)
SELECT cc.id, '22222222-2222-2222-2222-222222222222', p.id, 'Excelente justificación clínica'
FROM public.clinical_cases cc
JOIN public.profiles p ON p.role_id = 3
WHERE cc.title = 'Infarto Agudo de Miocardio'
LIMIT 3
ON CONFLICT DO NOTHING;

-- 12) Notifications
INSERT INTO public.notifications (user_id, case_id, title, message)
SELECT p.id, cc.id, 'Nuevo caso asignado', 'Revisa el caso asignado en tu curso'
FROM public.course_members cm
JOIN public.profiles p ON p.id = cm.user_id
JOIN public.courses c ON c.id = cm.course_id
JOIN public.case_assignments ca ON ca.course_id = c.id
JOIN public.clinical_cases cc ON cc.id = ca.case_id
WHERE c.name = 'Cardiología 101'
ON CONFLICT DO NOTHING;

-- 13) Activity logs
INSERT INTO public.activity_logs (user_id, case_id, action, details)
SELECT '22222222-2222-2222-2222-222222222222', cc.id, 'case_created', jsonb_build_object('title', cc.title)
FROM public.clinical_cases cc
WHERE cc.title IN ('Infarto Agudo de Miocardio', 'Shock Hipovolémico')
ON CONFLICT DO NOTHING;

COMMIT;

-- End of seed script
