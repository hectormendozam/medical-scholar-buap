-- Migration: Create storage buckets and policies for case files and chat attachments.
-- Run this in Supabase SQL Editor as project owner.

-- 1. Create the buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-files', 'case-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage policies for case-files
DROP POLICY IF EXISTS "case_files_read"   ON storage.objects;
DROP POLICY IF EXISTS "case_files_insert" ON storage.objects;

CREATE POLICY "case_files_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'case-files');

CREATE POLICY "case_files_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'case-files');

-- 3. Storage policies for message-attachments
DROP POLICY IF EXISTS "msg_attachments_read"   ON storage.objects;
DROP POLICY IF EXISTS "msg_attachments_insert" ON storage.objects;

CREATE POLICY "msg_attachments_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'message-attachments');

CREATE POLICY "msg_attachments_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'message-attachments');

-- 4. Make sure case_files table exists for storing file metadata
CREATE TABLE IF NOT EXISTS public.case_files (
  id          bigserial PRIMARY KEY,
  case_id     bigint NOT NULL,
  file_name   text NOT NULL,
  file_url    text NOT NULL,
  mime        text,
  size        bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.case_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_case_files"   ON public.case_files;
DROP POLICY IF EXISTS "authenticated_insert_case_files" ON public.case_files;

CREATE POLICY "authenticated_read_case_files"
  ON public.case_files FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "authenticated_insert_case_files"
  ON public.case_files FOR INSERT
  TO authenticated WITH CHECK (uploaded_by = auth.uid());
