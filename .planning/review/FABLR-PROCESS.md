# Fablr Process Review -- Lessons for Outland OS

**Reviewed:** 2026-04-01
**Source:** `/Users/willis/fablr-monorepo/`
**Purpose:** Extract process patterns from a more mature project (daflood's Fablr.ai) to improve Outland OS workflow and structure.

---

## What Fablr Does Well

### 1. Layered AI Instructions (CLAUDE.md + AGENTS.md + workspace-level CLAUDE.md)
Fablr has **three tiers** of AI assistant guidance:
- **Root `CLAUDE.md`** (655 lines) -- monorepo-level guidance, architecture overview, development commands
- **Root `AGENTS.md`** (580 lines) -- multi-agent coordination rules (for when multiple AI agents work on the codebase)
- **Workspace `fablr_django/CLAUDE.md`** (1030 lines) -- Django-specific patterns, app structure, detailed coding conventions

Total: ~2,265 lines of AI instructions across 3 files. Outland OS has one file doing all three jobs.

### 2. 114 Custom Slash Commands
The `.claude/commands/` directory contains **114 markdown command files**, covering:
- **Session management**: `session-start.md`, `session-end.md`, `session-update.md`, `session-list.md`
- **Context handoff**: `whats-next.md` (creates detailed handoff documents for fresh contexts)
- **Todo management**: `check-todos.md`, `add-to-todos.md`
- **Code quality**: `code-review.md`, `security-audit.md`, `performance-audit.md`
- **Feature workflow**: `speckit.specify.md`, `speckit.plan.md`, `speckit.implement.md`, `speckit.tasks.md`, `speckit.clarify.md`
- **Architecture**: `architecture-review.md`, `create-architecture-documentation.md`
- **Testing**: `write-tests.md`, `generate-test-cases.md`, `setup-comprehensive-testing.md`
- **Sprint/project**: `sprint-planning.md`, `standup-report.md`, `milestone-tracker.md`
- **Agent priming**: `agentprime.md`, `prime.md`, `load-context.md`
- **Research**: `researchprompt.md`, `ultra-think.md`

This is a massive library. Most are generic/reusable rather than project-specific.

### 3. Development Constitution
`.specify/memory/constitution.md` defines **5 non-negotiable principles**:
1. Test-first development for critical bugs
2. Real API testing (never mock when debugging external APIs)
3. Rollback capability (<5 min recovery)
4. Performance baselines before/after changes
5. Split test architecture (respect container boundaries)

Each principle has rationale citing real incidents. This is the kind of "learned the hard way" documentation that prevents repeat mistakes.

### 4. Feature Specification Workflow (SpecKit)
The `.specify/` directory contains a complete spec-first workflow:
- `templates/spec-template.md` -- structured feature spec with user stories, acceptance criteria, success metrics
- `templates/plan-template.md` -- technical plan derived from spec
- `templates/tasks-template.md` -- task breakdown from plan
- Commands chain together: `/speckit.specify` --> `/speckit.clarify` --> `/speckit.plan` --> `/speckit.implement`

Each feature gets a numbered branch (`001-feature-name`, `002-feature-name`) with its own `specs/` directory.

### 5. CI/CD Pipeline
Three GitHub Actions workflows:
- **`test.yml`** -- Full test suite with 8 parallel matrix groups, PostgreSQL + Redis services, pytest-xdist for parallel execution, daily scheduled runs for dependency issues
- **`claude.yml`** -- Claude Code as a GitHub bot (responds to `@claude` mentions in issues/PRs)
- **`claude-code-review.yml`** -- Automated PR code review using Claude

### 6. MCP Integration
`.claude/mcp.json` configures external tool access (Render.com deployment MCP), giving AI agents direct access to infrastructure operations.

### 7. External Agent API Guide
`external-agents-guide.md` documents how any AI coding assistant (not just Claude) can interact with the Wagtail CMS REST API, with API key setup, endpoint reference, and usage examples. This is thinking about AI-as-contributor at a system level.

---

## CLAUDE.md / AI Instructions Comparison

### What Fablr Tells AI Assistants That Outland OS Doesn't

| Topic | Fablr | Outland OS |
|-------|-------|------------|
| **Multi-agent coordination** | AGENTS.md defines shared workspace rules, status file handoffs, blocker surfacing | No multi-agent awareness |
| **Workspace routing** | Explicit "work in fablr_django/ unless told otherwise" with correct/incorrect examples | Implicit (flat structure) |
| **Session management** | 7 session commands (start, end, update, list, help, learning-capture, current) | No session concept |
| **Context handoff** | `whats-next.md` generates detailed XML-structured handoff documents | GSD pause/resume workflow exists but lighter |
| **Testing mandate** | "ALWAYS read the testing guide first" -- red text, repeated 3x | No testing section at all |
| **CSS gotchas** | Dedicated section: "NEVER edit static/css/ -- edit assets/styles/" | No build pipeline gotchas |
| **Docker workflow** | Make targets documented: `make init`, `make test`, `make format` | `npm run dev` only |
| **Troubleshooting** | 8+ specific troubleshooting sections with symptoms and fixes | Troubleshooting runbook in memory files |
| **File size limits** | "Refactor when files exceed 200-300 lines" | No file size guidance |
| **Git commit prefixes** | 10 defined prefixes (fix:, feat:, perf:, docs:, ios:, web:, etc.) | Imperative mood only |
| **Critical warnings** | iOS-specific warnings with "NEVER" rules, error response protocols | No platform-specific warnings |
| **Documentation index** | Links to DOCUMENTATION_INDEX.md as entry point | No documentation index |
| **Orphan speech testing** | Entire section on data-loss-prevention testing with specific commands | N/A |

### What Outland OS Does That Fablr Doesn't

| Topic | Outland OS | Fablr |
|-------|------------|-------|
| **Working with the user** | "He has ADHD -- keep outputs scannable", "He's learning -- explain decisions" | No developer profile |
| **GSD workflow** | Structured phase-based development with discuss/plan/execute pipeline | SpecKit for features, but no overarching workflow |
| **Phase management** | Feature phases with numbered plans, verification loops | Feature branches with specs but less formal phase tracking |
| **Coding conventions detail** | Extremely detailed naming conventions, hook patterns, prop patterns | Defers to "follow Pegasus patterns" and Ruff |
| **Architecture documentation** | Layers, data flow, key abstractions documented in CLAUDE.md | Architecture in separate docs, not inline |

### Key Takeaway
Fablr's CLAUDE.md is more **operational** (how to work, what commands to run, what not to break). Outland OS's CLAUDE.md is more **architectural** (how code is structured, naming conventions, data flow). Both are valuable -- Outland OS should add more operational guidance.

---

## Project Structure Lessons

### Fablr Monorepo Structure
```
fablr-monorepo/
  fablr_django/           # Main Django app (1002 items!)
    apps/                 # 20+ modular Django apps (biography, community, voice_chat, etc.)
    agent/                # LiveKit voice agent (separate concern)
      tests/              # 400+ test files
    docs/                 # Django-specific docs
    CLAUDE.md             # Workspace-specific AI instructions
  ios-app/                # iOS companion (separate workspace)
    CLAUDE.md             # iOS-specific AI instructions
  docs/                   # Shared/cross-platform docs (77 items)
  specs/                  # Feature specifications
  tasks/                  # Task tracking documents
  prompts/                # Research and investigation prompts
  analyses/               # Investigation and debug reports
  plans/                  # Implementation plans
  .claude/commands/       # 114 slash commands
  .specify/               # Feature spec workflow (templates, memory, scripts)
  .github/workflows/      # CI/CD (3 workflows)
```

### Compared to Outland OS
```
Camping Manager/
  app/                    # Pages + API routes (flat)
  components/             # All components (flat)
  lib/                    # Utilities (flat)
  prisma/                 # Database
  docs/                   # Docs + changelogs
  .planning/              # GSD planning artifacts
  .claude/                # Memory files
```

### What Fablr Gets Right
1. **Separation of concerns via directories**: `specs/`, `tasks/`, `prompts/`, `analyses/`, `plans/` each have a clear purpose. Outland OS puts everything in `.planning/` or `docs/`.
2. **Workspace-level AI instructions**: Each sub-project (Django, iOS) gets its own CLAUDE.md with workspace-specific rules.
3. **20+ modular apps**: Features are isolated Django apps (`apps/biography/`, `apps/community/`, `apps/voice_chat/`). Outland OS has a flat `app/api/` structure.
4. **Numbered feature directories**: `specs/001-livekit-audio-quality/`, `specs/002-wagtail-cms-api/` create clear feature boundaries with their own docs.

### What Outland OS Can Learn
The flat structure works fine at current scale, but the habit of **numbered feature directories** and **purpose-specific top-level directories** would help as complexity grows.

---

## Git & Workflow Discipline

### Commit Style
Fablr uses **conventional commits** with scope:
```
fix: use correct extract_story_title import for stage prefix format
feat: add Wagtail CMS API routes to main urls
fix(subscriptions): Fix magic link URL name in success template
style(subscriptions): Match gift purchase page styling to self-purchase
feat(002-wagtail-cms-api): implement Wagtail CMS REST API for AI agents
docs: add investigation notes and test files for category transition bug
test: add TDD test suite for orphan speech bug detection
revert: remove orphan speech suppression that blocked questions
```

Key patterns:
- **Prefixes**: `fix:`, `feat:`, `perf:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`, `revert:`
- **Scoped prefixes**: `fix(subscriptions):`, `feat(002-wagtail-cms-api):`
- **Feature branch references**: Branch number in scope when relevant

### Compared to Outland OS
Outland OS uses: `docs: session 19 wrap`, `test(05): persist human verification items`. Similar prefixes but less consistent scoping.

### Branch Naming
Fablr uses numbered feature branches: `001-demo-biographer`, `002-wagtail-cms-api`, `001-livekit-upgrade`. The numbering ties branches to spec directories.

### CI/CD
Fablr has **real CI/CD** that Outland OS completely lacks:
- **Test suite in GitHub Actions**: 8 parallel test groups with PostgreSQL + Redis services
- **Claude as code reviewer**: Automated PR reviews via `claude-code-review.yml`
- **Claude as issue handler**: `@claude` mentions in issues/PRs trigger Claude Code Action
- **Daily scheduled test runs**: Catches dependency drift
- **Artifact upload on failure**: Test logs preserved for debugging
- **Concurrency control**: `cancel-in-progress: true` prevents duplicate runs

---

## Testing & Quality

### Fablr Testing
- **400+ test files** in `fablr_django/agent/tests/` alone
- **45/45 tests passing** (100% pass rate as of Oct 2025)
- **Split test architecture**: Agent tests (no Django) vs API integration tests (no LiveKit)
- **TDD for critical bugs**: Constitution mandates test-first for production bugs
- **E2E tests**: Audio/voice end-to-end testing (temporarily disabled in CI)
- **Testing guide**: `TESTING_GUIDE.md` is mandatory reading before writing tests
- **Orphan speech testing**: Data-loss-prevention test suite specifically for voice agent quality
- **pytest-xdist**: Parallel test execution for speed
- **Fixtures**: `StateFixtureBuilder` and `ContributorFlowFixture` for complex test setup
- **Real API testing**: No mocks when debugging external API issues
- **Minimum 9+ assertions per test**: Documented in constitution

### Outland OS Testing
- **Zero tests**
- No test framework configured
- No testing documentation
- No CI/CD to run tests

### What This Means
Fablr treats testing as a **first-class development concern** with:
1. A constitution principle enforcing test-first for bugs
2. Architecture-level decisions about test isolation
3. Dedicated testing documentation (6 research documents, 95KB+ total)
4. CI/CD that runs tests on every push

Outland OS needs to start somewhere. Even a few API route tests and a basic CI workflow would be a massive improvement.

---

## Documentation Maturity

### Fablr Documentation
- **Root `docs/`**: 77 items covering deployment, API guides, research, architecture
- **`fablr_django/docs/`**: Django-specific docs with subdirectories
- **DOCUMENTATION_INDEX.md**: Central navigation hub for all docs
- **Research documents**: Dedicated investigation reports (`analyses/`, `prompts/`)
- **Continuation prompts**: 7+ documents for handing off work between sessions
- **Testing documentation**: 6 dedicated research documents (95KB+)
- **External agent guide**: Documents how non-human contributors interact with the API
- **Maintenance mode**: 12 files (code + docs) for a single operational feature

### Outland OS Documentation
- **`docs/`**: Changelogs, status, tasks
- **`.planning/`**: Phase plans, GSD artifacts
- **CLAUDE.md**: Architecture + conventions (doing triple duty)
- **No documentation index**
- **No research archive**

### What Outland OS Should Add
1. **DOCUMENTATION_INDEX.md** -- a single entry point that links to everything
2. **Research archive** -- when debugging or investigating, save the findings as a document (Outland OS's troubleshooting runbook in memory is a start, but Fablr's `analyses/` directory is more thorough)
3. **Continuation prompts** -- Fablr's `whats-next.md` command generates context handoffs. Outland OS's GSD pause/resume does this but the dedicated command is more accessible.

---

## Top 5 Process Improvements for Outland OS

### 1. Add Basic CI/CD (GitHub Actions)

**Why**: Fablr catches regressions automatically. Outland OS has no automated quality checks.

**Action**: Create `.github/workflows/test.yml` with:
- Lint check (`npm run lint`)
- TypeScript check (`npx tsc --noEmit`)
- Prisma schema validation
- Basic API route tests (when tests exist)

Even without tests, a lint + type-check workflow catches real bugs. Start here.

### 2. Add Conventional Commit Prefixes

**Why**: Fablr's `fix:`, `feat:`, `docs:`, `test:` prefixes make git history scannable. Outland OS already uses some prefixes but inconsistently.

**Action**: Add to CLAUDE.md:
```
### Git Commit Conventions
Use prefixes:
- `fix:` for bug fixes
- `feat:` for new features
- `docs:` for documentation changes
- `test:` for adding tests
- `refactor:` for code restructuring
- `chore:` for maintenance (deps, config)
- `style:` for formatting/CSS changes
```

### 3. Write Your First Tests

**Why**: Fablr has 400+ test files and a development constitution that mandates test-first for bugs. Outland OS has zero.

**Action**: Start with API route tests -- they're the easiest entry point:
- Test that `GET /api/gear` returns gear items
- Test that `POST /api/gear` creates a gear item with required fields
- Test that `POST /api/gear` returns 400 without required fields

Use Vitest (already in the Next.js ecosystem). Even 5 tests is infinitely better than zero.

### 4. Create a Troubleshooting Section in CLAUDE.md

**Why**: Fablr has 8+ specific troubleshooting sections with symptoms, causes, and fixes. Outland OS has a memory file (`reference_troubleshooting.md`) but nothing in the main instructions file where AI agents will see it.

**Action**: Add a `## Common Issues & Troubleshooting` section to CLAUDE.md with known gotchas:
- Prisma migration issues after schema changes
- Leaflet marker icon path fix
- Next.js hot reload quirks
- SQLite locking during concurrent requests
- Any other issues that have cost debugging time

### 5. Add a Context Handoff Command

**Why**: Fablr's `whats-next.md` command creates structured handoff documents with original task, work completed, work remaining, attempted approaches, critical context, and current state. This prevents context loss between sessions.

**Action**: GSD already has `/gsd:pause-work` and `/gsd:resume-work`, but Fablr's approach of a dedicated `whats-next.md` file in the working directory is simpler and more portable. Consider making the GSD pause output more discoverable -- or add a simple `/handoff` command that writes a structured summary to `.planning/HANDOFF.md`.

---

## Honorable Mentions (Not Top 5, But Worth Noting)

- **File size limits**: Fablr says "refactor when files exceed 200-300 lines." Outland OS has no guidance. Adding this would prevent components from becoming unwieldy.
- **Documentation index**: Fablr's DOCUMENTATION_INDEX.md as a central hub. When Outland OS docs grow, this will be valuable.
- **Session tracking**: Fablr's session-start/session-end commands create timestamped session files. Outland OS's changelog per session serves a similar purpose but Fablr's approach tracks goals and progress within a session.
- **Constitution/principles**: Fablr's `.specify/memory/constitution.md` encodes lessons learned into enforceable rules. As Outland OS matures, documenting "rules we learned the hard way" would prevent regressions.
- **MCP integration**: Fablr's `.claude/mcp.json` gives AI agents access to deployment infrastructure. When Outland OS deploys to Vercel, adding Vercel MCP would enable AI-assisted deployments.
- **Multiple CLAUDE.md files**: When Outland OS grows sub-projects (e.g., Python tools, mobile PWA), having workspace-level CLAUDE.md files would keep instructions relevant and focused.
