# Database Backup & Restore Guide

These scripts provide a lightweight, optional workflow for backing up and restoring the Supabase PostgreSQL database that powers the ERP.

## Prerequisites

- PostgreSQL client tools (`pg_dump`, `psql`) installed locally.
- `DATABASE_URL` environment variable containing the full connection string. For Supabase, copy the **Connection string** from `Project Settings → Database`.
  ```bash
  export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_HOST.supabase.co:5432/postgres?sslmode=require"
  ```

## Creating a Backup

```bash
./scripts/db-backup.sh
```

- Backs up to `backups/university-erp-<timestamp>.sql` (directory auto-created).
- Override output directory by setting `BACKUP_DIR=/path/to/backups ./scripts/db-backup.sh`.

## Restoring From a Backup

```bash
./scripts/db-restore.sh backups/university-erp-20251116-120000.sql
```

- Prompts for confirmation before running `psql` against `DATABASE_URL`.
- Restore runs inside a single transaction; abort if errors occur.

## Automation Tips

- Schedule backups via cron/GitHub Actions by exporting `DATABASE_URL` securely (CI secret).
- Copy generated `.sql` files to secure storage (S3, Azure Blob, etc.).
- Test restores regularly in a staging project to verify integrity.
