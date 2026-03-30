# Meal Planning — Implementation Plan

> **Status:** ✅ Implemented (Session 13)
> **Author:** Claude (Session 12 planning)
> **Pattern:** Follows packing list implementation (Claude API + trip context → structured output → editable UI)
> **Files to create/modify:** Listed per section below

---

## 1. Data Model

**No new Prisma models needed.** The meal plan is ephemeral — generated on demand, held in component state, not persisted to the database. This matches how the packing list works today. Persistence (saving a generated meal plan) is a future enhancement, not in scope.

**No schema changes. No migration.**

**Rationale:** Will generates the meal plan during Wednesday-before-Saturday prep. He shops from it, then the trip happens. There's no need to query historical meal plans or build analytics on them. If we add persistence later, it would be a `MealPlan` model with a `tripId` FK and a JSON blob column — but that's not needed now.

---

## 2. Claude Prompt Engineering

### New function in `lib/claude.ts`: `generateMealPlan()`

#### TypeScript interfaces (add to `lib/claude.ts`)

```typescript
export interface MealPlanMeal {
  name: string               // "Sous Vide Steak with Roasted Potatoes"
  prepType: 'home' | 'camp'  // where the primary cooking happens
  prepNotes: string           // "Sous vide at 130°F for 2hrs, vacuum seal. At camp: sear 90sec/side on cast iron."
  ingredients: string[]       // ["2 ribeye steaks", "1 lb baby potatoes", "olive oil", "salt & pepper"]
  cookwareNeeded: string[]    // ["cast iron skillet", "tongs"] — from gear inventory where possible
}

export interface MealPlanDay {
  dayNumber: number           // 1, 2, 3...
  dayLabel: string            // "Friday", "Saturday"
  date: string                // "2026-04-04"
  meals: {
    breakfast: MealPlanMeal
    lunch: MealPlanMeal
    dinner: MealPlanMeal
    snacks: string[]          // ["Trail mix", "Beef jerky", "Apples"]
  }
}

export interface ShoppingItem {
  name: string                // "2 ribeye steaks"
  section: string             // "meat", "produce", "dairy", "pantry", "frozen", "bakery", "drinks", "other"
  forMeal: string             // "Day 1 Dinner" — helps Will remember why he's buying it
}

export interface MealPlanResult {
  days: MealPlanDay[]
  shoppingList: ShoppingItem[]
  prepTimeline: string[]      // ["Wednesday evening: Sous vide steaks (2hrs)", "Thursday morning: Vacuum seal all proteins"]
  tips: string[]              // ["Pre-chop veggies and store in ziplock bags to save camp time"]
}
```

#### Prompt template

```typescript
export async function generateMealPlan(params: {
  tripName: string
  startDate: string
  endDate: string
  nights: number
  people: number
  locationName?: string
  vehicleName?: string
  tripNotes?: string
  cookingGear: GearItem[]     // filtered to category === 'cook'
  weather?: {
    days: WeatherDay[]
    alerts: WeatherAlert[]
  }
}): Promise<MealPlanResult> {
```

The `people` parameter defaults to 1 in the API route if not provided. The UI does not expose this field yet — it's hardcoded to 1 for now. (Will camps solo most of the time. Multi-person support is a future enhancement.)

**Full prompt text:**

