If you want to persist additional profile fields (specialty, level, institution) run the SQL in `add_profile_columns.sql` in your Supabase SQL editor.

1) Open Supabase Studio > SQL Editor
2) Paste the contents of `db/add_profile_columns.sql` and run it.

This will add the columns to `public.profiles` safely (IF NOT EXISTS). After running the ALTER, your profile edits in the UI will persist these fields.

Note: Backfill example included in the SQL file shows how to set values for a profile by email.