# Mac Mini Setup Guide — Outland OS

One-time setup to run Outland OS in production on the Mac mini.

---

## Prerequisites

- Node.js 20 LTS installed (`node --version` → `v20.x.x`)
- git installed
- Apple ID signed into the Messages app (required for iMessage alerts)
- Tailscale installed and connected (for remote access)

---

## Step 1 — Create data directory

All persistent data (database, photos, backups, logs) lives in `~/outland-data/`.

```bash
sudo mkdir -p ~/outland-data
sudo chown -R $(whoami) ~/outland-data
mkdir -p ~/outland-data/{photos,backups,logs}
```

---

## Step 2 — Clone the repo

```bash
git clone <repo-url> ~/outland
cd ~/outland
```

---

## Step 3 — Create production .env

```bash
cp .env.example .env
```

Edit `.env` and set these production values (all required):

```bash
# Database — absolute path on Mac mini
DATABASE_URL="file:~/outland-data/db.sqlite"

# Photos
PHOTOS_DIR=~/outland-data/photos

# Health endpoint backup check
DATA_DIR=~/outland-data

# iMessage alerts — your actual phone number
NOTIFY_NUMBER=+1XXXXXXXXXX

# AI features (required)
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
VOYAGE_API_KEY=your_key_here

# Gmail (float plan email)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
```

---

## Step 4 — Install PM2

```bash
npm install -g pm2
```

---

## Step 5 — Migrate existing photos (REQUIRED)

**Do not skip this step if photos exist in the dev environment.** Photos in the database are referenced by filename — they must be present at `~/outland-data/photos/` before the app starts, or photo URLs will return 404.

From your MacBook, copy photos to the Mac mini:

```bash
rsync -avz public/photos/ mac-mini:~/outland-data/photos/
```

If this is a fresh install with no photos, skip to Step 6.

---

## Step 6 — First deploy

```bash
chmod +x deploy.sh scripts/*.sh
./deploy.sh
```

The deploy script will:
1. Pull latest code
2. Install dependencies
3. Bump service worker cache version
4. Run database migrations
5. Build standalone Next.js output
6. Wire static assets into the build
7. Link `~/outland-data/photos` into the build
8. Start the app via PM2

---

## Step 7 — Set up PM2 boot persistence

PM2 must survive reboots. On macOS this uses launchd.

```bash
pm2 startup
# Copy-paste the exact sudo command it outputs and run it
pm2 save
```

The generated plist lives at `~/Library/LaunchAgents/`. After reboots, the app starts automatically.

---

## Step 8 — Set up cron for backups and crash watchdog

```bash
crontab -e
```

Add these two lines:

```
0 2 * * * ~/outland/scripts/outland-backup.sh >> ~/outland-data/logs/backup.log 2>&1
*/5 * * * * ~/outland/scripts/outland-watchdog.sh 2>/dev/null
```

- **Backup** runs daily at 2am, creates `~/outland-data/backups/db-YYYYMMDD.sqlite`
- **Watchdog** checks every 5 minutes if PM2 has restarted the app and sends an iMessage alert if so

---

## Step 9 — Test iMessage notifications

```bash
osascript -e 'tell application "Messages" to send "Outland setup test" to buddy "+1XXXXXXXXXX"'
```

You should receive the message on your phone within a few seconds. If not, check that the Messages app is signed in with your Apple ID.

---

## Step 10 — Verify everything works

```bash
# App is running
pm2 list

# Health check (bookmark this on your phone)
curl http://localhost:3000/api/health
# → {"status":"ok","uptime":42,"lastBackup":null,"timestamp":"..."}

# PM2 details
pm2 show outland
# Check: exec_mode = fork, status = online, log paths = ~/outland-data/logs/

# Photo check — open any photo URL in the browser
# http://localhost:3000 or your Tailscale hostname
```

---

## Subsequent deploys

From your MacBook:

```bash
ssh mac-mini 'cd ~/outland && ./deploy.sh'
```

That's it. The script handles everything: pull, build, migrate, restart.

---

## Troubleshooting

**App not accessible from Tailscale**
- Confirm `HOSTNAME=0.0.0.0` is in the PM2 env (check `ecosystem.config.js`)
- Check `pm2 show outland` — confirm `HOSTNAME` is in the env section
- The deploy script patches `server.js` if Next.js hardcodes `localhost`

**Photos showing as broken images**
- Run the rsync migration (Step 5) if you skipped it
- Check the symlink: `ls -la .next/standalone/public/photos` → should point to `~/outland-data/photos`
- Re-run `./deploy.sh` to recreate the symlink if missing

**PM2 not starting after reboot**
- Run `pm2 save` again to persist the current process list
- Check `launchctl list | grep pm2` to confirm the launchd agent is registered

**Backup iMessage not arriving**
- Confirm Messages app is signed in with Apple ID
- Test manually: `~/outland/scripts/outland-backup.sh`
- Check `~/outland-data/logs/backup.log` for errors
- Verify `NOTIFY_NUMBER` is set correctly in `.env`

**Build fails during deploy**
- The old version keeps running (deploy.sh uses `set -euo pipefail`)
- Check the error output, fix the issue on your MacBook, push, and re-deploy
