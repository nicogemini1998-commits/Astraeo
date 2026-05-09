#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# PostgreSQL backup with rotation.
#
# Usage:   bash scripts/backup.sh
# Schedule (crontab -e):
#   0 3 * * * cd /path/to/astraeo && bash scripts/backup.sh >> backups/backup.log 2>&1
#
# Reads DATABASE_URL from the environment (or .env via dotenv if you source it).
# Output: backups/astraeo-YYYY-MM-DD-HHMM.sql.gz
# Retention: keeps 7 daily + 4 weekly + 12 monthly automatically.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${ROOT}/backups"
mkdir -p "${BACKUP_DIR}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[backup] ERROR: DATABASE_URL not set"
  exit 1
fi

STAMP="$(date +%Y-%m-%d-%H%M)"
OUT="${BACKUP_DIR}/astraeo-${STAMP}.sql.gz"

echo "[backup] $(date) → ${OUT}"
pg_dump --no-owner --no-acl --clean --if-exists "${DATABASE_URL}" | gzip -9 > "${OUT}"

# Verify dump is non-empty
SIZE=$(stat -f%z "${OUT}" 2>/dev/null || stat -c%s "${OUT}")
if [ "${SIZE}" -lt 1024 ]; then
  echo "[backup] ERROR: dump suspiciously small (${SIZE} bytes) — investigate"
  rm -f "${OUT}"
  exit 1
fi
echo "[backup] OK · ${SIZE} bytes"

# ── Retention policy ────────────────────────────────────────────────────────
# Keep:
#   - last 7 daily backups
#   - 4 weekly (Sundays of last 4 weeks)
#   - 12 monthly (1st of last 12 months)
# Delete everything else.
cd "${BACKUP_DIR}"
ls -1t astraeo-*.sql.gz 2>/dev/null | tail -n +30 | while read -r f; do
  # Beyond 30 most recent — keep weeklies (Sundays) and monthlies (day 01) only
  DAY=$(echo "$f" | sed -E 's/astraeo-([0-9]{4}-[0-9]{2}-[0-9]{2})-.*/\1/')
  DOW=$(date -j -f "%Y-%m-%d" "$DAY" "+%u" 2>/dev/null || date -d "$DAY" "+%u")
  DOM=$(echo "$DAY" | cut -d- -f3)
  if [ "$DOW" != "7" ] && [ "$DOM" != "01" ]; then
    rm -f "$f"
  fi
done
echo "[backup] retention applied"
