#!/usr/bin/env bash
set -euo pipefail

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required but not installed. Install PostgreSQL client tools and retry." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL (postgresql://user:pass@host:port/dbname) before running this script." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-backups}"
mkdir -p "${BACKUP_DIR}"

STAMP="$(date -u +"%Y%m%d-%H%M%S")"
FILE="${BACKUP_DIR}/university-erp-${STAMP}.sql"

echo "Creating backup ${FILE}"
pg_dump "${DATABASE_URL}" --no-owner --format=plain --file "${FILE}"

echo "Backup complete."
