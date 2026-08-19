# Backup And Restore

This project must not store database passwords in git. Put the database URL in environment variables only.

## Supabase Backup

Set:

```bash
export SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?sslmode=require"
```

Run:

```bash
bash scripts/backup-supabase.sh
```

On Windows PowerShell:

```powershell
$env:SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?sslmode=require"
.\scripts\backup-supabase.ps1
```

Backups are written to `./backups/` and are ignored by git.

## Restore

Use a clean database or restore into a maintenance window.

```bash
gunzip -c backups/nexago_supabase_YYYYMMDD_HHMMSS.sql.gz | psql "$SUPABASE_DB_URL"
```

## Production Rules

- Enable Supabase Point-in-Time Recovery when available.
- Keep at least one off-server backup copy.
- Test restore on a separate database before trusting backups.
- Never commit `.env`, database URLs, service-role keys, or backup files.
