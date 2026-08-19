param(
  [string]$BackupDir = ".\backups"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  Write-Error "pg_dump not found. Install PostgreSQL client tools first."
}

if ([string]::IsNullOrWhiteSpace($env:SUPABASE_DB_URL)) {
  Write-Error "SUPABASE_DB_URL is missing. Set it as an environment variable, not in git."
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$filename = Join-Path $BackupDir "nexago_supabase_$timestamp.sql"

Write-Host "Starting Supabase backup..."
pg_dump $env:SUPABASE_DB_URL --no-owner --no-privileges | Out-File -FilePath $filename -Encoding utf8

Write-Host "Backup successful: $filename"
