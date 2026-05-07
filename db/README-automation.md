Automating seed & migration execution

This folder contains scripts and SQL to migrate and seed a Supabase project in staging.

Quick usage (SQL mode - recommended):

1) Ensure you have a DATABASE_URL environment variable pointing to your Supabase Postgres (owner privileges recommended):

   export DATABASE_URL="postgres://<user>:<password>@<host>:5432/<database>"

2) Run SQL mode (executes migration + triggers + seed that creates auth.users then other rows):

   ./db/run_seed.sh sql

CSV mode (alternative):
- Place CSV files in db/csv (already included in repo) and run:

   ./db/run_seed.sh csv

Notes & caveats:
- Running SQL mode executes inserts into `auth.users`. Only run in staging or with admin privileges. Avoid running on production unless you know what you are doing.
- CSV import uses psql's \copy; ensure the machine running the script can access the CSV files and the database.
- If RLS policies block inserts, run SQL from the Supabase SQL editor (owner) instead of via remote psql.

Troubleshooting:
- If you get FK errors on `public.profiles`, ensure `auth.users` rows exist for the profile ids (seed_full_with_auth.sql does this automatically).
- If \copy fails with permission issues, run the imports from the Postgres host or via the SQL editor's import tooling.
