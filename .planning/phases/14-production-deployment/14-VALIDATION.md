---
phase: 14
slug: production-deployment
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-02
---

# Phase 14 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green + manual Mac mini checks
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | DEPLOY-01 | smoke | `npm run build` | N/A -- build config | pending |
| 14-01-02 | 01 | 1 | DEPLOY-02, DEPLOY-03 | smoke + negative grep | `grep -q getPhotosDir app/api/photos/upload/route.ts && ! grep -rq 'process\.cwd.*public.*photo' app/api/photos/` | N/A -- code migration | pending |
| 14-02-01 | 02 | 1 | DEPLOY-04 | smoke | `grep -q "exec_mode: 'fork'" ecosystem.config.js && grep -q "cwd:" ecosystem.config.js` | N/A -- config file | pending |
| 14-02-02 | 02 | 1 | DEPLOY-06 | smoke | `bash -n deploy.sh` | deploy.sh (created by plan) | pending |
| 14-02-03 | 02 | 1 | DEPLOY-07 | smoke | `bash -n scripts/outland-backup.sh && grep -q "sqlite3" scripts/outland-backup.sh` | scripts/outland-backup.sh (created by plan) | pending |
| 14-02-04 | 02 | 1 | DEPLOY-08 | smoke | `grep -q "outland-shell-v" deploy.sh` | deploy.sh (created by plan) | pending |
| 14-03-01 | 03 | 2 | DEPLOY-05 | manual + checkpoint | Reboot + `pm2 list` shows `online` | docs/MAC-MINI-SETUP.md (created by plan) | pending |

*Status: pending -- green -- red -- flaky*

---

## Requirement Coverage

All 8 DEPLOY requirements are covered by 3 plans:

| Requirement | Plan | Verification |
|-------------|------|-------------|
| DEPLOY-01 | 14-01 | `npm run build` produces standalone output |
| DEPLOY-02 | 14-01 | Photo routes use `getPhotosDir()`, no hardcoded paths |
| DEPLOY-03 | 14-01 | `.env.example` documents production DATABASE_URL |
| DEPLOY-04 | 14-02 | `ecosystem.config.js` has fork mode + cwd |
| DEPLOY-05 | 14-02, 14-03 | PM2 config created (14-02), checkpoint verifies `pm2 startup` execution (14-03) |
| DEPLOY-06 | 14-02 | `deploy.sh` contains build-then-swap workflow |
| DEPLOY-07 | 14-02 | `scripts/outland-backup.sh` uses sqlite3 .backup |
| DEPLOY-08 | 14-02 | `deploy.sh` contains sed SW version bump before build (smoke verified by grep) |

---

## Wave 0 Requirements

- [ ] `deploy.sh` -- deploy script created by Plan 14-02, smoke-testable via `bash -n`
- [ ] `scripts/outland-backup.sh` -- backup script created by Plan 14-02, smoke-testable via `bash -n`

*DEPLOY-08 (SW cache version bump) is verified as a smoke test: deploy.sh contains the sed command that bumps the version. No unit test needed -- the behavior is a shell script sed substitution, not testable code.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/data/outland/` directory exists and is writable | DEPLOY-02 | OS-level directory creation on Mac mini | `sudo mkdir -p /data/outland/{db,photos,backups} && ls -la /data/outland/` |
| PM2 starts app in fork mode | DEPLOY-04 | Runtime process manager config | `pm2 start ecosystem.config.js && pm2 show outland` -- verify `exec mode: fork` |
| App survives Mac mini reboot | DEPLOY-05 | Hardware-level test | Reboot Mac mini, wait 60s, `pm2 list` shows `online` |
| Health endpoint from phone | DEPLOY-08 | Network/browser test | Open `http://mac-mini:3000/api/health` on phone -- verify JSON response |
| Existing photos resolve after deploy | D-09 | Requires photo data + running server | Open a known photo URL in browser after deploy |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are manual-only with checkpoint coverage
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Task map matches 3-plan structure (no phantom plan references)

**Approval:** ready