```
You are a car camping meal planner. Generate a practical, delicious meal plan for this trip.

TRIP DETAILS:
- Name: ${tripName}
- Dates: ${startDate} to ${endDate} (${nights} night${nights !== 1 ? 's' : ''})
- People: ${people}
${locationName ? `- Location: ${locationName}` : ''}
${vehicleName ? `- Vehicle: ${vehicleName}` : ''}
${tripNotes ? `- Notes: ${tripNotes}` : ''}

${weatherSection}

COOKING EQUIPMENT (from gear inventory):
${cookingGearSection || 'No cooking gear in inventory — suggest simple no-cook meals and recommend basic gear to add.'}

MEAL PREP STRATEGY:
The user has a vacuum sealer (with bag rolls) and sous vide machine at home. Pre-trip prep is preferred:
- Proteins should be sous vide'd and vacuum sealed at home when practical
- Vegetables can be pre-chopped and bagged
- Sauces and marinades can be pre-portioned
- At camp, meals should be simple: reheat, sear, or assemble
- Minimize camp cleanup — one-pan meals, foil packets, pre-sealed ingredients

INSTRUCTIONS:
1. Plan breakfast, lunch, dinner, and snacks for each day.
2. Day 1 starts with lunch or dinner (arrival day — breakfast eaten before departure). Last day ends with breakfast (pack-up day).
3. Mark each meal as "home" prep (vacuum sealed, pre-cooked) or "camp" prep (cooked at campsite).
4. Use the cooking equipment listed. Don't suggest gear the user doesn't own unless absolutely necessary.
5. Adjust for weather: cold nights = hot soups and stews. Hot days = lighter meals, no-cook lunches.
6. Include a prep timeline: what to do at home before departure (e.g., "Wednesday evening: sous vide steaks").
7. Generate a shopping list grouped by store section.
8. Include 2-3 practical tips.

Respond ONLY with valid JSON matching this exact structure:
{
  "days": [
    {
      "dayNumber": 1,
      "dayLabel": "Friday",
      "date": "2026-04-04",
      "meals": {
        "breakfast": null,
        "lunch": {
          "name": "Turkey & Avocado Wraps",
          "prepType": "camp",
          "prepNotes": "Assemble at camp. Keep avocado whole until ready.",
          "ingredients": ["4 flour tortillas", "1/2 lb deli turkey", "1 avocado", "handful spinach", "mustard"],
          "cookwareNeeded": []
        },
        "dinner": {
          "name": "Sous Vide Ribeye with Foil Packet Potatoes",
          "prepType": "home",
          "prepNotes": "Sous vide at 130°F for 2hrs at home. Vacuum seal. At camp: sear 90sec/side on cast iron. Potatoes in foil on grate.",
          "ingredients": ["2 ribeye steaks", "1 lb baby potatoes", "butter", "garlic", "rosemary", "salt & pepper", "aluminum foil"],
          "cookwareNeeded": ["cast iron skillet", "camp grate"]
        },
        "snacks": ["Trail mix", "Beef jerky", "Apples"]
      }
    }
  ],
  "shoppingList": [
    { "name": "2 ribeye steaks", "section": "meat", "forMeal": "Day 1 Dinner" },
    { "name": "1 lb baby potatoes", "section": "produce", "forMeal": "Day 1 Dinner" }
  ],
  "prepTimeline": [
    "Wednesday evening: Sous vide steaks at 130°F for 2 hours",
    "Thursday morning: Vacuum seal all proteins and pre-chopped veggies",
    "Thursday evening: Pack cooler with ice packs — frozen meals on bottom, fresh on top"
  ],
  "tips": [
    "Freeze vacuum-sealed meals flat — they stack better in the cooler and act as ice packs",
    "Pre-chop all veggies into ziplock bags labeled by meal"
  ]
}

Rules for the JSON:
- Day 1 breakfast is null if trip starts with an afternoon arrival
- Last day should only have breakfast (and maybe a departure snack)
- "prepType" is "home" or "camp"
- "section" values: produce, meat, dairy, pantry, frozen, bakery, drinks, other
- "forMeal" references which day/meal uses this item (helps while shopping)
- "cookwareNeeded" references equipment from the gear list where possible
- Keep meal names appetizing but concise
- Keep ingredients as a shopping-ready list (include quantities)
- Do NOT wrap JSON in markdown code blocks
```

#### Building `cookingGearSection`

```typescript
const cookingGear = params.cookingGear
const cookingGearSection = cookingGear.length > 0
  ? cookingGear
      .map(
        (i) =>
          `- ${i.name}${i.brand ? ` (${i.brand})` : ''}${i.condition === 'broken' ? ' [BROKEN]' : ''}`
      )
      .join('\n')
  : ''
```

