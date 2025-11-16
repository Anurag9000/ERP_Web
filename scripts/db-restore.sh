#!/usr/bin/env bash
set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required but not installed. Install PostgreSQL client tools and retry." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL (postgresql://user:pass@host:port/dbname) before running this script." >&2
  exit 1
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 path/to/backup.sql" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file ${BACKUP_FILE} not found." >&2
  exit 1
fi

read -p "This will overwrite data in ${DATABASE_URL}. Continue? (y/N) " confirm
if [[ ! "${confirm}" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

echo "Restoring ${BACKUP_FILE}..."
psql "${DATABASE_URL}" --single-transaction --file "${BACKUP_FILE}"
echo "Restore complete."
