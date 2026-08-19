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
