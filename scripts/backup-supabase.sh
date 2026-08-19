#!/usr/bin/env bash
set -euo pipefail

# Creates a timestamped Supabase/Postgres backup.
# Do not hardcode passwords here. Set SUPABASE_DB_URL in the server/terminal env.
#
# Example:
#   export SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?sslmode=require"
#   bash scripts/backup-supabase.sh

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install PostgreSQL client tools first." >&2
  exit 1
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "SUPABASE_DB_URL is missing. Set it as an environment variable, not in git." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
FILENAME="$BACKUP_DIR/nexago_supabase_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting Supabase backup..."
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges | gzip -9 > "$FILENAME"

echo "Backup successful: $FILENAME"
