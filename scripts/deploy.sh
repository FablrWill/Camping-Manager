#!/bin/bash
# deploy.sh — pull latest code, rebuild, restart PM2
# Run this on the Mac mini after MacBook sessions push new code.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="${DATA_DIR:-/Users/lisa/outland-data}"
STANDALONE_DIR="$APP_DIR/.next/standalone"

export PATH="/opt/homebrew/bin:$PATH"

echo "=== Outland OS Deploy ==="
echo "App:  $APP_DIR"
echo "Data: $DATA_DIR"
echo ""

cd "$APP_DIR"

# 1. Pull latest
echo "[1/6] Pulling latest code..."
git pull origin main

# 2. Install dependencies
echo "[2/6] Installing dependencies..."
npm ci --prefer-offline 2>/dev/null || npm install

# 3. Apply any new migrations (never drops data)
echo "[3/6] Applying database migrations..."
DATABASE_URL="file:${DATA_DIR}/db.sqlite" npx prisma migrate deploy

# 4. Build
echo "[4/6] Building..."
npm run build

# 5. Wire standalone static assets
echo "[5/6] Wiring standalone assets..."
cp -r "$APP_DIR/public" "$STANDALONE_DIR/public"
cp -r "$APP_DIR/.next/static" "$STANDALONE_DIR/.next/static"

# Wire photos dir (symlink so new uploads go to persistent storage)
PHOTOS_LINK="$STANDALONE_DIR/public/photos"
if [ ! -L "$PHOTOS_LINK" ]; then
  mkdir -p "$DATA_DIR/photos"
  ln -sfn "$DATA_DIR/photos" "$PHOTOS_LINK"
  echo "  Photos symlinked → $DATA_DIR/photos"
fi

# 6. Restart PM2
echo "[6/6] Restarting PM2..."
pm2 restart outland --update-env
pm2 save --force

echo ""
echo "=== Deploy complete ==="
pm2 list
