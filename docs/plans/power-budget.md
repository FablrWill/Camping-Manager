# Power Budget Calculator — Implementation Plan

> **Status:** Planning only — no code written yet
> **Author:** Claude (Session 14 planning, revised v2)
> **Pattern:** Deterministic math feature (no Claude API). Two modes: Planning (before trip) and Live (during trip). Same visual CTA pattern as PackingList and MealPlan.
> **Files to create/modify:** Listed per section below

---

## 1. Data Model

**Three new fields on `GearItem`. One migration.**

```prisma
model GearItem {
  // ... existing fields ...

  wattage      Float?    // Power draw in watts (consumers) or output in watts (solar panel)
  hoursPerDay  Float?    // Default hours of use per day. Falls back to lookup table if null.
  hasBattery   Boolean   @default(false)  // Has an internal rechargeable battery that needs charging before the trip
}
```

**Why these fields instead of hardcoding:**
- Will's gear set will grow (HA server, monitors, cameras, smart lights, battery banks). The hardcoded pattern table won't stay accurate. `wattage` lets each device be explicit.
- `hoursPerDay` lets Will override defaults (e.g., "I only use the monitor 6h/day on this trip" — future enhancement; for now the field exists and defaults to the lookup table).
- `hasBattery` drives the "Charge Before You Go" reminder checklist — a new section in the PowerBudget component. This flag is set once per gear item and persists forever.

### Trip additions (for live mode persistence)

```prisma
model Trip {
  // ... existing fields ...

  currentBatteryPct  Float?    // Last known EcoFlow battery %, entered during the trip
  batteryUpdatedAt   DateTime? // When currentBatteryPct was last set
}
```

**Why on Trip:** Will updates the battery level at camp, closes the app, reopens it later. Without persistence it resets to 100% (planning default) every time. Storing it on Trip means the live view picks up where he left off. Resets to null when the trip ends.

### Seed updates

Update existing gear items with known values:

| Gear Item | wattage | hoursPerDay | hasBattery |
|-----------|---------|-------------|------------|
| EcoFlow Delta 2 | null (battery, not a consumer) | null | false |
| EcoFlow 220W Solar Panel | 220 (output) | null | false |
| Starlink Mini | 30 | 12 | false |
| Garmin inReach Mini 2 | 1 | 24 | true |
| Helinox Chair One | null | null | false |
| MSR WindBurner | null | null | false |

Note: laptop and monitor are not in seed yet — Will will add them to gear inventory. The lookup table (see section 2) provides defaults until `wattage` is set explicitly.

---

## 2. Power Calculation Logic

### New file: `lib/power.ts`

#### Power sources

Will has three sources of power:
1. **Battery** — EcoFlow Delta 2, 1024Wh LFP. Starts at **100%** (app reminds Will to top off before the trip as part of prep).
2. **Solar** — EcoFlow 220W Bifacial Panel. Weather-adjusted daily harvest.
3. **Car** — Santa Fe Hybrid as a gas generator. 12V outlet (via BESTEK inverter) can charge the EcoFlow at ~100W while running. This is a backup/emergency source, not a daily calculation input. Shown in the UI as "Car (backup)" and mentioned in tips.

#### TypeScript interfaces

```typescript
export interface PowerDevice {
  id: string
  name: string
  role: 'battery' | 'solar' | 'car' | 'consumer'
  wattage: number         // W (draw for consumers; peak output for solar; capacity for battery)
  capacityWh?: number     // Only for battery role
  hoursPerDay: number     // Daily usage hours (0 for battery/solar/car)
  whPerDay: number        // Derived: wattage × hoursPerDay (0 for sources)
  sourceType: 'explicit' | 'parsed' | 'estimated'  // how wattage was determined
  hasBattery: boolean     // has internal rechargeable battery (from GearItem.hasBattery)
}

export interface DayPowerBudget {
  date: string            // YYYY-MM-DD
  dayLabel: string        // "Fri", "Sat"
  weatherLabel: string    // "Partly cloudy"
  weatherEmoji: string    // "⛅"
  weatherCode: number
  cloudFactor: number     // 0–1
  peakSunHoursEffective: number  // BASE_PSH × cloudFactor
  solarHarvestWh: number
  consumptionWh: number
  netWh: number           // harvest - consumption
  batteryStartWh: number
  batteryEndWh: number    // clamped 0–batteryCapacityWh
  batteryPercent: number
  status: 'surplus' | 'balanced' | 'deficit' | 'critical'
}

export interface PowerBudgetResult {
  mode: 'planning' | 'live'
  devices: PowerDevice[]
  batteryCapacityWh: number
  solarPanelWatts: number
  days: DayPowerBudget[]
  todayIndex: number | null        // index into days[] for "today" (only set in live mode)
  totalSolarWh: number
  totalConsumptionWh: number
  avgDailyConsumptionWh: number
  verdict: 'good' | 'tight' | 'insufficient'
  verdictMessage: string
  tips: string[]
  chargeReminders: ChargeReminder[]   // devices with hasBattery=true
  liveStatus: LiveStatus | null       // only in live mode
}

export interface ChargeReminder {
  id: string
  name: string
  category: string
}

// Live mode only — current-moment snapshot
export interface LiveStatus {
  currentBatteryPct: number       // what Will entered
  currentBatteryWh: number        // derived: pct × capacity
  updatedAt: string               // ISO timestamp — shown as "Updated 2h ago"
  currentSolarWph: number         // right-now solar output estimate (panel watts × cloud factor)
  hoursToEmpty: number | null     // at current net draw rate; null if solar > consumption
  hoursOfSolarLeft: number        // estimated sun hours remaining today
  priorityChargeNow: string[]     // device names to charge immediately (battery critically low)
  priorityChargeSoon: string[]    // device names to charge in next few hours
  alerts: LiveAlert[]
}

export interface LiveAlert {
  level: 'warning' | 'info'
  message: string
}
```

