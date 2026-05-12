-- Migration: Add RLS policies for chat_messages so students can send messages.
-- Run this in Supabase SQL Editor as project owner.

BEGIN;

DO $body$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
  ) THEN
    EXECUTE 'ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "authenticated_read_chat_messages"   ON public.chat_messages';
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_insert_chat_messages" ON public.chat_messages';

    -- All authenticated users can read messages
    EXECUTE 'CREATE POLICY "authenticated_read_chat_messages" ON public.chat_messages FOR SELECT TO authenticated USING (true)';

    -- Any authenticated user can send messages (owns the row via user_id)
    EXECUTE 'CREATE POLICY "authenticated_insert_chat_messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())';
  END IF;
END;
$body$;

-- Also allow SELECT/INSERT on message_attachments
DO $body$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'message_attachments'
  ) THEN
    EXECUTE 'ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "authenticated_read_message_attachments"   ON public.message_attachments';
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_insert_message_attachments" ON public.message_attachments';

    EXECUTE 'CREATE POLICY "authenticated_read_message_attachments" ON public.message_attachments FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "authenticated_insert_message_attachments" ON public.message_attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid())';
  END IF;
END;
$body$;

COMMIT;
