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

Or from npm on Windows:

```powershell
$env:SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?sslmode=require"
npm run backup:supabase
```

Backups are written to `./backups/` and are ignored by git.

## Automatic Backups

For DigitalOcean production, install PostgreSQL client tools so `pg_dump` is available, then set these environment variables:

```bash
SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?sslmode=require"
NEXAGO_AUTO_SUPABASE_BACKUP="1"
NEXAGO_SUPABASE_BACKUP_INTERVAL_MIN="1440"
NEXAGO_SUPABASE_BACKUP_RETENTION="14"
NEXAGO_SUPABASE_BACKUP_DIR="./backups"
```

When `NEXAGO_AUTO_SUPABASE_BACKUP=1`, `server/relay.mjs` starts an automatic backup scheduler:

- First backup runs shortly after the server starts.
- Next backups run every `NEXAGO_SUPABASE_BACKUP_INTERVAL_MIN` minutes.
- Backups are compressed as `nexago_supabase_YYYYMMDD_HHMMSS.sql.gz`.
- Only the newest `NEXAGO_SUPABASE_BACKUP_RETENTION` files are kept.
- If `SUPABASE_DB_URL` or `pg_dump` is missing, the app keeps running and logs the backup problem.

## Offline Queue Coverage

The web app keeps working locally if the network drops:

- POS/order writes are queued in `nexago_offline_order_queue_v1`.
- Full shared state snapshots are queued in `nexago_offline_state_queue_v1`.
- When the browser comes online, when the tab becomes visible, and every retry interval, the queue is pushed back to `/api/order` and `/api/state`.
- The server merges orders/products/stores/payments/staff records by ID, so queued updates do not replace unrelated store data.

Do not clear browser storage while offline unless the queue has already synced.

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
