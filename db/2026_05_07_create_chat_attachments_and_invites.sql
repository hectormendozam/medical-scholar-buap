-- Migration: create message_attachments table, chat_typing and course_invites

BEGIN;

-- attachments for chat messages
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id bigserial PRIMARY KEY,
  message_id bigint NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  size bigint,
  created_at timestamptz DEFAULT now()
);

-- lightweight typing indicator table
CREATE TABLE IF NOT EXISTS public.chat_typing (
  case_id bigint NOT NULL,
  user_id uuid NOT NULL,
  last_typing_at timestamptz DEFAULT now(),
  PRIMARY KEY (case_id, user_id)
);

-- course invite codes
CREATE TABLE IF NOT EXISTS public.course_invites (
  id bigserial PRIMARY KEY,
  course_id bigint NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  used_by uuid REFERENCES auth.users(id),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

COMMIT;
