-- Migration: Add expire_at, notified, files, course_id to casos_clinicos and clinical_cases
-- Run as project admin in Supabase SQL editor
BEGIN;

-- Spanish table
ALTER TABLE IF EXISTS public.casos_clinicos
  ADD COLUMN IF NOT EXISTS expire_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS files jsonb,
  ADD COLUMN IF NOT EXISTS course_id bigint;

-- English table fallback
ALTER TABLE IF EXISTS public.clinical_cases
  ADD COLUMN IF NOT EXISTS expire_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS files jsonb,
  ADD COLUMN IF NOT EXISTS course_id bigint;

COMMIT;

-- Create normalized case_files table (optional but recommended)
BEGIN;
CREATE TABLE IF NOT EXISTS public.case_files (
  id bigserial PRIMARY KEY,
  case_id bigint,
  file_name text,
  file_url text,
  mime text,
  size bigint,
  uploaded_by uuid,
  uploaded_at timestamptz DEFAULT now(),
  CONSTRAINT case_files_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.casos_clinicos(id) ON DELETE CASCADE
);
COMMIT;

-- Note: if you use `clinical_cases` as your canonical table, you may want to add another FK or adapt accordingly.