#### Weather section

Reuse the exact same `weatherSection` builder from `generatePackingList`. Extract it into a shared helper:

```typescript
function buildWeatherSection(weather?: { days: WeatherDay[]; alerts: WeatherAlert[] }): string {
  if (!weather) return 'WEATHER: Not available — plan for variable conditions.'
  return `WEATHER FORECAST:
${weather.days
  .map(
    (d) =>
      `${d.dayLabel} ${d.date}: ${d.weatherLabel}, High ${d.highF}°F / Low ${d.lowF}°F, ${d.precipProbability}% rain, Wind ${d.windMaxMph} mph`
  )
  .join('\n')}
${weather.alerts.length > 0 ? `\nALERTS:\n${weather.alerts.map((a) => `- [${a.severity.toUpperCase()}] ${a.message}`).join('\n')}` : ''}`
}
```

Both `generatePackingList` and `generateMealPlan` should call this helper. Refactor in place — no new files.

#### Model and token limit

```typescript
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4000,   // meal plans are longer than packing lists
  messages: [{ role: 'user', content: prompt }],
})
```

Use `max_tokens: 4000` (packing list uses 2000). Meal plans are 2-3x longer due to ingredients lists and shopping items.

---

## 3. API Route

### New file: `app/api/meal-plan/route.ts`

#### Request shape

```typescript
// POST /api/meal-plan
// Body:
{
  tripId: string   // required
}
```

#### Implementation (follows packing-list/route.ts exactly)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateMealPlan } from '@/lib/claude'
import { fetchWeather } from '@/lib/weather'

