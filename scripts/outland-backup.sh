#!/usr/bin/env bash
# outland-backup.sh -- Daily SQLite backup with iMessage failure alert
# Install: crontab -e -> 0 2 * * * ~/outland/scripts/outland-backup.sh >> ~/outland-data/logs/backup.log 2>&1
set -euo pipefail

DB="${HOME}/outland-data/db.sqlite"
BACKUP_DIR="${HOME}/outland-data/backups"
TIMESTAMP=$(date +%Y%m%d)
BACKUP_FILE="${BACKUP_DIR}/db-${TIMESTAMP}.sqlite"
LOG_PREFIX="[backup $(date '+%Y-%m-%d %H:%M:%S')]"

# Load notification number from app .env if available
NOTIFY_NUMBER="${NOTIFY_NUMBER:-}"
if [ -z "$NOTIFY_NUMBER" ] && [ -f "$HOME/outland/.env" ]; then
  NOTIFY_NUMBER=$(grep '^NOTIFY_NUMBER=' "$HOME/outland/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' || true)
fi

mkdir -p "$BACKUP_DIR"

send_alert() {
  local message="$1"
  if [ -n "$NOTIFY_NUMBER" ]; then
    osascript -e "tell application \"Messages\" to send \"${message}\" to buddy \"${NOTIFY_NUMBER}\"" 2>/dev/null || echo "${LOG_PREFIX} WARNING: iMessage send failed"
  else
    echo "${LOG_PREFIX} WARNING: No NOTIFY_NUMBER set -- cannot send iMessage alert"
  fi
}

if [ ! -f "$DB" ]; then
  echo "${LOG_PREFIX} ERROR: Database not found at ${DB}"
  send_alert "Outland backup FAILED: database not found at ${DB}"
  exit 1
fi

if sqlite3 "$DB" ".backup '${BACKUP_FILE}'"; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "${LOG_PREFIX} OK: ${BACKUP_FILE} (${SIZE})"
else
  echo "${LOG_PREFIX} ERROR: sqlite3 .backup failed"
  send_alert "Outland backup FAILED on $(date '+%Y-%m-%d %H:%M')"
  exit 1
fi
