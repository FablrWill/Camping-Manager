#!/usr/bin/env bash
# outland-watchdog.sh -- Detect PM2 crash restarts and send iMessage alert
# Install: crontab -e -> */5 * * * * ~/outland/scripts/outland-watchdog.sh 2>/dev/null
set -uo pipefail

SAVED_FILE="${HOME}/outland-data/logs/last_restart_count"

# Load notification number from app .env if available
NOTIFY_NUMBER="${NOTIFY_NUMBER:-}"
if [ -z "$NOTIFY_NUMBER" ] && [ -f "$HOME/outland/.env" ]; then
  NOTIFY_NUMBER=$(grep '^NOTIFY_NUMBER=' "$HOME/outland/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' || true)
fi

# Get current restart count from PM2
RESTARTS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys, json
try:
    procs = json.load(sys.stdin)
    print(sum(p.get('pm2_env', {}).get('restart_time', 0) for p in procs if p.get('name') == 'outland'))
except:
    print('0')
" 2>/dev/null || echo "0")

PREV=$(cat "$SAVED_FILE" 2>/dev/null || echo "0")

# Always save current count
mkdir -p "$(dirname "$SAVED_FILE")"
echo "$RESTARTS" > "$SAVED_FILE"

# Alert if restart count increased
if [ "$RESTARTS" -gt "$PREV" ] 2>/dev/null; then
  MESSAGE="Outland crashed and was restarted by PM2 (restart #${RESTARTS} at $(date '+%H:%M'))"
  if [ -n "$NOTIFY_NUMBER" ]; then
    osascript -e "tell application \"Messages\" to send \"${MESSAGE}\" to buddy \"${NOTIFY_NUMBER}\"" 2>/dev/null || true
  fi
  echo "[watchdog $(date)] ALERT: ${MESSAGE}"
fi
