import Anthropic from '@anthropic-ai/sdk'
import { parseClaudeJSON, PackingListResultSchema, MealPlanResultSchema } from '@/lib/parse-claude'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface PackingListItem {
  name: string
  category?: string
  fromInventory: boolean
  gearId?: string
  reason?: string
}

export interface PackingListResult {
  categories: {
    name: string
    emoji: string
    items: PackingListItem[]
  }[]
  tips: string[]
}

const CATEGORY_EMOJIS: Record<string, string> = {
  shelter: '⛺',
  sleep: '🛏️',
  cook: '🍳',
  power: '🔋',
  clothing: '🧥',
  tools: '🔧',
  vehicle: '🚙',
  hygiene: '🧴',
  safety: '🩹',
  misc: '📦',
}

interface GearItem {
  id: string
  name: string
  brand: string | null
  category: string
  weight: number | null
  condition: string | null
}

interface WeatherDay {
  date: string
  dayLabel: string
  highF: number
  lowF: number
  precipProbability: number
  weatherLabel: string
  windMaxMph: number
  uvIndexMax: number
}

interface WeatherAlert {
  type: string
  message: string
  severity: string
}

export interface MealPlanMeal {
  name: string
  prepType: string  // "home" | "camp"
  prepNotes: string
  ingredients: string[]
  cookwareNeeded: string[]
}

export interface MealPlanDay {
  dayNumber: number
  dayLabel: string
  date: string
  meals: {
    breakfast: MealPlanMeal | null
    lunch: MealPlanMeal | null
    dinner: MealPlanMeal | null
    snacks: string[]
  }
}

export interface ShoppingItem {
  name: string
  section: string
  forMeal: string
}

export interface MealPlanResult {
  days: MealPlanDay[]
  shoppingList: ShoppingItem[]
  prepTimeline: string[]
  tips: string[]
}

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

export async function generatePackingList(params: {
  tripName: string
  startDate: string
  endDate: string
  nights: number
  locationName?: string
  locationType?: string
  vehicleName?: string
  tripNotes?: string
  gearInventory: GearItem[]
  weather?: {
    days: WeatherDay[]
    alerts: WeatherAlert[]
  }
}): Promise<PackingListResult> {
  const {
    tripName,
    startDate,
    endDate,
    nights,
    locationName,
    locationType,
    vehicleName,
    tripNotes,
    gearInventory,
    weather,
  } = params

  const gearByCategory: Record<string, GearItem[]> = {}
  for (const item of gearInventory) {
    const cat = item.category || 'misc'
    if (!gearByCategory[cat]) gearByCategory[cat] = []
    gearByCategory[cat].push(item)
  }

  const gearSection = Object.entries(gearByCategory)
    .map(([cat, items]) => {
      const lines = items.map(
        (i) => `  - ${i.name}${i.brand ? ` (${i.brand})` : ''}${i.weight ? ` — ${i.weight} lbs` : ''}${i.condition === 'broken' ? ' [BROKEN]' : ''} [id:${i.id}]`
      )
      return `${cat}:\n${lines.join('\n')}`
    })
    .join('\n\n')

  const weatherSection = buildWeatherSection(weather)

  const prompt = `You are a car camping trip packing assistant. Generate a smart, categorized packing list for this trip.

TRIP DETAILS:
- Name: ${tripName}
- Dates: ${startDate} to ${endDate} (${nights} night${nights !== 1 ? 's' : ''})
${locationName ? `- Location: ${locationName}${locationType ? ` (${locationType})` : ''}` : '- Location: Not specified'}
${vehicleName ? `- Vehicle: ${vehicleName}` : ''}
${tripNotes ? `- Notes: ${tripNotes}` : ''}

${weatherSection}

GEAR INVENTORY (items the user owns):
${gearSection || 'No gear in inventory yet.'}

INSTRUCTIONS:
1. Build the packing list primarily from the user's gear inventory. Reference items by their [id:xxx] tag.
2. Add essential items NOT in the inventory (like food cooler, firewood, water, toiletries, etc.) — mark these as not from inventory.
3. Skip items marked [BROKEN].
4. Adjust for weather: if rain is forecast, include rain gear. If cold, prioritize warm layers. If hot/high UV, include sun protection.
5. Adjust for trip duration: longer trips need more consumables.
6. Categories: shelter, sleep, cook, power, clothing, tools, vehicle, hygiene, safety, misc.
7. Include 2-3 brief, specific tips based on the weather and trip details (e.g., "Charge the EcoFlow fully — limited solar expected with cloud cover Saturday").

Respond ONLY with valid JSON matching this exact structure:
{
  "categories": [
    {
      "name": "shelter",
      "items": [
        { "name": "Tent", "fromInventory": true, "gearId": "abc123", "reason": "your 4-person tent" },
        { "name": "Extra tarp", "fromInventory": false, "reason": "rain expected Saturday" }
      ]
    }
  ],
  "tips": ["Tip 1", "Tip 2"]
}

Rules for the JSON:
- "name" is the category key (lowercase): shelter, sleep, cook, power, clothing, tools, vehicle, hygiene, safety, misc
- Only include categories that have items
- "fromInventory" is true if the item comes from the gear inventory, false if it's a suggested addition
- "gearId" is only present when fromInventory is true — use the exact id from the [id:xxx] tag
- "reason" is a SHORT phrase explaining why this item is included (optional for obvious items)
- Keep item names concise and natural
- Do NOT wrap JSON in markdown code blocks`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text =
    message.content[0].type === 'text' ? message.content[0].text : ''

  const parseResult = parseClaudeJSON(text, PackingListResultSchema)
  if (!parseResult.success) {
    throw new Error(parseResult.error)
  }
  const parsed = parseResult.data

  const result: PackingListResult = {
    categories: parsed.categories.map((cat) => ({
      name: cat.name,
      emoji: cat.emoji || CATEGORY_EMOJIS[cat.name] || '📦',
      items: cat.items,
    })),
    tips: parsed.tips || [],
  }

  return result
}

export async function generateMealPlan(params: {
  tripName: string
  startDate: string
  endDate: string
  nights: number
  people: number
  locationName?: string
  vehicleName?: string
  tripNotes?: string
  cookingGear: GearItem[]
  weather?: {
    days: WeatherDay[]
    alerts: WeatherAlert[]
  }
}): Promise<MealPlanResult> {
  const {
    tripName,
    startDate,
    endDate,
    nights,
    people,
    locationName,
    vehicleName,
    tripNotes,
    cookingGear,
    weather,
  } = params

  const weatherSection = buildWeatherSection(weather)

  const cookingGearSection = cookingGear.length > 0
    ? cookingGear
        .map(
          (i) =>
            `- ${i.name}${i.brand ? ` (${i.brand})` : ''}${i.condition === 'broken' ? ' [BROKEN]' : ''}`
        )
        .join('\n')
    : ''

  const prompt = `You are a car camping meal planner. Generate a practical, delicious meal plan for this trip.

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
- Do NOT wrap JSON in markdown code blocks`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text =
    message.content[0].type === 'text' ? message.content[0].text : ''

  const parseResult = parseClaudeJSON(text, MealPlanResultSchema)
  if (!parseResult.success) {
    throw new Error(parseResult.error)
  }

  return parseResult.data
}
