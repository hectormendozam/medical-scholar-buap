-- Add optional profile columns for specialty, level and institution
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS institution text;

-- Example backfill: set specialty/institution for a given email
UPDATE public.profiles p
SET specialty = 'Medicina Interna',
    level = 'Residente R2',
    institution = 'Hospital Universitario BUAP'
WHERE p.email = 'andres@gmail.com';
