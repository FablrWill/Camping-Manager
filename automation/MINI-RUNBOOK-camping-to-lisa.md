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

## 4. Phase B — Seed for go-forward-only, then dry-run

**Decision (Will, 2026-06-03): GO-FORWARD ONLY — do NOT backfill.** Will has one historical trip; he does not want its debrief imported. So we seed the ledger with all existing `TripFeedback` ids *first*, so the bridge treats them as already-seen and only emits **future** debriefs.

**1. Seed the ledger** (marks every current debrief as already-emitted):
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
print(f"seeded {len(ids)} existing id(s) into {out}")
PY
```
> ⚠️ Use the right DB path if `~/outland-data/db.sqlite` isn't it (see §3b).

**2. Dry-run** — with the ledger seeded this should emit nothing:
```bash
"$LISA_PY" "$CAMP/automation/remember_camping.py"
```
Expect `done — 0 new debrief(s) emitted`. **`0 new` is the correct, expected result here** — it proves the DB read + ledger path work and confirms go-forward-only is in effect. (If it emits rows, the seed didn't take — STOP and re-check the DB path.)

**Verification caveat:** seeding means the *write* path (actually inserting a `source='camping'` memory) is NOT exercised at deploy time. That's fine — it will fire the first time Will records a **new** post-trip debrief in Outland, which is the true end-to-end test (Phase D step 4). Do not create a fake `TripFeedback` row to test it — Outland's DB is read-only for us.

**Only proceed once the dry-run reports `0 new` cleanly.**

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

## 6. Phase D — Verify the job is healthy (live write is deferred)

1. Confirm the **scheduled** run actually executed (not just your manual run):
   ```bash
   tail -20 ~/Library/Logs/camping-capture.log
   ```
   Should show a `[remember_camping] … done — 0 new debrief(s) emitted` line timestamped at/after load. **`0 new` is expected** under go-forward-only with no new trips yet.
2. Confirm exit health: `launchctl list | grep camping-capture` — the last-exit-status column should be `0`.
3. **Deferred end-to-end test (the real proof):** the first time Will records a **new** post-trip debrief in Outland, the next hourly run will emit one `source='camping'` row. After that trip, confirm:
   ```bash
   source ~/.env.lisaos 2>/dev/null
   psql "$DATABASE_URL" -c "SELECT count(*) FROM memories WHERE source='camping';"   # ≥ 1
   ```
   and ask Hermes `/recall camping` — it should return the new debrief. (Until then, `/recall camping` is expected to be empty.) The 2am `com.lisaos.facet-summary` run folds it into the `me.episodes` facet.

---

## 7. Definition of done

- [ ] Both repos pulled on the Mini.
- [ ] `$LISA_PY` imports `lisabrain` and `dotenv`.
- [ ] Ledger seeded (`~/.lisabrain/camping_state.json` lists the existing id(s)).
- [ ] Dry-run reported `0 new` (go-forward-only confirmed; read + ledger work).
- [ ] `com.lisaos.camping-capture` loaded; `plutil -lint` clean.
- [ ] Scheduled run logged a clean execution (exit status 0, `0 new`).
- [ ] (Deferred) first real future debrief produces a `source='camping'` row + shows in `/recall camping`.

Report the seed count + the log tail to Will, then stop. The bridge is installed and healthy; the live write is verified on Will's next camping debrief. (Live read-tools over Outland's HTTP API — "step b" — are a separate future task; not in scope here.)

---

### Appendix — if Will later DOES want the historical trip imported
Reverse the go-forward seed by clearing the ledger, then run once (it will emit any not-yet-seen debriefs):
```bash
rm -f ~/.lisabrain/camping_state.json
"$LISA_PY" "$CAMP/automation/remember_camping.py"   # emits all existing debriefs, then resumes go-forward
```
