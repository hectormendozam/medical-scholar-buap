-- Migration: Add missing columns to clinical_cases for full case metadata.
-- Run this in Supabase SQL Editor as project owner.

ALTER TABLE public.clinical_cases
  ADD COLUMN IF NOT EXISTS category         text,
  ADD COLUMN IF NOT EXISTS level            text,
  ADD COLUMN IF NOT EXISTS tags             text[],
  ADD COLUMN IF NOT EXISTS antecedentes     text,
  ADD COLUMN IF NOT EXISTS consejo_mentor   text,
  ADD COLUMN IF NOT EXISTS instructor_id    uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS tiempo_estimado  text;
