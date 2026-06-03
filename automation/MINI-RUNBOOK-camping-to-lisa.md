# Mini Runbook — wire Camping Manager into LisaBrain (`source='camping'`)

**Audience:** a Claude Code instance running **on the Mac Mini (`lisa-mini`, user `lisa`)**.
**Goal:** make Outland OS (this camping app) a live LisaBrain memory subsystem, the same way `find-will-a-job` is. When done, Will's post-trip debriefs flow automatically into Lisa's `memories` table and surface in recall / morning brief / Hermes / the `me.episodes` profile facet.
**Author of the plan:** prior Claude session on Will's MacBook, 2026-06-03. Full rationale: `automation/../` → see also `~/Developer/UNIFY-camping-into-lisa.md` on the MacBook (not on the Mini).

---

## 0. What's already been built (do NOT rebuild)

On the MacBook and pushed to GitHub:
- **`automation/remember_camping.py`** (this repo) — reads new `TripFeedback` rows from Outland's SQLite, formats each post-trip debrief, and stores it in LisaBrain as `source='camping'`. Idempotent via a ledger at `~/.lisabrain/camping_state.json`.
- **`automation/launchd/com.lisaos.camping-capture.plist`** (this repo) — the scheduled job that runs the script hourly. **Reference copy — paths must be verified before loading.**
- **In the `lisabrain` repo:** the `me.episodes` facet now includes `camping` in its `boost_sources`, and `CLAUDE.md` documents Camping Manager as a sibling subsystem.

**Your job is the deployment + verification only.** Don't modify the bridge logic or the facet unless a step below fails and the fix is clearly in scope.

---

## 1. Safety rules (read before doing anything)

- **Outland is a live app with Will's real data.** This task is *additive*. NEVER run `prisma migrate dev`, `prisma db push`, or `db:reset` here; NEVER write to or alter `~/outland-data/db.sqlite`. The bridge opens that DB **read-only** — keep it that way.
- **A manual run is NOT proof the job is live.** The job is only "live" once the *scheduled* launchd run fires and writes a row + log on its own (Phase D). Verify via the scheduler's own path.
- **If any verification step fails, STOP** and report output to Will. Do not improvise around a failure or load the job on top of a broken dry-run.

---

## 2. Get the latest code onto the Mini

```bash
# LisaBrain (Mini pull target is ~/Projects/lisabrain — pull = deploy)
cd ~/Projects/lisabrain && git pull

# Camping Manager (this repo) — confirm where it lives on the Mini first:
ls -d ~/"Camping Manager" ~/outland 2>/dev/null
cd ~/"Camping Manager" && git pull        # adjust if the Mini's copy is elsewhere
```
Record the absolute repo path you pulled into — call it **`$CAMP`** (e.g. `/Users/lisa/Camping Manager`). You'll need it for the plist.

---

## 3. Resolve the two machine-specific values

