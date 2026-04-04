---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - app/api/agent/jobs/route.ts
  - lib/agent/jobs/deal-check.ts
  - lib/agent/jobs/maintenance-due.ts
  - lib/agent/jobs/trip-weather-alert.ts
  - lib/agent/jobs/weekly-briefing.ts
  - scripts/scheduler.ts
  - components/IntelligenceCard.tsx
  - components/DashboardClient.tsx
  - app/page.tsx
autonomous: true
requirements: [S32]
must_haves:
  truths:
    - "Scheduler seeds 4 recurring jobs on first run and creates pending jobs when scheduledFor <= now"
    - "agent-runner picks up and executes deal_check, maintenance_due, trip_weather_alert, weekly_briefing jobs"
    - "Dashboard shows IntelligenceCard with latest weekly_briefing results"
    - "Deal check identifies gear items near their target price"
    - "Maintenance due flags overdue gear maintenance items"
    - "Weather alert flags upcoming trips with bad forecasts"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "AgentJob with scheduledFor and recurringCron fields"
      contains: "scheduledFor"
    - path: "lib/agent/jobs/deal-check.ts"
      provides: "Deal check job handler"
      exports: ["processDealCheck"]
    - path: "lib/agent/jobs/maintenance-due.ts"
      provides: "Maintenance due job handler"
      exports: ["processMaintenanceDue"]
    - path: "lib/agent/jobs/trip-weather-alert.ts"
      provides: "Trip weather alert job handler"
      exports: ["processTripWeatherAlert"]
    - path: "lib/agent/jobs/weekly-briefing.ts"
      provides: "Weekly briefing job handler"
      exports: ["processWeeklyBriefing"]
    - path: "scripts/scheduler.ts"
      provides: "PM2 scheduler script with setInterval polling"
    - path: "components/IntelligenceCard.tsx"
      provides: "Dashboard intelligence card component"
  key_links:
    - from: "scripts/scheduler.ts"
      to: "/api/agent/jobs"
      via: "fetch POST to create jobs when scheduledFor <= now"
      pattern: "fetch.*api/agent/jobs"
    - from: "lib/agent/jobs/trip-weather-alert.ts"
      to: "lib/weather.ts"
      via: "fetchWeather import"
      pattern: "fetchWeather"
    - from: "components/IntelligenceCard.tsx"
      to: "app/page.tsx"
      via: "latestBriefing prop from server component"
      pattern: "IntelligenceCard"
---

<objective>
Extend AgentJob with scheduled recurring jobs, build 4 job handlers, a scheduler script, and an IntelligenceCard dashboard widget.

Purpose: Make the Mac mini proactive — checking deals, surfacing maintenance due items, and flagging weather problems for upcoming trips without Will triggering anything. The dashboard Intel card surfaces the weekly briefing.

Output: Schema migration, 4 job handlers, scheduler script, IntelligenceCard component wired to dashboard.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@prisma/schema.prisma
@app/api/agent/jobs/route.ts
@scripts/agent-runner.ts
@lib/weather.ts
@components/DashboardClient.tsx
@app/page.tsx

<interfaces>
<!-- Existing interfaces the executor needs -->

From lib/weather.ts:
```typescript
export interface DayForecast {
  date: string; dayLabel: string; highF: number; lowF: number;
  precipProbability: number; precipInches: number; weatherCode: number;
  weatherLabel: string; weatherEmoji: string; windMaxMph: number;
  windGustMph: number; uvIndexMax: number; sunrise: string; sunset: string;
}
export interface WeatherForecast {
  latitude: number; longitude: number; elevation: number;
  days: DayForecast[]; alerts: WeatherAlert[];
}
export interface WeatherAlert {
  type: 'rain' | 'cold' | 'heat' | 'wind' | 'uv';
  message: string; severity: 'info' | 'warning';
}
export async function fetchWeather(latitude: number, longitude: number, startDate: string, endDate: string): Promise<WeatherForecast>;
```

