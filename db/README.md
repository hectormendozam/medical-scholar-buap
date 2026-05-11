This folder contains SQL migrations and helper scripts for the Supabase project.

To apply a migration manually in the Supabase project:

1. Open your Supabase project > SQL Editor.
2. Create a new query and paste the contents of the migration file, for example `2026_05_08_add_optional_case_columns.sql`.
3. Run the query as the project owner (role `postgres` or an owner account) to ensure ALTER TABLE and CREATE INDEX succeed.

Note: These migrations are written to be idempotent (they check information_schema before altering). If you prefer automation, you can run them via `db/run_seed.sh` with a DATABASE_URL that points to a project owner.