export async function POST(request: NextRequest) {
  try {
    const { tripId } = await request.json()

    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 })
    }

    // Fetch trip with relations
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { location: true, vehicle: true },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Fetch ONLY cooking gear (category === 'cook', not wishlist)
    const cookingGear = await prisma.gearItem.findMany({
      where: { isWishlist: false, category: 'cook' },
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        weight: true,
        condition: true,
      },
      orderBy: { name: 'asc' },
    })

    const startDate = trip.startDate.toISOString().split('T')[0]
    const endDate = trip.endDate.toISOString().split('T')[0]
    const nights = Math.ceil(
      (trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Fetch weather (same logic as packing-list route)
    let weather = undefined
    if (trip.location?.latitude && trip.location?.longitude) {
      const daysOut = Math.ceil(
        (trip.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      if (daysOut <= 16) {
        try {
          const forecast = await fetchWeather(
            trip.location.latitude,
            trip.location.longitude,
            startDate,
            endDate
          )
          weather = { days: forecast.days, alerts: forecast.alerts }
        } catch (err) {
          console.error('Weather fetch failed (non-blocking):', err)
        }
      }
    }

    const mealPlan = await generateMealPlan({
      tripName: trip.name,
      startDate,
      endDate,
      nights,
      people: 1,  // hardcoded for now — Will camps solo
      locationName: trip.location?.name,
      vehicleName: trip.vehicle?.name,
      tripNotes: trip.notes ?? undefined,
      cookingGear,
      weather,
    })

    return NextResponse.json(mealPlan)
  } catch (error) {
    console.error('Meal plan generation failed:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate meal plan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

#### Response shape

Returns `MealPlanResult` as JSON (see interfaces in section 2).

---

## 4. UI Component Spec

### New file: `components/MealPlan.tsx`

#### Props

```typescript
interface MealPlanProps {
  tripId: string
  tripName: string
}
```

#### State

```typescript
const [mealPlan, setMealPlan] = useState<MealPlanResult | null>(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [shoppingChecked, setShoppingChecked] = useState<Record<string, boolean>>({})
const [expandedMeal, setExpandedMeal] = useState<string | null>(null)  // "day1-dinner"
const [showShopping, setShowShopping] = useState(false)
const [showPrepTimeline, setShowPrepTimeline] = useState(false)
```

#### Four render states (same pattern as PackingList)

**State 1: Not generated yet — CTA**

```tsx
<div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
        🍳 Meal Plan
      </h3>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
        AI-generated meals + shopping list
      </p>
    </div>
    <button
      onClick={generate}
      className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
    >
      Generate with Claude
    </button>
  </div>
</div>
```

**State 2: Loading**

```tsx
<div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
  <div className="flex items-center gap-2 mb-4">
    <Loader2 size={16} className="animate-spin text-amber-500" />
    <span className="text-sm text-stone-500 dark:text-stone-400">
      Claude is planning your meals...
    </span>
  </div>
  <div className="space-y-3">
    {[1, 2, 3].map((section) => (
      <div key={section} className="space-y-2">
        <div className="animate-pulse bg-stone-200 dark:bg-stone-700 rounded h-4 w-32" />
        {[1, 2].map((row) => (
          <div key={row} className="animate-pulse bg-stone-100 dark:bg-stone-800 rounded h-12 w-full" />
        ))}
      </div>
    ))}
  </div>
</div>
```

**State 3: Error**

Identical pattern to PackingList error state. Same classes, "Tap to retry" with `RotateCcw` icon.

**State 4: Generated meal plan**

Outer wrapper:
```tsx
<div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
```

**Header with regenerate:**
```tsx
<div className="p-4 border-b border-stone-100 dark:border-stone-800">
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
      🍳 Meal Plan
    </h3>
    <button
      onClick={generate}
      className="text-xs text-stone-400 dark:text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition-colors"
    >
      <RotateCcw size={12} />
      Regenerate
    </button>
  </div>
</div>
```

**Day sections** — iterate `mealPlan.days`:

```tsx
<div className="divide-y divide-stone-100 dark:divide-stone-800">
  {mealPlan.days.map((day) => (
    <div key={day.dayNumber} className="p-4">
      {/* Day header */}
      <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
        Day {day.dayNumber} — {day.dayLabel}
      </h4>

      {/* Meal cards — iterate breakfast, lunch, dinner */}
      <div className="space-y-2">
        {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => {
          const meal = day.meals[mealType]
          if (!meal) return null  // null = not applicable (e.g., Day 1 breakfast)
          const mealKey = `day${day.dayNumber}-${mealType}`
          const isExpanded = expandedMeal === mealKey

          return (
            <button
              key={mealType}
              onClick={() => setExpandedMeal(isExpanded ? null : mealKey)}
              className="w-full text-left"
            >
              {/* Collapsed meal row */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider w-16 shrink-0">
                    {mealType}
                  </span>
                  <span className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                    {meal.name}
                  </span>
                </div>
                {/* Prep tag */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ml-2 ${
                  meal.prepType === 'home'
                    ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400'
                    : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                }`}>
                  {meal.prepType === 'home' ? 'At Home' : 'At Camp'}
                </span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="pb-2 pl-[76px]">  {/* 76px = 16w label + 12 gap + padding alignment */}
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
                    {meal.prepNotes}
                  </p>
                  <div className="space-y-0.5">
                    {meal.ingredients.map((ing, i) => (
                      <p key={i} className="text-xs text-stone-600 dark:text-stone-400">
                        • {ing}
                      </p>
                    ))}
                  </div>
                  {meal.cookwareNeeded.length > 0 && (
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1.5">
                      Gear: {meal.cookwareNeeded.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Snacks row */}
      {day.meals.snacks.length > 0 && (
        <div className="flex items-center gap-3 py-2 mt-1 border-t border-stone-50 dark:border-stone-800/50">
          <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider w-16 shrink-0">
            Snacks
          </span>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {day.meals.snacks.join(' · ')}
          </span>
        </div>
      )}
    </div>
  ))}
</div>
```

**Prep Timeline section** — collapsible, below days:

```tsx
<div className="border-t border-stone-100 dark:border-stone-800">
  <button
    onClick={() => setShowPrepTimeline(!showPrepTimeline)}
    className="w-full p-4 flex items-center justify-between"
  >
    <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
      📋 Prep Timeline
    </h4>
    <ChevronDown size={14} className={`text-stone-400 transition-transform ${showPrepTimeline ? 'rotate-180' : ''}`} />
  </button>
  {showPrepTimeline && (
    <div className="px-4 pb-4 space-y-1.5">
      {mealPlan.prepTimeline.map((step, i) => (
        <p key={i} className="text-sm text-stone-600 dark:text-stone-300 flex gap-2">
          <span className="text-amber-500 shrink-0">•</span>
          {step}
        </p>
      ))}
    </div>
  )}
</div>
```

**Shopping List section** — collapsible, with checkboxes grouped by store section:

```tsx
<div className="border-t border-stone-100 dark:border-stone-800">
  <button
    onClick={() => setShowShopping(!showShopping)}
    className="w-full p-4 flex items-center justify-between"
  >
    <div className="flex items-center gap-2">
      <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
        🛒 Shopping List
      </h4>
      <span className="text-[10px] text-stone-400 dark:text-stone-500">
        {Object.values(shoppingChecked).filter(Boolean).length}/{mealPlan.shoppingList.length}
      </span>
    </div>
    <div className="flex items-center gap-2">
      {showShopping && (
        <button
          onClick={(e) => { e.stopPropagation(); copyShoppingList() }}
          className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
        >
          Copy list
        </button>
      )}
      <ChevronDown size={14} className={`text-stone-400 transition-transform ${showShopping ? 'rotate-180' : ''}`} />
    </div>
  </button>

  {showShopping && (
    <div className="px-4 pb-4">
      {/* Group by section */}
      {STORE_SECTIONS.map((section) => {
        const items = mealPlan.shoppingList.filter((i) => i.section === section.key)
        if (items.length === 0) return null
        return (
          <div key={section.key} className="mb-3 last:mb-0">
            <h5 className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">
              {section.emoji} {section.label}
            </h5>
            <div className="space-y-0.5">
              {items.map((item, i) => {
                const key = `${section.key}-${i}`
                const isChecked = shoppingChecked[key] ?? false
                return (
                  <label key={key} className="flex items-center gap-2.5 py-1 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isChecked
                        ? 'bg-amber-600 dark:bg-amber-500 border-amber-600 dark:border-amber-500'
                        : 'border-stone-300 dark:border-stone-600 group-hover:border-amber-400'
                    }`}>
                      {isChecked && <Check size={10} className="text-white dark:text-stone-900" strokeWidth={3} />}
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleShopping(key)}
                      className="sr-only"
                    />
                    <span className={`text-sm transition-colors ${
                      isChecked ? 'line-through text-stone-400 dark:text-stone-600' : 'text-stone-900 dark:text-stone-100'
                    }`}>
                      {item.name}
                    </span>
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 ml-auto shrink-0">
                      {item.forMeal}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )}
</div>
```

**Store sections constant** (top of MealPlan.tsx):

```typescript
const STORE_SECTIONS = [
  { key: 'produce', emoji: '🥬', label: 'Produce' },
  { key: 'meat', emoji: '🥩', label: 'Meat' },
  { key: 'dairy', emoji: '🧀', label: 'Dairy' },
  { key: 'bakery', emoji: '🍞', label: 'Bakery' },
  { key: 'pantry', emoji: '🫙', label: 'Pantry' },
  { key: 'frozen', emoji: '🧊', label: 'Frozen' },
  { key: 'drinks', emoji: '🥤', label: 'Drinks' },
  { key: 'other', emoji: '📦', label: 'Other' },
] as const
```

**Copy-to-clipboard function:**

```typescript
function copyShoppingList() {
  if (!mealPlan) return
  const grouped: Record<string, ShoppingItem[]> = {}
  for (const item of mealPlan.shoppingList) {
    if (!grouped[item.section]) grouped[item.section] = []
    grouped[item.section].push(item)
  }

  const text = STORE_SECTIONS
    .filter((s) => grouped[s.key]?.length)
    .map((s) => {
      const items = grouped[s.key]!
      return `${s.label.toUpperCase()}\n${items.map((i) => `  □ ${i.name}`).join('\n')}`
    })
    .join('\n\n')

  navigator.clipboard.writeText(text)
  // Optional: brief "Copied!" toast — but keep it simple. A state flash is fine.
}
```

**Tips section** (same as PackingList):

```tsx
{mealPlan.tips.length > 0 && (
  <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
    <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
      💡 Meal Tips
    </h4>
    <ul className="space-y-1.5">
      {mealPlan.tips.map((tip, i) => (
        <li key={i} className="text-sm text-stone-600 dark:text-stone-300 flex gap-2">
          <span className="text-amber-500 shrink-0">•</span>
          {tip}
        </li>
      ))}
    </ul>
  </div>
)}
```

**Attribution footer** (same as PackingList):

```tsx
<div className="px-4 py-2 text-center">
  <p className="text-xs text-stone-400 dark:text-stone-500">
    ✦ Generated by Claude · Edit freely
  </p>
</div>
```

#### Imports needed

```typescript
import { useState } from 'react'
import { Loader2, RotateCcw, ChevronDown, Check } from 'lucide-react'
import type { MealPlanResult, ShoppingItem } from '@/lib/claude'
```

---

## 5. Integration into TripsClient.tsx

### Where to render

In the `TripCard` component inside `TripsClient.tsx`, the MealPlan goes **directly below the PackingList**, inside the same `{!isPast && (...)}` block.

Current code (around line 262-267 of TripsClient.tsx):
```tsx
{!isPast && (
  <PackingList tripId={trip.id} tripName={trip.name} />
)}
```

Change to:
```tsx
{!isPast && (
  <div className="space-y-3">
    <PackingList tripId={trip.id} tripName={trip.name} />
    <MealPlan tripId={trip.id} tripName={trip.name} />
  </div>
)}
```

### Import

Add at the top of `TripsClient.tsx`:
```typescript
import MealPlan from '@/components/MealPlan'
```

No other changes to TripsClient.tsx.

---

## 6. Edge Cases

### No cooking gear in inventory

The prompt handles this explicitly. The `cookingGearSection` will be empty, and the prompt says:
> "No cooking gear in inventory — suggest simple no-cook meals and recommend basic gear to add."

Claude will generate no-cook meals (wraps, sandwiches, pre-made meals from home). The `tips` array should include gear recommendations.

### No weather available

Same as packing list — the prompt falls back to:
> "WEATHER: Not available — plan for variable conditions."

Claude will plan a mix of hot and cold meals.

### Day 1 breakfast

The prompt instructs Claude to set Day 1 breakfast to `null` when the trip starts with an afternoon arrival. The UI skips `null` meals — the `if (!meal) return null` check handles this.

### Last day

Prompt instructs only breakfast (and maybe a departure snack) on the last day. Claude should set lunch and dinner to `null`.

### JSON parse failure

Same error handling as packing list. The `try/catch` in `generate()` catches parse errors and sets `setError()`. User sees "Tap to retry".

### Regeneration

Clicking "Regenerate" calls `generate()` again, which resets state. `shoppingChecked` is cleared. Previous plan is replaced.

### Long trips (5+ nights)

`max_tokens: 4000` should handle up to ~7 nights comfortably. For very long trips (10+ nights), Claude may truncate. This is acceptable for now — most of Will's trips are 2-3 nights. If it becomes an issue later, we can chunk by day range.

### Dietary restrictions

Not in scope for this implementation. Future enhancement: add a `dietaryNotes` field to the Trip model or a user preferences model. For now, Will can add notes to the trip (e.g., "no shellfish") and those get passed through `tripNotes`.

### Clipboard API not available

`navigator.clipboard.writeText()` requires HTTPS or localhost. This is fine for local dev. If it fails silently, no crash — we just don't show a confirmation. No fallback needed.

---

## 7. Files Changed — Summary

| File | Action | What |
|------|--------|------|
| `lib/claude.ts` | **Edit** | Add `MealPlanMeal`, `MealPlanDay`, `ShoppingItem`, `MealPlanResult` interfaces. Add `generateMealPlan()` function. Extract `buildWeatherSection()` helper and refactor `generatePackingList` to use it. |
| `app/api/meal-plan/route.ts` | **Create** | POST endpoint. Fetches trip + cooking gear + weather, calls `generateMealPlan`, returns JSON. |
| `components/MealPlan.tsx` | **Create** | Full meal plan UI component with 4 states, day sections, meal cards, prep timeline, shopping list with checkboxes, copy-to-clipboard. |
| `components/TripsClient.tsx` | **Edit** | Import `MealPlan`, render it below `PackingList` in the upcoming trip card. ~3 lines changed. |

**No Prisma schema changes. No migration. No new dependencies.**

---

## 8. Testing Checklist

After implementation, the Sonnet session should verify:

1. **Generate button appears** on upcoming trip cards (not past trips)
2. **Loading state** shows skeleton with "Claude is planning your meals..."
3. **Generated plan** shows day sections with correct day labels and dates
4. **Meal cards expand/collapse** on tap — showing ingredients, prep notes, cookware
5. **Prep tags** show "At Home" (sky) or "At Camp" (amber) correctly
6. **Prep timeline** expands/collapses with chevron animation
7. **Shopping list** expands/collapses, checkboxes work, items cross out
8. **Shopping list grouped** by store section in correct order
9. **Copy list** button copies plain-text shopping list to clipboard
10. **Regenerate** button resets all state and generates fresh plan
11. **Error state** shows with retry button if API fails
12. **Dark mode** — all elements render correctly in dark mode
13. **No cooking gear** — generates no-cook meals without errors
14. **Day 1 breakfast null** — skipped in UI without blank space

---

## 9. Future Enhancements (NOT in scope for this session)

These are planned follow-ups. Do not build any of this now — just be aware that the v1 data structures are designed to support them later.

### Recipe library with ratings

After a trip, Will wants to rate recipes ("How was the Sous Vide Ribeye? 5 stars"). This requires:

- **New Prisma model: `Recipe`** — name, ingredients (JSON), prepType, rating (1-5), notes, timesMade, source, createdAt. Seeded from generated meal plans when Will marks a recipe as "keeper."
- **Post-trip feedback UI** — after a trip ends, prompt Will to rate each meal. Simple star rating + optional notes.
- **Claude integration** — future meal plan prompts include rated recipes as context: "You loved this last time (5 stars)" / "Skip — rated 2 stars." Highly-rated recipes get suggested again; low-rated ones are excluded.

The current `MealPlanMeal` interface already contains the fields needed to seed a `Recipe` record (name, ingredients, prepType, prepNotes, cookwareNeeded), so no changes to the v1 plan are needed.

### Recipe ebook / resource upload (RAG)

Will wants to upload camping cookbooks and recipe PDFs so Claude can draw from his curated library instead of just general knowledge. This is the same RAG architecture already planned for the NC camping knowledge base (Phase 3 in TASKS.md):

- **Upload flow** — PDF/ebook upload → text extraction → chunking into passages
- **Vector store** — Vectra (already planned) for semantic search over recipe chunks
- **Prompt augmentation** — at meal plan generation time, search the vector store for relevant recipes/techniques and inject the top matches into the Claude prompt as context
- **Source attribution** — "From: Camp Cooking Made Easy, p.42" tag on recipes sourced from uploaded books

This is a significant feature that shares infrastructure with the knowledge base. Build after Phase 3 RAG is in place.
