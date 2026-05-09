#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# PostgreSQL restore from a gzipped pg_dump file.
#
# Usage:  bash scripts/restore.sh backups/astraeo-2026-05-09-0300.sql.gz
#
# Requires DATABASE_URL set. Will REPLACE existing data — confirms first.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  exit 1
fi
FILE="$1"
[ -f "$FILE" ] || { echo "[restore] ERROR: $FILE not found"; exit 1; }
[ -n "${DATABASE_URL:-}" ] || { echo "[restore] ERROR: DATABASE_URL not set"; exit 1; }

echo "⚠️  About to REPLACE current database with: $FILE"
echo "    Target: $(echo "$DATABASE_URL" | sed -E 's#://[^@]+@#://***@#')"
read -r -p "Type 'YES' to proceed: " CONFIRM
[ "$CONFIRM" = "YES" ] || { echo "Aborted"; exit 1; }

echo "[restore] $(date) → restoring from $FILE"
gunzip -c "$FILE" | psql "$DATABASE_URL"
echo "[restore] OK"