#### Device classification

**Battery detection:**
- `category === 'power'` AND (`name` or `description` contains `Wh` pattern OR name matches `Delta|Jackery|Bluetti|Goal Zero|power station`)
- Capacity = `parseBatteryCapacity()` — regex `/(\d+)\s*Wh/i` from name + description combined

**Solar detection:**
- `name` matches `/solar/i`
- Wattage = `item.wattage` if set, else regex `/(\d+)\s*W\b/i` from name

**Car:**
- Hardcoded — always present as a named backup source. Not fetched from DB.
- Shown in UI as "Car (backup)" in the sources list.

**Consumer detection:**
- Everything else in `category: { in: ['power', 'tools'] }` that is not the battery and not solar
- Exclude items where `condition === 'broken'`

#### Wattage resolution order (for consumers)

1. `item.wattage` if explicitly set — use as-is (`sourceType: 'explicit'`)
2. Parse from description — regex for `(\d+)[–-](\d+)\s*W` (range → average) or `\b(\d+)\s*W\b` (`sourceType: 'parsed'`)
3. Pattern lookup table (`sourceType: 'estimated'`)
4. Category fallback (`sourceType: 'estimated'`)
5. Skip if wattage resolves to 0

#### Hours-per-day resolution order (for consumers)

1. `item.hoursPerDay` if explicitly set
2. Pattern lookup table default
3. Category fallback (3h)

#### Pattern lookup table

```typescript
const CONSUMER_WATTAGE_TABLE: Array<{
  pattern: RegExp
  watts: number
  hoursPerDay: number
}> = [
  { pattern: /starlink/i,                       watts: 30,  hoursPerDay: 12 },  // low draw, on most of the day
  { pattern: /macbook|laptop|notebook/i,        watts: 65,  hoursPerDay: 10 },  // working while camping
  { pattern: /monitor|display|screen/i,         watts: 40,  hoursPerDay: 10 },  // external monitor
  { pattern: /ipad|tablet/i,                    watts: 20,  hoursPerDay: 4  },
  { pattern: /iphone|android|phone/i,           watts: 15,  hoursPerDay: 2  },
  { pattern: /camera|mirrorless|dslr/i,         watts: 10,  hoursPerDay: 2  },
  { pattern: /gopro|action cam/i,               watts: 5,   hoursPerDay: 3  },
  { pattern: /light|lamp|lantern/i,             watts: 10,  hoursPerDay: 4  },
  { pattern: /fan/i,                            watts: 25,  hoursPerDay: 6  },
  { pattern: /heater/i,                         watts: 150, hoursPerDay: 4  },
  { pattern: /cpap|bipap/i,                     watts: 30,  hoursPerDay: 8  },
  { pattern: /inreach|communicat|satellite/i,   watts: 1,   hoursPerDay: 24 },
  { pattern: /speaker|audio/i,                  watts: 10,  hoursPerDay: 4  },
  { pattern: /fridge|cooler.*electric/i,        watts: 45,  hoursPerDay: 24 },
  { pattern: /home assistant|ha server|server/i, watts: 10, hoursPerDay: 24 },
  { pattern: /hub|smart plug|smart switch/i,    watts: 3,   hoursPerDay: 24 },
  { pattern: /battery bank|power bank/i,        watts: 15,  hoursPerDay: 3  },  // charging a bank
]

const CATEGORY_FALLBACK: Record<string, { watts: number; hoursPerDay: number }> = {
  tools: { watts: 15, hoursPerDay: 2 },
  power: { watts: 20, hoursPerDay: 3 },
}
```

#### Cloud factor from WMO code

```typescript
function getCloudFactor(weatherCode: number): number {
  if (weatherCode === 0)                        return 0.95  // Clear sky
  if (weatherCode === 1)                        return 0.85  // Mainly clear
  if (weatherCode === 2)                        return 0.65  // Partly cloudy
  if (weatherCode === 3)                        return 0.25  // Overcast
  if (weatherCode >= 45 && weatherCode <= 57)   return 0.15  // Fog / drizzle
  if (weatherCode >= 61 && weatherCode <= 67)   return 0.12  // Rain
  if (weatherCode >= 71 && weatherCode <= 77)   return 0.10  // Snow
  if (weatherCode >= 80 && weatherCode <= 82)   return 0.15  // Showers
  if (weatherCode >= 95)                        return 0.10  // Thunderstorm
  return 0.60  // unknown — assume partly cloudy
}
```

#### Per-day math

```
BASE_PEAK_SUN_HOURS = 5.0     // NC/SE US average spring/summer
STARTING_BATTERY = 1.0        // 100% — app reminds Will to top off during prep

effectiveSunHours  = BASE_PEAK_SUN_HOURS × cloudFactor
solarHarvestWh     = solarPanelWatts × effectiveSunHours
consumptionWh      = Σ(device.wattage × device.hoursPerDay)  for all consumers
netWh              = solarHarvestWh - consumptionWh
batteryEndWh       = clamp(batteryStartWh + netWh, 0, batteryCapacityWh)
batteryPercent     = (batteryEndWh / batteryCapacityWh) × 100
```

