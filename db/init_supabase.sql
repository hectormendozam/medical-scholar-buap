-- Supabase schema for medical-scholar-buap
-- Run this in Supabase SQL editor (Project > SQL editor)

-- Enable uuid-ossp for uuid generation
create extension if not exists "uuid-ossp";

-- profiles table (users)
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  full_name text,
  role text not null default 'student',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- casos_clinicos table
create table if not exists casos_clinicos (
  id uuid primary key default uuid_generate_v4(),
  instructor_id uuid references profiles(id) on delete set null,
  titulo text not null,
  descripcion_inicial text,
  antecedentes text,
  sintomas text,
  nombre_paciente text,
  nivel text,
  tiempo_estimado text,
  categoria text,
  etiquetas text[],
  consejo_mentor text,
  estatus text,
  created_at timestamptz not null default now()
);

-- archivos_apoyo table
create table if not exists archivos_apoyo (
  id uuid primary key default uuid_generate_v4(),
  caso_id uuid references casos_clinicos(id) on delete cascade,
  nombre text not null,
  url_archivo text not null,
  tipo text,
  categoria text,
  tamano text,
  created_at timestamptz not null default now()
);

-- resoluciones table
create table if not exists resoluciones (
  id uuid primary key default uuid_generate_v4(),
  estudiante_id uuid references profiles(id) on delete cascade,
  caso_id uuid references casos_clinicos(id) on delete cascade,
  diagnostico text,
  plan_terapeutico text,
  justificacion text,
  estatus text,
  fecha_entrega timestamptz not null default now()
);

-- evaluaciones table
create table if not exists evaluaciones (
  id uuid primary key default uuid_generate_v4(),
  resolucion_id uuid references resoluciones(id) on delete cascade,
  instructor_id uuid references profiles(id) on delete set null,
  calificacion numeric,
  retroalimentacion text,
  rubrica_detalle jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_casos_categoria on casos_clinicos(categoria);
create index if not exists idx_casos_instructor on casos_clinicos(instructor_id);
create index if not exists idx_resoluciones_estudiante on resoluciones(estudiante_id);

-- Seed minimal data (useful for dev). Replace emails/ids as needed.
-- Insert a sample instructor and student
insert into profiles (email, full_name, role) values
('instructor@example.com', 'Dr. Mendez', 'instructor'),
('estudiante@example.com', 'Alejandro Ortiz', 'student')
on conflict (email) do nothing;

-- Insert a sample clinical case
insert into casos_clinicos (instructor_id, titulo, descripcion_inicial, categoria, nivel, tiempo_estimado, estatus)
select p.id, 'Caso muestra: Dolor abdominal', 'Paciente con dolor abdominal agudo de 24 horas', 'Gastroenterología', 'Intermedio', '30 min', 'Publicado'
from profiles p where p.email = 'instructor@example.com'
on conflict do nothing;

-- Create a sample resolution for the student
insert into resoluciones (estudiante_id, caso_id, diagnostico, plan_terapeutico, justificacion, estatus)
select s.id, c.id, 'Apendicitis probable', 'Cirugía laparoscópica', 'Signos y síntomas compatibles', 'Enviado'
from profiles s cross join casos_clinicos c
where s.email = 'estudiante@example.com' and c.titulo like 'Caso muestra:%'
on conflict do nothing;
