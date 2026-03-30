import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface PackingListItem {
  name: string
  category: string
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

  const weatherSection = weather
    ? `WEATHER FORECAST:
${weather.days
  .map(
    (d) =>
      `${d.dayLabel} ${d.date}: ${d.weatherLabel}, High ${d.highF}°F / Low ${d.lowF}°F, ${d.precipProbability}% rain, Wind ${d.windMaxMph} mph, UV ${d.uvIndexMax}`
  )
  .join('\n')}
${weather.alerts.length > 0 ? `\nALERTS:\n${weather.alerts.map((a) => `- [${a.severity.toUpperCase()}] ${a.message}`).join('\n')}` : ''}`
    : 'WEATHER: Not available — pack for variable conditions.'

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

  const parsed = JSON.parse(text)

  const result: PackingListResult = {
    categories: parsed.categories.map(
      (cat: { name: string; items: PackingListItem[] }) => ({
        name: cat.name,
        emoji: CATEGORY_EMOJIS[cat.name] || '📦',
        items: cat.items,
      })
    ),
    tips: parsed.tips || [],
  }

  return result
}
