-- Migration: Fix notifications RLS so teachers can send notifications to any user.
-- Run this in Supabase SQL Editor as project owner.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "users_insert_own_notifications"  ON public.notifications;
DROP POLICY IF EXISTS "users_read_own_notifications"    ON public.notifications;
DROP POLICY IF EXISTS "authenticated_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "authenticated_read_notifications"   ON public.notifications;

-- Any authenticated user can read their own notifications
CREATE POLICY "users_read_own_notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Any authenticated user can insert notifications for ANY user
-- (needed so teachers can broadcast to students)
CREATE POLICY "authenticated_insert_notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
