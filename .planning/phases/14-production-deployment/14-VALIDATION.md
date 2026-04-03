---
phase: 14
slug: production-deployment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 14 — Validation Strategy

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
| 14-01-01 | 01 | 1 | DEPLOY-01 | smoke | `npm run build` | ✅ | ⬜ pending |
| 14-01-02 | 01 | 1 | DEPLOY-02 | manual | `ls -la /data/outland/` | N/A — OS setup | ⬜ pending |
| 14-01-03 | 01 | 1 | DEPLOY-03 | smoke | `DATABASE_URL="file:/data/outland/db.sqlite" npx prisma validate` | N/A — env config | ⬜ pending |
| 14-02-01 | 02 | 1 | DEPLOY-04 | manual | `pm2 show outland` | N/A — runtime | ⬜ pending |
| 14-02-02 | 02 | 1 | DEPLOY-05 | manual | Reboot + `pm2 list` | N/A — hardware | ⬜ pending |
| 14-03-01 | 03 | 2 | DEPLOY-06 | smoke | `bash deploy.sh` | ❌ W0 | ⬜ pending |
| 14-04-01 | 04 | 2 | DEPLOY-07 | smoke | `bash /usr/local/bin/outland-backup.sh && ls /data/outland/backups/` | ❌ W0 | ⬜ pending |
| 14-05-01 | 05 | 1 | DEPLOY-08 | unit | `npm test -- tests/deploy/sw-version.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/deploy/sw-version.test.ts` — unit test for SW cache version bump (DEPLOY-08)
- [ ] `deploy.sh` — deploy script smoke-testable on Mac mini (DEPLOY-06)
- [ ] `scripts/outland-backup.sh` — backup script smoke-testable (DEPLOY-07)

*Existing infrastructure covers DEPLOY-01 through DEPLOY-05.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/data/outland/` directory exists and is writable | DEPLOY-02 | OS-level directory creation on Mac mini | `sudo mkdir -p /data/outland/{db,photos,backups} && ls -la /data/outland/` |
| PM2 starts app in fork mode | DEPLOY-04 | Runtime process manager config | `pm2 start ecosystem.config.js && pm2 show outland` — verify `exec mode: fork` |
| App survives Mac mini reboot | DEPLOY-05 | Hardware-level test | Reboot Mac mini, wait 60s, `pm2 list` shows `online` |
| Health endpoint from phone | DEPLOY-08 | Network/browser test | Open `http://mac-mini:3000/api/health` on phone — verify JSON response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
