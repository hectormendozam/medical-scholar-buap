-- Ensure both Spanish and English clinical cases tables have course_id column
-- Use this file in Supabase SQL editor or via db/run_seed.sh

BEGIN;

-- Add course_id to clinical_cases if table exists but column missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinical_cases') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinical_cases' AND column_name = 'course_id') THEN
      ALTER TABLE public.clinical_cases ADD COLUMN course_id bigint;
      RAISE NOTICE 'Added course_id to public.clinical_cases';
    END IF;
  END IF;
END
$$;

-- Also ensure casos_clinicos has course_id (for Spanish schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'casos_clinicos') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casos_clinicos' AND column_name = 'course_id') THEN
      ALTER TABLE public.casos_clinicos ADD COLUMN course_id bigint;
      RAISE NOTICE 'Added course_id to public.casos_clinicos';
    END IF;
  END IF;
END
$$;

-- Add index for performance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinical_cases') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'clinical_cases' AND indexname = 'idx_clinical_cases_course_id') THEN
      CREATE INDEX idx_clinical_cases_course_id ON public.clinical_cases(course_id);
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'casos_clinicos') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'casos_clinicos' AND indexname = 'idx_casos_clinicos_course_id') THEN
      CREATE INDEX idx_casos_clinicos_course_id ON public.casos_clinicos(course_id);
    END IF;
  END IF;
END
$$;

COMMIT;