Day 1 `batteryStartWh = batteryCapacityWh × STARTING_BATTERY`.
Each subsequent day: `batteryStartWh = previous day's batteryEndWh`.

**Day status thresholds:**
- `'surplus'` — batteryPercent ≥ 80
- `'balanced'` — batteryPercent 40–79
- `'deficit'` — batteryPercent 15–39
- `'critical'` — batteryPercent < 15

#### Main entry point — mode detection

```typescript
export function calculatePowerBudget(params: {
  gearItems: GearItem[]
  weather?: { days: WeatherDay[] }
  nights: number
  startDate: string
  // Live mode params — provided when trip is in progress
  currentBatteryPct?: number   // Will's entered value (0–100)
  currentTimeISO?: string      // now, from server: new Date().toISOString()
}): PowerBudgetResult
```

Mode is determined server-side:
- `startDate <= today <= endDate` AND `currentBatteryPct` provided → `'live'`
- Everything else → `'planning'`

In **planning mode**: start battery at 100%, iterate all trip days using forecast weather.

In **live mode**:
- Find today's index in the days array
- Start from `currentBatteryPct` on today's day
- For today: use remaining solar hours (sunset time − now) instead of full peak sun hours
- For future days: use forecast weather normally
- Past days (before today): shown as greyed-out history using original planning estimates

#### Live status calculation

```typescript
function buildLiveStatus(params: {
  currentBatteryPct: number
  batteryCapacityWh: number
  currentTimeISO: string
  todayForecast: WeatherDay         // today's weather with sunrise/sunset
  totalConsumptionWhPerDay: number
  solarPanelWatts: number
  chargeReminders: ChargeReminder[]
}): LiveStatus
```

Key calculations:

```
currentBatteryWh     = (currentBatteryPct / 100) × batteryCapacityWh
currentCloudFactor   = getCloudFactor(todayForecast.weatherCode)
currentSolarWph      = solarPanelWatts × currentCloudFactor  // watts right now (not Wh)

// Remaining sun today
sunsetTime           = parse(todayForecast.sunset)  // "7:58 PM" → Date
hoursOfSolarLeft     = max(0, (sunsetTime - now) / 3600000)
solarRemainingToday  = currentSolarWph × hoursOfSolarLeft × (BASE_PSH / 12)  // scale to effective hours

// Net rate: positive = charging, negative = draining
netWph               = currentSolarWph - (totalConsumptionWhPerDay / 24)  // Wh per hour
hoursToEmpty         = netWph >= 0 ? null : currentBatteryWh / Math.abs(netWph)
```

**Priority charge logic:**
- `priorityChargeNow` — any `chargeReminder` device that Will likely hasn't charged recently. Currently just includes everything if battery is below 40%. In future: track per-device charge state.
- `priorityChargeSoon` — when battery is between 40–70%, remind about devices before it drops further.

**Live alerts:**
```typescript
const alerts: LiveAlert[] = []

if (currentBatteryPct < 15)
  alerts.push({ level: 'warning', message: 'Battery critical — start the car or cut Starlink now' })
else if (currentBatteryPct < 30)
  alerts.push({ level: 'warning', message: `Battery at ${currentBatteryPct}% — consider charging from the car` })

if (hoursToEmpty !== null && hoursToEmpty < 4)
  alerts.push({ level: 'warning', message: `At current draw, battery runs out in ~${Math.round(hoursToEmpty)}h` })

if (hoursOfSolarLeft < 1 && currentBatteryPct < 50)
  alerts.push({ level: 'info', message: 'Solar window closing soon — harvest what you can before sunset' })

if (currentCloudFactor < 0.3)
  alerts.push({ level: 'info', message: 'Heavy cloud cover — solar output is minimal right now' })
```

#### Verdict + tips generation

```typescript
function deriveVerdict(days: DayPowerBudget[]): { verdict; verdictMessage; tips }
```

- `'insufficient'` — any day hits `critical`
- `'tight'` — any day hits `deficit`, none `critical`
- `'good'` — all days `balanced` or `surplus`

Message examples:
- `good`: "Battery ends the trip at 72% — you're well covered."
- `tight`: "Battery dips to 22% on Saturday. Charge from the car if needed."
- `insufficient`: "Battery runs out by Sunday morning. Reduce Starlink hours or charge from the car."

Auto-generated tips (contextual):
- Always: "Charge the EcoFlow to 100% before you leave — it's in your prep checklist below"
- Always: "The Santa Fe's 12V outlet (via BESTEK inverter) can add ~300Wh on the drive up"
- Cloudy days: "Heavy clouds forecast [day] — {cloudFactor < 0.3}: solar harvest will be minimal, lean on the car charger"
- Surplus: "You'll have extra power — top off your phone, camera, and portable banks each morning"
- Deficit/insufficient: "Limit Starlink to active use hours to save [Xh × 30W = Wh] per day"

#### Charge reminders

All `gearItems` where `hasBattery = true` become `ChargeReminder` entries. These are returned in the result and rendered as a checklist in the UI. This includes the EcoFlow Delta 2 itself (its `hasBattery` won't be set since it's classified as the main battery, but it appears in the battery source display). The reminder list is for *other* battery-powered devices: inReach, camp lights, camera batteries, portable battery banks, etc.

