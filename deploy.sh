#!/usr/bin/env bash
# deploy.sh -- One-command production deploy for Outland OS
# Usage: ssh mac-mini 'cd ~/outland && ./deploy.sh'
# Safety: set -e exits on build failure -- PM2 keeps running old version
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="${HOME}/outland-data"

cd "$APP_DIR"

echo "==> Pulling latest code..."
git pull --ff-only

echo "==> Installing dependencies (devDeps needed for build)..."
npm install

echo "==> Ensuring data directories exist..."
mkdir -p "$DATA_DIR"/{photos,backups,logs}

echo "==> Bumping service worker cache version..."
DEPLOY_TS=$(date +%Y%m%d%H%M%S)
sed -i '' "s/outland-shell-v[0-9a-zA-Z_-]*/outland-shell-v${DEPLOY_TS}/g" public/sw.js
sed -i '' "s/tile-cache-v[0-9a-zA-Z_-]*/tile-cache-v${DEPLOY_TS}/g" public/sw.js

echo "==> Running database migrations..."
DATABASE_URL="file:${DATA_DIR}/db.sqlite" npx prisma migrate deploy

echo "==> Building standalone output..."
npm run build

echo "==> Wiring static assets into standalone build..."
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

echo "==> Linking persistent photo storage..."
ln -sfn "$DATA_DIR/photos" .next/standalone/public/photos

echo "==> Patching server.js hostname binding (Next.js bug workaround)..."
if grep -q "hostname: 'localhost'" .next/standalone/server.js 2>/dev/null; then
  sed -i '' "s/hostname: 'localhost'/hostname: process.env.HOSTNAME || '0.0.0.0'/" .next/standalone/server.js
  echo "    Patched: localhost -> 0.0.0.0"
else
  echo "    No patch needed"
fi

echo "==> Restarting PM2 service..."
pm2 restart outland --env production || pm2 start ecosystem.config.js --env production
pm2 save

echo "==> Deploy complete at $(date)"
echo "    App: http://localhost:3000"
echo "    Health: http://localhost:3000/api/health"