**(a) The Python interpreter** — must be the venv that has `lisabrain` installed (the same one Lisa's other jobs use):
```bash
grep -A2 ProgramArguments ~/Library/LaunchAgents/com.lisaos.facet-summary.plist
```
Take the python path it prints — call it **`$LISA_PY`** (expected: `/Users/lisa/lisaos-env/bin/python3`, but **use whatever that command shows**).

Confirm it can import lisabrain:
```bash
"$LISA_PY" -c "import lisabrain.write, dotenv; print('ok')"
```
Must print `ok`. If it errors, the wrong interpreter was chosen — find the one an existing working job uses and retry.

**(b) Preconditions exist:**
```bash
ls -l ~/outland-data/db.sqlite     # Outland's real DB (script reads it read-only)
ls -l ~/.env.lisaos                # supplies OPENAI_API_KEY + Postgres DATABASE_URL
```
Both must exist. If `~/outland-data/db.sqlite` is elsewhere, set `OUTLAND_DB=/correct/path` in the env when running and in the plist (add an `EnvironmentVariables` dict).

---

## 4. Phase B — Dry-run the bridge by hand (pre-flight)

> ⚠️ **Backfill notice:** the first successful run emits **every existing** `TripFeedback` debrief into Lisa (one-time). That is intended. If Will wants only go-forward capture, ask him first; to skip the backfill, pre-seed the ledger with the current ids before running (ask Will / see note at bottom).

```bash
"$LISA_PY" "$CAMP/automation/remember_camping.py"
```
Expect lines like `[remember_camping] stored id=… trip='…'` and a final `done — N new debrief(s) emitted`.

Confirm rows landed (read `DATABASE_URL` from `~/.env.lisaos` if not already exported):
```bash
source ~/.env.lisaos 2>/dev/null
psql "$DATABASE_URL" -c "SELECT count(*), max(created_at) FROM memories WHERE source='camping';"
```
Count must be ≥ the number of debriefs that existed. Run the script **a second time** — it should report `0 new` (idempotency check). If it re-emits, STOP (ledger isn't working).

**Only proceed if the dry-run + idempotency check both pass.**

---

## 5. Phase C — Install the scheduled job

1. Copy the reference plist into LaunchAgents and fix the two paths to match `$LISA_PY` and `$CAMP`:
   ```bash
   cp "$CAMP/automation/launchd/com.lisaos.camping-capture.plist" \
      ~/Library/LaunchAgents/com.lisaos.camping-capture.plist
   ```
   Then edit `~/Library/LaunchAgents/com.lisaos.camping-capture.plist` so the two `<string>` entries under `ProgramArguments` are exactly `$LISA_PY` and `$CAMP/automation/remember_camping.py`. (Leave `StartInterval` at 3600 = hourly unless Will asks otherwise.)

2. Validate the plist parses, then load it:
   ```bash
   plutil -lint ~/Library/LaunchAgents/com.lisaos.camping-capture.plist
   launchctl load ~/Library/LaunchAgents/com.lisaos.camping-capture.plist
   launchctl list | grep camping-capture      # label should appear
   ```
   `RunAtLoad` means it runs once immediately on load.

---

## 6. Phase D — Verify it's truly live

1. Confirm the **scheduled** run actually executed (not just your manual run):
   ```bash
   tail -20 ~/Library/Logs/camping-capture.log
   ```
   Should show a `[remember_camping] … done` line timestamped at/after load.
2. Confirm exit health: `launchctl list | grep camping-capture` — the first column (last exit status) should be `0`.
3. Surface check: ask Hermes on Telegram `/recall camping` (or "what do you know about my camping trips?") — camping debriefs should come back. The 2am `com.lisaos.facet-summary` run will also fold them into the `me.episodes` facet.

---

## 7. Definition of done

- [ ] Both repos pulled on the Mini.
- [ ] `$LISA_PY` imports `lisabrain` and `dotenv`.
- [ ] Manual run emitted debriefs; second run reported `0 new` (idempotent).
- [ ] `memories` has `source='camping'` rows.
- [ ] `com.lisaos.camping-capture` loaded; `plutil -lint` clean.
- [ ] Scheduled run logged a successful execution (exit status 0).
- [ ] `/recall camping` in Hermes returns camping content.

Report the final `memories` camping count + the log tail to Will, then stop. (Live read-tools over Outland's HTTP API — "step b" — are a separate future task; not in scope here.)

---

### Appendix — skip the one-time backfill (only if Will asks)
To capture only *future* debriefs, seed the ledger with the ids that already exist so the first run treats them as seen:
```bash
source ~/.env.lisaos 2>/dev/null
mkdir -p ~/.lisabrain
python3 - "$HOME/outland-data/db.sqlite" <<'PY'
import json, sqlite3, sys, datetime, pathlib
db = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
ids = [str(r[0]) for r in db.execute("SELECT id FROM TripFeedback")]
out = pathlib.Path.home()/".lisabrain"/"camping_state.json"
out.write_text(json.dumps({"emitted_ids": sorted(ids),
    "updated_at": datetime.datetime.now().isoformat()}, indent=2))
print(f"seeded {len(ids)} ids into {out}")
PY
```