---

## 3. API Route

### New file: `app/api/power-budget/route.ts`

**Request:**
```typescript
// POST /api/power-budget
{
  tripId: string
  currentBatteryPct?: number   // 0–100. Present in live mode. Persisted to Trip.
}
```

**Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculatePowerBudget } from '@/lib/power'
import { fetchWeather } from '@/lib/weather'

export async function POST(request: NextRequest) {
  try {
    const { tripId, currentBatteryPct } = await request.json()
    if (!tripId) return NextResponse.json({ error: 'tripId is required' }, { status: 400 })

    // If a battery level was provided, persist it to the trip
    if (currentBatteryPct !== undefined && currentBatteryPct !== null) {
      await prisma.trip.update({
        where: { id: tripId },
        data: {
          currentBatteryPct,
          batteryUpdatedAt: new Date(),
        },
      })
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { location: true },
    })
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

    // Determine effective battery % for live mode:
    // Prefer freshly-submitted value → persisted value → null (planning mode)
    const effectiveBatteryPct =
      currentBatteryPct !== undefined ? currentBatteryPct
      : trip.currentBatteryPct !== null ? trip.currentBatteryPct
      : undefined

    // Fetch power and tools gear — consumers and sources live here
    // Also fetch items from ANY category that have wattage set or hasBattery=true
    // (future: Will may add an HA server in 'tools', a camp light in 'tools', etc.)
    const gearItems = await prisma.gearItem.findMany({
      where: {
        isWishlist: false,
        NOT: { condition: 'broken' },
        OR: [
          { category: { in: ['power', 'tools'] } },
          { wattage: { not: null } },         // any category with explicit wattage
          { hasBattery: true },               // any battery device, any category
        ],
      },
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        description: true,
        condition: true,
        wattage: true,
        hoursPerDay: true,
        hasBattery: true,
      },
      orderBy: { name: 'asc' },
    })

    const startDate = trip.startDate.toISOString().split('T')[0]
    const endDate = trip.endDate.toISOString().split('T')[0]
    const nights = Math.ceil(
      (trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    let weather = undefined
    if (trip.location?.latitude && trip.location?.longitude) {
      const daysOut = Math.ceil((trip.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysOut <= 16) {
        try {
          const forecast = await fetchWeather(
            trip.location.latitude,
            trip.location.longitude,
            startDate,
            endDate
          )
          weather = { days: forecast.days }
        } catch (err) {
          console.error('Weather fetch failed (non-blocking):', err)
        }
      }
    }

    const result = calculatePowerBudget({
      gearItems,
      weather,
      nights,
      startDate,
      currentBatteryPct: effectiveBatteryPct,
      currentTimeISO: new Date().toISOString(),
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Power budget calculation failed:', error)
    const message = error instanceof Error ? error.message : 'Failed to calculate power budget'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

---

## 4. UI Component Spec

### New file: `components/PowerBudget.tsx`

#### Props
```typescript
interface PowerBudgetProps {
  tripId: string
  tripName: string
}
```

#### State
```typescript
const [budget, setBudget] = useState<PowerBudgetResult | null>(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [showDays, setShowDays] = useState(false)
const [showDevices, setShowDevices] = useState(false)
const [chargeChecked, setChargeChecked] = useState<Record<string, boolean>>({})
```

#### Four render states

**State 1: Not generated — CTA**

```tsx
<div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">⚡ Power Budget</h3>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
        Solar + battery estimate, weather-adjusted
      </p>
    </div>
    <button
      onClick={calculate}
      className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-stone-900 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
    >
      Calculate
    </button>
  </div>
</div>
```

No "with Claude" — this is math, not AI.

**State 2: Loading**

```tsx
<div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
  <div className="flex items-center gap-2">
    <Loader2 size={16} className="animate-spin text-emerald-500" />
    <span className="text-sm text-stone-500 dark:text-stone-400">Calculating power budget...</span>
  </div>
</div>
```

**State 3: Error** — same pattern as PackingList/MealPlan.

**State 4: Results**

```tsx
<div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
```

**Header — verdict badge + recalculate:**

```tsx
<div className="p-4 border-b border-stone-100 dark:border-stone-800">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">⚡ Power Budget</h3>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
        budget.verdict === 'good'         ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' :
        budget.verdict === 'tight'        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' :
                                            'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
      }`}>
        {budget.verdict === 'good' ? 'Covered' : budget.verdict === 'tight' ? 'Tight' : 'Not enough'}
      </span>
    </div>
    <button onClick={calculate} className="text-xs text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors">
      <RotateCcw size={12} /> Recalculate
    </button>
  </div>
  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{budget.verdictMessage}</p>
</div>
```

**Power sources summary — Battery + Solar + Car:**

```tsx
<div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-stone-100 dark:border-stone-800">
  <div className="text-center">
    <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Battery</p>
    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
      {budget.batteryCapacityWh} Wh
    </p>
    <p className="text-[10px] text-stone-400 dark:text-stone-500">100% at start</p>
  </div>
  <div className="text-center border-x border-stone-100 dark:border-stone-800">
    <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Solar</p>
    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
      {budget.solarPanelWatts}W panel
    </p>
    <p className="text-[10px] text-stone-400 dark:text-stone-500">weather-adjusted</p>
  </div>
  <div className="text-center">
    <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Car</p>
    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mt-0.5">backup</p>
    <p className="text-[10px] text-stone-400 dark:text-stone-500">12V + BESTEK</p>
  </div>
</div>
```

**Daily stats bar:**

```tsx
<div className="px-4 py-3 flex items-center gap-4 border-b border-stone-100 dark:border-stone-800">
  <div>
    <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Avg daily draw</p>
    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
      {Math.round(budget.avgDailyConsumptionWh)} Wh
    </p>
  </div>
  <div className="h-8 w-px bg-stone-100 dark:bg-stone-800" />
  <div>
    <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Avg daily solar</p>
    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
      {Math.round(budget.totalSolarWh / budget.days.length)} Wh
    </p>
  </div>
  <div className="h-8 w-px bg-stone-100 dark:bg-stone-800" />
  <div>
    <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Trip end battery</p>
    <p className={`text-sm font-semibold ${
      budget.days[budget.days.length - 1]?.batteryPercent >= 40 ? 'text-emerald-600 dark:text-emerald-400' :
      budget.days[budget.days.length - 1]?.batteryPercent >= 15 ? 'text-amber-600 dark:text-amber-400' :
                                                                    'text-red-600 dark:text-red-400'
    }`}>
      {Math.round(budget.days[budget.days.length - 1]?.batteryPercent ?? 0)}%
    </p>
  </div>
</div>
```

**Charge Before You Go — checklist** (only shown if chargeReminders.length > 0):

```tsx
{budget.chargeReminders.length > 0 && (
  <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 bg-amber-50/50 dark:bg-amber-950/20">
    <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
      🔋 Charge Before You Go
    </h4>
    <div className="space-y-1">
      {/* Always include the EcoFlow Delta 2 first — it's always in the charge list */}
      <label className="flex items-center gap-2.5 py-1 cursor-pointer group">
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          chargeChecked['ecoflow-main']
            ? 'bg-emerald-600 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-500'
            : 'border-stone-300 dark:border-stone-600 group-hover:border-emerald-400'
        }`}>
          {chargeChecked['ecoflow-main'] && <Check size={10} className="text-white dark:text-stone-900" strokeWidth={3} />}
        </div>
        <input type="checkbox" checked={chargeChecked['ecoflow-main'] ?? false}
          onChange={() => toggleCharge('ecoflow-main')} className="sr-only" />
        <span className={`text-sm transition-colors ${chargeChecked['ecoflow-main'] ? 'line-through text-stone-400 dark:text-stone-600' : 'text-stone-900 dark:text-stone-100'}`}>
          EcoFlow Delta 2 — charge to 100%
        </span>
      </label>
      {/* Device reminders from hasBattery=true gear */}
      {budget.chargeReminders.map((reminder) => (
        <label key={reminder.id} className="flex items-center gap-2.5 py-1 cursor-pointer group">
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            chargeChecked[reminder.id]
              ? 'bg-emerald-600 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-500'
              : 'border-stone-300 dark:border-stone-600 group-hover:border-emerald-400'
          }`}>
            {chargeChecked[reminder.id] && <Check size={10} className="text-white dark:text-stone-900" strokeWidth={3} />}
          </div>
          <input type="checkbox" checked={chargeChecked[reminder.id] ?? false}
            onChange={() => toggleCharge(reminder.id)} className="sr-only" />
          <span className={`text-sm transition-colors ${chargeChecked[reminder.id] ? 'line-through text-stone-400 dark:text-stone-600' : 'text-stone-900 dark:text-stone-100'}`}>
            {reminder.name}
          </span>
        </label>
      ))}
    </div>
  </div>
)}
```

**Day-by-day breakdown** — collapsible:

```tsx
<div className="border-b border-stone-100 dark:border-stone-800">
  <button onClick={() => setShowDays(!showDays)}
    className="w-full p-4 flex items-center justify-between">
    <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
      📅 Day by Day
    </h4>
    <ChevronDown size={14} className={`text-stone-400 transition-transform ${showDays ? 'rotate-180' : ''}`} />
  </button>
  {showDays && (
    <div className="px-4 pb-4 space-y-4">
      {budget.days.map((day) => (
        <div key={day.date}>
          {/* Day label + weather */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
              {day.dayLabel} · {day.date}
            </span>
            <span className="text-xs text-stone-400 dark:text-stone-500">
              {day.weatherEmoji} {day.weatherLabel}
            </span>
          </div>
          {/* Battery bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  day.status === 'critical' ? 'bg-red-500' :
                  day.status === 'deficit'  ? 'bg-amber-500' :
                                              'bg-emerald-500'
                }`}
                style={{ width: `${day.batteryPercent}%` }}
              />
            </div>
            <span className={`text-xs font-medium w-10 text-right shrink-0 ${
              day.status === 'critical' ? 'text-red-600 dark:text-red-400' :
              day.status === 'deficit'  ? 'text-amber-600 dark:text-amber-400' :
                                          'text-emerald-600 dark:text-emerald-400'
            }`}>
              {Math.round(day.batteryPercent)}%
            </span>
          </div>
          {/* Wh stats */}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-stone-400 dark:text-stone-500">
              ☀️ +{Math.round(day.solarHarvestWh)} Wh
              {day.cloudFactor < 0.5 && <span className="text-amber-500"> ({Math.round(day.cloudFactor * 100)}% efficiency)</span>}
            </span>
            <span className="text-[10px] text-stone-400 dark:text-stone-500">
              🔋 −{Math.round(day.consumptionWh)} Wh
            </span>
            <span className={`text-[10px] font-medium ${day.netWh >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              Net: {day.netWh >= 0 ? '+' : ''}{Math.round(day.netWh)} Wh
            </span>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

**Device breakdown** — collapsible, sorted by draw (highest first):

```tsx
<div className="border-b border-stone-100 dark:border-stone-800">
  <button onClick={() => setShowDevices(!showDevices)}
    className="w-full p-4 flex items-center justify-between">
    <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
      🔌 Connected Devices
    </h4>
    <ChevronDown size={14} className={`text-stone-400 transition-transform ${showDevices ? 'rotate-180' : ''}`} />
  </button>
  {showDevices && (
    <div className="px-4 pb-4 space-y-1">
      {budget.devices
        .filter((d) => d.role === 'consumer' && d.whPerDay > 0)
        .sort((a, b) => b.whPerDay - a.whPerDay)
        .map((device) => (
          <div key={device.id} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm text-stone-700 dark:text-stone-300 truncate">{device.name}</span>
              {device.sourceType === 'estimated' && (
                <span className="text-[10px] text-stone-400 shrink-0">~est.</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-xs text-stone-400 dark:text-stone-500">
                {device.wattage}W × {device.hoursPerDay}h
              </span>
              <span className="text-xs font-medium text-stone-600 dark:text-stone-400 w-16 text-right">
                {Math.round(device.whPerDay)} Wh/day
              </span>
            </div>
          </div>
        ))}
      <p className="text-[10px] text-stone-400 dark:text-stone-500 pt-2">
        Set wattage on gear items for more accurate estimates
      </p>
    </div>
  )}
</div>
```

**Tips section:**

```tsx
{budget.tips.length > 0 && (
  <div className="p-4 bg-stone-50 dark:bg-stone-800/50">
    <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
      💡 Power Tips
    </h4>
    <ul className="space-y-1.5">
      {budget.tips.map((tip, i) => (
        <li key={i} className="text-sm text-stone-600 dark:text-stone-300 flex gap-2">
          <span className="text-emerald-500 shrink-0">•</span>
          {tip}
        </li>
      ))}
    </ul>
  </div>
)}
```

#### Imports

```typescript
import { useState } from 'react'
import { Loader2, RotateCcw, ChevronDown, Check } from 'lucide-react'
import type { PowerBudgetResult } from '@/lib/power'
```

---

## 5. Live Mode UI

The component detects mode from `budget.mode`. Planning mode = trip hasn't started yet. Live mode = trip is currently in progress (`startDate <= today <= endDate`).

### Live mode: "Update Status" entry point

When live mode is active (trip is in progress) and no battery level has been entered yet, the CTA changes:

```tsx
// Planning mode CTA: "Calculate"
// Live mode CTA (no level set): "Update Status"
<button onClick={() => setShowLiveInput(true)} className="...emerald...">
  Update Status
</button>
```

Tapping "Update Status" reveals an inline input form (no modal — inline, same card):

```tsx
{showLiveInput && (
  <div className="mt-3 p-3 bg-stone-50 dark:bg-stone-800/60 rounded-lg space-y-3">
    <div>
      <label className="text-xs font-medium text-stone-600 dark:text-stone-400">
        EcoFlow battery level right now
      </label>
      <div className="flex items-center gap-3 mt-1">
        <input
          type="range" min={0} max={100} step={5}
          value={inputBatteryPct}
          onChange={(e) => setInputBatteryPct(Number(e.target.value))}
          className="flex-1 accent-emerald-600"
        />
        <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 w-12 text-right">
          {inputBatteryPct}%
        </span>
      </div>
    </div>
    <div className="flex gap-2">
      <button onClick={submitLiveUpdate} className="...emerald filled...">
        Update
      </button>
      <button onClick={() => setShowLiveInput(false)} className="...ghost...">
        Cancel
      </button>
    </div>
  </div>
)}
```

Tapping "Update" calls `calculate()` with `currentBatteryPct` included in the POST body.

### Live mode: results header

The header adds a "LIVE" badge and a timestamp:

```tsx
<div className="p-4 border-b border-stone-100 dark:border-stone-800">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">⚡ Power Budget</h3>
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
        LIVE
      </span>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${verdictColor}`}>
        {verdictLabel}
      </span>
    </div>
    <button onClick={() => setShowLiveInput(true)} className="text-xs text-stone-400 hover:text-emerald-600 flex items-center gap-1">
      <RefreshCw size={12} /> Update
    </button>
  </div>
  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
    Updated {formatRelativeTime(budget.liveStatus.updatedAt)} · {budget.liveStatus.currentBatteryPct}% battery
  </p>
</div>
```

### Live mode: alerts bar (shown above everything else when alerts exist)

```tsx
{budget.liveStatus.alerts.length > 0 && (
  <div className="px-4 py-2 space-y-1 border-b border-stone-100 dark:border-stone-800">
    {budget.liveStatus.alerts.map((alert, i) => (
      <div key={i} className={`flex items-start gap-2 text-sm ${
        alert.level === 'warning'
          ? 'text-red-700 dark:text-red-400'
          : 'text-amber-700 dark:text-amber-400'
      }`}>
        <span className="shrink-0">{alert.level === 'warning' ? '⚠️' : 'ℹ️'}</span>
        {alert.message}
      </div>
    ))}
  </div>
)}
```

### Live mode: "Right Now" section (replaces static summary stats row)

```tsx
<div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-stone-100 dark:border-stone-800">
  <div className="text-center">
    <p className="text-[10px] text-stone-400 uppercase tracking-wider">Battery</p>
    <p className={`text-sm font-semibold mt-0.5 ${batteryColor}`}>
      {budget.liveStatus.currentBatteryPct}%
    </p>
    <p className="text-[10px] text-stone-400">{Math.round(budget.liveStatus.currentBatteryWh)} Wh</p>
  </div>
  <div className="text-center border-x border-stone-100 dark:border-stone-800">
    <p className="text-[10px] text-stone-400 uppercase tracking-wider">Solar now</p>
    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
      ~{Math.round(budget.liveStatus.currentSolarWph)}W
    </p>
    <p className="text-[10px] text-stone-400">
      {Math.round(budget.liveStatus.hoursOfSolarLeft * 10) / 10}h sun left
    </p>
  </div>
  <div className="text-center">
    <p className="text-[10px] text-stone-400 uppercase tracking-wider">
      {budget.liveStatus.hoursToEmpty === null ? 'Charging' : 'Runs out'}
    </p>
    <p className={`text-sm font-semibold mt-0.5 ${hoursColor}`}>
      {budget.liveStatus.hoursToEmpty === null
        ? '☀️ net +'
        : `~${Math.round(budget.liveStatus.hoursToEmpty)}h`}
    </p>
    <p className="text-[10px] text-stone-400">at current draw</p>
  </div>
</div>
```

### Live mode: priority charge list

Shown between the stats row and the day-by-day when there are items to charge:

```tsx
{(budget.liveStatus.priorityChargeNow.length > 0 || budget.liveStatus.priorityChargeSoon.length > 0) && (
  <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
    {budget.liveStatus.priorityChargeNow.length > 0 && (
      <div className="mb-2">
        <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
          ⚡ Charge Now
        </p>
        {budget.liveStatus.priorityChargeNow.map((name) => (
          <p key={name} className="text-sm text-stone-900 dark:text-stone-100">• {name}</p>
        ))}
      </div>
    )}
    {budget.liveStatus.priorityChargeSoon.length > 0 && (
      <div>
        <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
          Charge Soon
        </p>
        {budget.liveStatus.priorityChargeSoon.map((name) => (
          <p key={name} className="text-sm text-stone-700 dark:text-stone-300">• {name}</p>
        ))}
      </div>
    )}
  </div>
)}
```

### Live mode: day-by-day with "Today" marker

Past days rendered with reduced opacity. Today highlighted. Future days normal.

```tsx
{budget.days.map((day, i) => {
  const isPast   = budget.todayIndex !== null && i < budget.todayIndex
  const isToday  = budget.todayIndex === i
  const isFuture = budget.todayIndex !== null && i > budget.todayIndex

  return (
    <div key={day.date} className={isPast ? 'opacity-40' : ''}>
      {isToday && (
        <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
          ← Today
        </div>
      )}
      {/* same day content as planning mode */}
    </div>
  )
})}
```

The planning-mode "Charge Before You Go" checklist is **hidden in live mode** (replaced by the priority charge list above).

### Additional state for live mode

```typescript
const [showLiveInput, setShowLiveInput] = useState(false)
const [inputBatteryPct, setInputBatteryPct] = useState(80)  // default slider position
```

---

## 6. Gear Edit Form — New Fields

When adding/editing gear, two new fields need to appear:

**`wattage` field** (for power/tools category items — or any item):
```tsx
<label>
  <span>Power draw (watts)</span>
  <input type="number" value={form.wattage ?? ''} onChange={...} placeholder="e.g. 30" />
  <span>Leave blank to auto-estimate</span>
</label>
```

**`hasBattery` checkbox** (for all items):
```tsx
<label>
  <input type="checkbox" checked={form.hasBattery} onChange={...} />
  <span>Has internal battery — remind me to charge before trips</span>
</label>
```

These appear in the gear add/edit form (`components/GearForm.tsx` or wherever gear CRUD is handled — check exact file at build time).

---

## 6. Integration into TripsClient.tsx

Same pattern as MealPlan. Add PowerBudget below MealPlan in the `{!isPast && (...)}` block.

```tsx
{!isPast && (
  <div className="space-y-3">
    <PackingList tripId={trip.id} tripName={trip.name} />
    <MealPlan tripId={trip.id} tripName={trip.name} />
    <PowerBudget tripId={trip.id} tripName={trip.name} />
  </div>
)}
```

Add import: `import PowerBudget from '@/components/PowerBudget'`

---

## 7. Edge Cases

### No battery found

Returns `batteryCapacityWh: 0`, verdict `'insufficient'`, verdictMessage explains it. No crash.

### No solar panel found

`solarPanelWatts: 0`, `solarHarvestWh: 0` for all days. Battery drains at consumption rate. Tips suggest adding a panel.

### No consumers found

`consumptionWh: 0`, verdict `'good'`, tip: "No powered devices detected — add Starlink, laptop, etc. to your gear inventory for an accurate estimate."

### No weather data

All days use `cloudFactor: 0.60` (partly cloudy fallback). Tips note the fallback.

### Broken gear

Filtered out in the API query via `NOT: { condition: 'broken' }`. If battery is broken, same as not found.

### `wattage` not set on a device

Falls through to description parsing → lookup table → category fallback. Shown as "~est." in the devices list.

### Trip longer than battery + solar

Days in `critical` range shown in red. Verdict `'insufficient'`. Tips about car charging + reducing Starlink hours.

---

## 8. Files Changed — Summary

| File | Action | What |
|------|--------|------|
| `prisma/schema.prisma` | **Edit** | Add `wattage Float?`, `hoursPerDay Float?`, `hasBattery Boolean @default(false)` to GearItem |
| `prisma/migrations/…` | **Create** | Auto-generated migration for the three new fields |
| `prisma/seed.ts` | **Edit** | Add wattage + hasBattery values to existing gear items (inReach, Starlink, etc.) |
| `lib/power.ts` | **Create** | All calculation logic: classification, wattage resolution, cloud factors, day math, verdict, charge reminders |
| `app/api/power-budget/route.ts` | **Create** | POST endpoint. Fetches trip + gear + weather, calls `calculatePowerBudget`. |
| `components/PowerBudget.tsx` | **Create** | Full UI component: CTA → results with verdict, sources, charge checklist, day-by-day, devices, tips |
| `components/TripsClient.tsx` | **Edit** | Import and render `<PowerBudget />` below `<MealPlan />` in upcoming trip cards |
| Gear CRUD form | **Edit** | Add `wattage` number input + `hasBattery` checkbox to the gear add/edit form |

**No new npm dependencies.**

---

## 9. Testing Checklist

1. **Migration runs** — `npx prisma migrate dev` succeeds, schema has new fields
2. **Seed runs** — `npx prisma db seed` succeeds, gear items have wattage + hasBattery values
3. **Calculate button** appears on upcoming trip cards only
4. **Verdict badge** correct color (green/amber/red) and label
5. **Verdict message** is a complete sentence with specific numbers
6. **Sources row** shows battery Wh, solar watts, Car backup
7. **Daily stats** show avg draw, avg solar, end-of-trip battery %
8. **Charge checklist** shows EcoFlow + all hasBattery=true gear items
9. **Checkboxes** in charge list check/uncheck and cross out labels
10. **Day-by-day** expands/collapses, shows correct bar colors per day status
11. **Cloud efficiency** note appears when cloudFactor < 0.5 (amber)
12. **Net Wh** shows correct sign (+/−)
13. **Devices list** expands/collapses, sorted highest draw first
14. **"~est."** label appears for estimated wattages
15. **Tips** include car charging tip and any weather-specific tips
16. **Recalculate** resets all state
17. **Error state** shows retry button
18. **Dark mode** — all elements render correctly
19. **No battery in inventory** — graceful message
20. **Gear edit form** — wattage field and hasBattery checkbox save correctly

---

## 10. Live Mode — Phase 2 Extensions

These features build directly on live mode but are out of scope for this session. They're listed here so the v1 data structures are designed to support them.

### Photo-based battery scanning (Claude Vision)

Will takes a photo of a device's battery indicator (the EcoFlow display showing 67%, a camp light's LED dots, a laptop menu bar) — the app reads it.

**New API route: `POST /api/power-budget/scan-battery`**

```typescript
// Accepts multipart form with image file
// Returns: { batteryPct: number, confidence: 'high' | 'low', deviceHint: string }
```

Claude Vision prompt:
```
Look at this photo. Find any battery level indicator — a percentage number, LED dots,
a fuel gauge, or any visual indicator of remaining charge.
Return JSON: { "batteryPct": <0-100 or null if not found>, "confidence": "high|low", "deviceHint": "<what device you see>" }
```

**UI integration:** Camera icon button next to the slider in live mode. On tap, opens device camera. Image sent to scan-battery endpoint. On success, pre-fills the slider at the detected percentage. Will reviews it and taps "Update" to confirm.

This handles any device: EcoFlow display, Jackery screen, a light with battery dots, even a phone screenshot of a device's charge state.

### HA auto-update (Phase 3 — when HA bridge is live)

When Home Assistant is connected (~mid-April 2026 per TASKS.md), the power budget can receive live data automatically instead of requiring manual input.

**What HA provides:**
- Real-time wattage draw per device via smart plugs with energy monitoring (e.g., SONOFF S31 Lite)
- Battery % for Bluetooth devices that HA can read (lights, sensors, etc.)
- Solar panel current output via EcoFlow → HA integration

**Architecture:**
- HA pushes entity state changes via WebSocket to the app's existing HA bridge (Phase 3)
- Power budget subscribes to relevant entity updates on mount when trip is in progress
- When a wattage or battery reading comes in, auto-recalculates and re-renders without a manual "Update" tap
- UI shows "⚡ Live via HA" instead of "Updated 2h ago"

**Bridging to this plan:**
- `GearItem` will have a `haIntegration` field (already planned in TASKS.md Smart Campsite section)
- When `haIntegration` is set, the power budget prefers HA state over manual entry
- The `wattage` field becomes a fallback when HA data is unavailable

---

## 11. Future Enhancements (longer term)

- **`hoursPerDay` override per trip** — "I'll only use Starlink 4h/day on this trip." Requires a per-trip device config model.
- **Car charging modeling** — if driving day is in the trip timeline, add estimated Wh from 12V charging during transit.
- **Shore power** — if trip location has hookup, flag it and skip the solar/battery math.
- **Multiple solar panels** — currently finds first solar item. Sum wattage when Will has two panels.
- **Real peak sun hours by lat/lng** — Open-Meteo hourly shortwave radiation could replace the fixed 5.0h base.
