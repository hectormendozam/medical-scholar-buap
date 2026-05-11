-- Migration: ensure optional case columns exist on both language variants
-- Adds: estimated_minutes, tiempo_estimado, expire_at, course_id and indexes
-- Run as a project owner in Supabase SQL editor

BEGIN;

-- clinical_cases (english)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinical_cases' AND column_name = 'estimated_minutes') THEN
    ALTER TABLE public.clinical_cases ADD COLUMN estimated_minutes integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinical_cases' AND column_name = 'expire_at') THEN
    ALTER TABLE public.clinical_cases ADD COLUMN expire_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinical_cases' AND column_name = 'course_id') THEN
    ALTER TABLE public.clinical_cases ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
  END IF;
END$$;

-- spanish table casos_clinicos if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'casos_clinicos') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'casos_clinicos' AND column_name = 'tiempo_estimado') THEN
      ALTER TABLE public.casos_clinicos ADD COLUMN tiempo_estimado text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'casos_clinicos' AND column_name = 'expire_at') THEN
      ALTER TABLE public.casos_clinicos ADD COLUMN expire_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'casos_clinicos' AND column_name = 'course_id') THEN
      ALTER TABLE public.casos_clinicos ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
    END IF;
  END IF;
END$$;

-- Add index on course_id for faster lookups (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clinical_cases' AND column_name = 'course_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'clinical_cases' AND indexname = 'idx_clinical_cases_course_id') THEN
      CREATE INDEX idx_clinical_cases_course_id ON public.clinical_cases (course_id);
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'casos_clinicos' AND column_name = 'course_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'casos_clinicos' AND indexname = 'idx_casos_clinicos_course_id') THEN
      CREATE INDEX idx_casos_clinicos_course_id ON public.casos_clinicos (course_id);
    END IF;
  END IF;
END$$;

COMMIT;

-- Safe migration end