From scripts/agent-runner.ts:
```typescript
// callClaude uses claude-sonnet-4-20250514 — job handlers MUST use claude-haiku-4-5 instead
// processors map: Record<string, (payload: unknown) => Promise<unknown>>
// postResult(jobId, result), failJob(jobId, error), claimJob(jobId)
```

From app/api/agent/jobs/route.ts:
```typescript
// GET: filters by status, unread, type, tripId — returns up to 50 jobs desc by createdAt
// POST: requires type + payload, optional triggeredBy
```

AgentJob model (current):
```prisma
model AgentJob {
  id          String    @id @default(cuid())
  type        String
  status      String    @default("pending")
  triggeredBy String    @default("manual")
  payload     String
  result      String?
  readAt      DateTime?
  createdAt   DateTime  @default(now())
  completedAt DateTime?
  @@index([status])
  @@index([createdAt])
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Schema migration + API extension + 4 job handlers</name>
  <files>
    prisma/schema.prisma,
    app/api/agent/jobs/route.ts,
    lib/agent/jobs/deal-check.ts,
    lib/agent/jobs/maintenance-due.ts,
    lib/agent/jobs/trip-weather-alert.ts,
    lib/agent/jobs/weekly-briefing.ts
  </files>
  <action>
    **1a. Schema — Add 2 fields to AgentJob model in prisma/schema.prisma:**
    ```prisma
    scheduledFor  DateTime?   // when this job should next run
    recurringCron String?     // cron expression: "0 8 * * *" = 8am daily
    ```
    Add `@@index([scheduledFor])` for efficient scheduler queries.
    Create migration: `npx prisma migrate dev --name add-scheduled-recurring-to-agent-job`.
    NOTE: FTS triggers may block prisma migrate dev — if so, create migration manually with `npx prisma migrate diff` and apply via better-sqlite3, following the Phase 34 pattern from STATE.md decisions.

    **1b. API extension — app/api/agent/jobs/route.ts:**
    - GET: Add an OR condition so that when `status=pending` is requested, also return jobs where `scheduledFor` is not null and `scheduledFor <= new Date()` and `status = 'pending'`. Add a new query param `scheduled=ready` that returns jobs where `scheduledFor <= now` regardless of other filters.
    - POST: Accept optional `scheduledFor` (ISO string, parse to Date) and `recurringCron` (string) in request body. Pass them through to prisma.agentJob.create data.

    **1c. Job handlers — create `lib/agent/jobs/` directory with 4 files:**

    **deal-check.ts:**
    - Export `async function processDealCheck(payload: DealCheckPayload): Promise<DealCheckResult>`
    - Payload: `{}` (no input needed — queries DB directly)
    - Import prisma from `@/lib/db`. Query all GearItems where `targetPrice` is not null. For each (batch into a single Claude call if <=10 items, otherwise chunk), call Claude claude-haiku-4-5 via direct Anthropic API (same pattern as agent-runner.ts `callClaude` but with model `claude-haiku-4-5-20250514`). Prompt: "For each item, estimate the current typical market price. Return JSON array." Parse result. Flag items where estimated price is within 10% of targetPrice.
    - Result shape: `{ items: Array<{ gearItemId: string, name: string, targetPrice: number, estimatedPrice: number, isNearTarget: boolean }>, checkedAt: string }`

    **maintenance-due.ts:**
    - Export `async function processMaintenanceDue(payload: MaintenanceDuePayload): Promise<MaintenanceDueResult>`
    - Payload: `{}`
    - Import prisma. Query GearItems where `maintenanceIntervalDays` is not null AND `lastMaintenanceAt` is not null. Filter in JS: items where `lastMaintenanceAt + maintenanceIntervalDays < today`. Also include items where `maintenanceIntervalDays` is set but `lastMaintenanceAt` is null (never maintained).
    - Result: `{ overdueItems: Array<{ gearItemId: string, name: string, lastMaintenance: string | null, intervalDays: number, daysOverdue: number }>, checkedAt: string }`
    - No Claude call needed — pure DB query + date math.

    **trip-weather-alert.ts:**
    - Export `async function processTripWeatherAlert(payload: TripWeatherAlertPayload): Promise<TripWeatherAlertResult>`
    - Payload: `{}`
    - Import prisma and `fetchWeather` from `@/lib/weather`. Query trips where `startDate` is within the next 5 days AND location is not null (include location with lat/lon). For each trip, call `fetchWeather(lat, lon, startDate, endDate)`. Flag trips where any day has `precipProbability > 60`, `highF >= 100 || lowF <= 25`, or `windGustMph >= 40`.
    - Result: `{ tripAlerts: Array<{ tripId: string, tripName: string, startDate: string, alerts: WeatherAlert[] }>, checkedAt: string }`

    **weekly-briefing.ts:**
    - Export `async function processWeeklyBriefing(payload: WeeklyBriefingPayload): Promise<WeeklyBriefingResult>`
    - Payload: `{}`
    - Import prisma. Query the most recent completed `deal_check`, `maintenance_due`, and `trip_weather_alert` jobs (status='done', orderBy completedAt desc, take 1 each). Parse their `result` JSON fields. Aggregate into a single briefing object.
    - Result: `{ deals: { count: number, nearTarget: Array<{ name: string, estimatedPrice: number, targetPrice: number }> }, maintenance: { overdueCount: number, items: Array<{ name: string, daysOverdue: number }> }, weather: { alertCount: number, trips: Array<{ tripName: string, alerts: string[] }> }, generatedAt: string }`
    - No Claude call needed — pure aggregation.

    Each handler file should export its payload and result types for use by agent-runner and scheduler.
  </action>
  <verify>
    <automated>cd /Users/willis/Camping\ Manager/.claude/worktrees/wizardly-buck && npx prisma validate && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
    - AgentJob has scheduledFor and recurringCron fields with migration applied
    - API GET returns scheduled-ready jobs, POST accepts scheduledFor/recurringCron
    - 4 job handler files exist in lib/agent/jobs/ with typed exports
    - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Scheduler script + agent-runner wiring + IntelligenceCard + dashboard</name>
  <files>
    scripts/scheduler.ts,
    scripts/agent-runner.ts,
    components/IntelligenceCard.tsx,
    components/DashboardClient.tsx,
    app/page.tsx
  </files>
  <action>
    **2a. Scheduler script — scripts/scheduler.ts:**
    - New file. Runs with `tsx scripts/scheduler.ts` under PM2 on Mac mini.
    - On startup, seed 4 recurring AgentJobs via POST /api/agent/jobs if they don't already exist (check via GET /api/agent/jobs?type=X for each type). Use `triggeredBy: 'schedule'`.
      - `deal_check`: `recurringCron: "0 8 * * *"`, `scheduledFor: next 8am UTC`
      - `maintenance_due`: `recurringCron: "0 8 * * 0"`, `scheduledFor: next Sunday 8am`
      - `trip_weather_alert`: `recurringCron: "0 7 * * *"`, `scheduledFor: next 7am`
      - `weekly_briefing`: `recurringCron: "0 9 * * 0"`, `scheduledFor: next Sunday 9am`
    - Use `setInterval(poll, 60_000)` — no new npm packages.
    - `poll()`: GET /api/agent/jobs?scheduled=ready. For each returned job where scheduledFor <= now and status is still pending, POST to create a new pending job with same type and empty payload `'{}'`, then PATCH the template job's scheduledFor to the next occurrence (parse recurringCron with a simple helper — only need to handle `0 H * * *` daily and `0 H * * D` weekly patterns, not full cron). Use the same BASE_URL / ANTHROPIC_API_KEY env vars as agent-runner.ts.
    - Simple cron parser: function `nextOccurrence(cron: string, after: Date): Date` — parse hour and optional day-of-week from the cron string, compute next matching datetime.
    - Log to console with `[scheduler]` prefix, same pattern as agent-runner.

    **2b. Agent-runner wiring — scripts/agent-runner.ts:**
    - Import the 4 new handler functions. Add them to the `processors` map:
      ```typescript
      deal_check: (payload) => processDealCheck(payload as DealCheckPayload),
      maintenance_due: (payload) => processMaintenanceDue(payload as MaintenanceDuePayload),
      trip_weather_alert: (payload) => processTripWeatherAlert(payload as TripWeatherAlertPayload),
      weekly_briefing: (payload) => processWeeklyBriefing(payload as WeeklyBriefingPayload),
      ```
    - NOTE: The agent-runner uses direct fetch to Anthropic API, but the job handlers import prisma and fetchWeather. The agent-runner runs as a standalone script with tsx, so `@/lib/*` imports work via tsconfig paths. If there are import issues, use relative paths instead.

    **2c. IntelligenceCard — components/IntelligenceCard.tsx:**
    - Client component ('use client').
    - Props: `{ briefing: WeeklyBriefingResult | null }` — the parsed result from the latest weekly_briefing job.
    - When `briefing` is null, don't render anything.
    - Layout: Card with "Intel" header and a brain/zap icon from lucide-react. Three collapsible sections (useState for each):
      - **Deals** (Tag icon, emerald): Shows count + list of items near target price with name and prices.
      - **Maintenance** (Wrench icon, amber): Shows overdue count + list with item name and days overdue.
      - **Weather** (CloudRain icon, sky): Shows alert count + per-trip alert summaries.
    - Use Tailwind. Match the existing DashboardClient card styling (rounded-xl, border, dark mode support). Each section header is a tappable button that toggles expand/collapse with ChevronDown rotation.
    - If all sections have 0 items, show a single "All clear" message.

    **2d. Dashboard wiring:**
    - **app/page.tsx**: In the Promise.all, add a query for the latest weekly_briefing job:
      ```typescript
      prisma.agentJob.findFirst({
        where: { type: 'weekly_briefing', status: 'done' },
        orderBy: { completedAt: 'desc' },
        select: { result: true },
      })
      ```
      Parse the result JSON, pass as `latestBriefing` prop to DashboardClient.
    - **DashboardClient.tsx**: Accept new optional prop `latestBriefing`. Import and render `<IntelligenceCard briefing={latestBriefing} />` between the trip prep stepper and the quick stats grid (after line ~127, before line ~129).
  </action>
  <verify>
    <automated>cd /Users/willis/Camping\ Manager/.claude/worktrees/wizardly-buck && npx tsc --noEmit --pretty 2>&1 | head -30 && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - scripts/scheduler.ts exists, seeds 4 recurring jobs, polls every minute
    - agent-runner.ts has 4 new processors registered
    - IntelligenceCard renders briefing data with collapsible sections
    - DashboardClient renders IntelligenceCard when briefing data exists
    - app/page.tsx queries latest weekly_briefing and passes to dashboard
    - Build passes with no TypeScript errors
  </done>
</task>

</tasks>

<verification>
- `npx prisma validate` passes (schema is valid)
- `npx tsc --noEmit` passes (no TypeScript errors)
- `npm run build` succeeds (Next.js production build)
- `ls lib/agent/jobs/` shows 4 handler files
- `ls scripts/scheduler.ts` exists
- `grep scheduledFor prisma/schema.prisma` shows the new field
- `grep recurringCron prisma/schema.prisma` shows the new field
- `grep IntelligenceCard components/DashboardClient.tsx` shows the import and usage
</verification>

<success_criteria>
- AgentJob model has scheduledFor DateTime? and recurringCron String? with applied migration
- 4 job handlers in lib/agent/jobs/ (deal-check, maintenance-due, trip-weather-alert, weekly-briefing) with typed exports
- Scheduler script seeds 4 recurring jobs on first run, polls every 60s for due jobs
- Agent-runner registers all 4 new job processors
- IntelligenceCard shows latest weekly briefing on dashboard with collapsible deal/maintenance/weather sections
- Build passes, no TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/260404-joc-extend-agentjob-with-scheduled-recurring/260404-joc-SUMMARY.md`
</output>
