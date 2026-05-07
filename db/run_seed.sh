#!/usr/bin/env bash
set -euo pipefail

# run_seed.sh
# Usage: DATABASE_URL=postgres://user:pass@host:5432/db ./db/run_seed.sh [mode]
# mode: sql (default) -> run SQL files in order
#       csv -> import CSV files from db/csv using psql \copy (requires local CSV files present)

MODE=${1:-sql}

# Resolve DATABASE_URL
if [[ -z "${DATABASE_URL:-}" ]]; then
  # allow building from separate PG_* vars
  if [[ -n "${PGHOST:-}" ]]; then
    export DATABASE_URL="postgres://${PGUSER:-postgres}:${PGPASSWORD:-}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE:-postgres}"
  else
    echo "ERROR: DATABASE_URL not set and PGHOST not set. Export DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE." >&2
    exit 1
  fi
fi

PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1)

run_sql_file() {
  local f="$1"
  if [[ ! -f "$f" ]]; then
    echo "Skipping missing $f"
    return
  fi
  echo "--> Running $f"
  "${PSQL[@]}" -f "$f"
}

import_csv() {
  local table="$1"
  local file="$2"
  local cols="$3" # optional column list
  if [[ ! -f "$file" ]]; then
    echo "Skipping missing CSV $file"
    return
  fi
  echo "--> Importing $file into $table"
  if [[ -n "$cols" ]]; then
    "${PSQL[@]}" -c "\\copy $table($cols) FROM '$file' CSV HEADER;"
  else
    "${PSQL[@]}" -c "\\copy $table FROM '$file' CSV HEADER;"
  fi
}

if [[ "$MODE" == "sql" ]]; then
  echo "Running SQL seed mode"
  run_sql_file "db/migrate_cases_add_expiry_and_files.sql"
  run_sql_file "db/alter_notifications_add_targets.sql"
  run_sql_file "db/notifications_distribute_course.sql"
  run_sql_file "db/2026_05_07_create_chat_attachments_and_invites.sql"
  run_sql_file "db/case_expiry_notify_pg_cron.sql"
  run_sql_file "db/seed_full_with_auth.sql"
  echo "Done. Review output above for any errors."
  exit 0
fi

if [[ "$MODE" == "csv" ]]; then
  echo "Running CSV import mode (requires CSV files in db/csv)
  Ensure your DATABASE_URL points to the correct DB and you have permissions."

  import_csv public.courses "db/csv/courses.csv" "id,name,description,created_by,is_active,created_at,updated_at"
  import_csv public.profiles "db/csv/profiles.csv" "id,full_name,email,role_id,is_active,created_at,updated_at"
  import_csv public.course_members "db/csv/course_members.csv" "id,course_id,user_id,joined_at"
  import_csv public.clinical_cases "db/csv/clinical_cases.csv" "id,title,description,initial_information,clinical_history,symptoms,status,created_by,published_at,created_at,updated_at"
  import_csv public.case_assignments "db/csv/case_assignments.csv" "id,case_id,course_id,assigned_by,assigned_at"
  import_csv public.case_files "db/csv/case_files.csv" "id,case_id,uploaded_by,file_name,file_url,file_type,created_at"
  import_csv public.chat_messages "db/csv/chat_messages.csv" "id,case_id,user_id,message,created_at"
  import_csv public.message_attachments "db/csv/message_attachments.csv" "id,message_id,uploaded_by,file_name,file_url,file_type,created_at"
  import_csv public.tasks "db/csv/tasks.csv" "id,case_id,title,description,status,created_by,created_at"
  import_csv public.task_assignees "db/csv/task_assignees.csv" "id,task_id,user_id,assigned_at"
  import_csv public.rubrics "db/csv/rubrics.csv" "id,case_id,title,created_by,created_at"
  import_csv public.rubric_criteria "db/csv/rubric_criteria.csv" "id,rubric_id,name,description,max_score"
  import_csv public.evaluations "db/csv/evaluations.csv" "id,case_id,evaluator_id,evaluated_user_id,general_comment,total_score,created_at"
  import_csv public.evaluation_scores "db/csv/evaluation_scores.csv" "id,evaluation_id,criteria_id,score,comment"
  import_csv public.case_feedback "db/csv/case_feedback.csv" "id,case_id,instructor_id,user_id,feedback,feedback_type,created_at"
  import_csv public.notifications "db/csv/notifications.csv" "id,user_id,case_id,title,message,is_read,created_at"
  import_csv public.activity_logs "db/csv/activity_logs.csv" "id,user_id,case_id,action,details,created_at"

  echo "CSV import complete."
  exit 0
fi

echo "Unknown mode: $MODE. Use 'sql' or 'csv'"
exit 2
