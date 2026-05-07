-- Safe RLS policy for `evaluaciones` so instructors can insert/update their own evaluations

-- Ensure the function current_user_role exists (bd_superbase already defines it in schema)

-- Allow authenticated users to select evaluations (so instructors and students can view relevant data)
create policy "select evaluations for authenticated" on public.evaluaciones for select
  to authenticated
  using (true);

-- Allow instructors to insert evaluations where instructor_id = auth.uid()
create policy "instructors insert their evaluations" on public.evaluaciones for insert
  to authenticated
  with check (instructor_id = auth.uid() and exists (select 1 from public.roles r join public.profiles p on p.role_id = r.id where p.id = auth.uid() and r.name = 'instructor'));

-- Allow instructors to update evaluations they authored
create policy "instructors update own evaluations" on public.evaluaciones for update
  to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());

-- Note: run these in Supabase SQL editor as a project admin.
