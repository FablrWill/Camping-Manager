import Anthropic from '@anthropic-ai/sdk'
import { parseClaudeJSON, PackingListResultSchema, MealPlanResultSchema, DepartureChecklistResultSchema, DepartureChecklistResult, TripSummaryResultSchema, type TripSummaryResult, GearDocumentResultSchema, type GearDocumentResult, VehicleChecklistResultSchema, type VehicleChecklistResult } from '@/lib/parse-claude'
import { CATEGORY_EMOJI, CATEGORIES } from '@/lib/gear-categories'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const RAIN_THRESHOLD_PERCENT = 40
const COLD_THRESHOLD_F = 50
const UV_THRESHOLD_INDEX = 6

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

export interface GearFeedbackSummary {
  gearName: string
  usedCount: number
  didntNeedCount: number
  forgotCount: number
  totalTrips: number
}

export function filterSignificantFeedback(
  feedback: GearFeedbackSummary[]
): GearFeedbackSummary[] {
  return feedback.filter((g) => g.didntNeedCount >= 2 || g.forgotCount >= 1)
}

export function aggregateGearFeedback(
  trips: ReadonlyArray<{
    id: string
    packingItems: ReadonlyArray<{
      gearId: string
      usageStatus: string | null
      gear: { name: string }
    }>
  }>
): GearFeedbackSummary[] {
  const totals: Record<string, GearFeedbackSummary> = {}
  for (const trip of trips) {
    for (const item of trip.packingItems) {
      if (!item.usageStatus) continue
      if (!totals[item.gearId]) {
        totals[item.gearId] = {
          gearName: item.gear.name,
          usedCount: 0,
          didntNeedCount: 0,
          forgotCount: 0,
          totalTrips: 0,
        }
      }
      const g = totals[item.gearId]
      const updated = { ...g, totalTrips: g.totalTrips + 1 }
      if (item.usageStatus === 'used') updated.usedCount = g.usedCount + 1
      else if (item.usageStatus === "didn't need") updated.didntNeedCount = g.didntNeedCount + 1
      else if (item.usageStatus === 'forgot but needed') updated.forgotCount = g.forgotCount + 1
      totals[item.gearId] = updated
    }
  }
  return Object.values(totals)
}

export function buildFeedbackSection(feedback?: GearFeedbackSummary[]): string {
  if (!feedback || feedback.length === 0) return ''
  const lines = feedback.map((f) => {
    const parts: string[] = []
    if (f.didntNeedCount >= 2) parts.push(`marked "didn't need" on ${f.didntNeedCount}/${f.totalTrips} trips`)
    if (f.forgotCount >= 1) parts.push(`forgotten but needed on ${f.forgotCount}/${f.totalTrips} trips`)
    if (f.usedCount > 0 && parts.length === 0) parts.push(`used on ${f.usedCount}/${f.totalTrips} trips`)
    return `- ${f.gearName}: ${parts.join(', ')}`
  })
  return `GEAR HISTORY FROM PAST TRIPS:\n${lines.join('\n')}`
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

export function buildWeatherSection(weather?: { days: WeatherDay[]; alerts: WeatherAlert[] }): string {
  if (!weather) return 'WEATHER: Not available — plan for variable conditions.'
  return `WEATHER FORECAST:
${weather.days
  .map(
    (d) =>
      `${d.dayLabel} ${d.date}: ${d.weatherLabel}, High ${d.highF}°F / Low ${d.lowF}°F, ${d.precipProbability}% rain, Wind ${d.windMaxMph} mph, UV ${d.uvIndexMax}`
  )
  .join('\n')}
${weather.alerts.length > 0 ? `\nALERTS:\n${weather.alerts.map((a) => `- [${a.severity.toUpperCase()}] ${a.message}`).join('\n')}` : ''}`
}

export function buildClothingGuidance(
  weather: { days: WeatherDay[]; alerts: WeatherAlert[] } | undefined,
  clothingItems: GearItem[]
): string {
  if (!weather || weather.days.length === 0) return ''

  const needsRainGear = weather.days.some((d) => d.precipProbability >= RAIN_THRESHOLD_PERCENT)
  const needsColdLayers = weather.days.some((d) => d.lowF <= COLD_THRESHOLD_F)
  const needsUVProtection = weather.days.some((d) => d.uvIndexMax >= UV_THRESHOLD_INDEX)

  if (!needsRainGear && !needsColdLayers && !needsUVProtection) return ''

  const spotlight =
    clothingItems.length > 0
      ? `Clothing in inventory: ${clothingItems
          .map((i) => `${i.name}${i.brand ? ` (${i.brand})` : ''} [id:${i.id}]`)
          .join(', ')}.`
      : ''

  const directives: string[] = []

  if (needsRainGear) {
    const line = `- Rain Gear: Rain is forecast. Include waterproof layers and rain gear.`
    directives.push(spotlight ? `${line} ${spotlight} Prioritize these in the Rain Gear section.` : line)
  }

  if (needsColdLayers) {
    const line = `- Layers: Cold overnight temps expected. Include warm base and mid layers.`
    directives.push(spotlight ? `${line} ${spotlight} Prioritize these in the Layers section.` : line)
  }

  if (needsUVProtection) {
    const line = `- Sun Protection: High UV index forecast. Include sun hat, sunscreen, and UV-protective clothing.`
    directives.push(spotlight ? `${line} ${spotlight} Prioritize these in the Sun Protection section.` : line)
  }

  return `CLOTHING GUIDANCE:\n${directives.join('\n')}`
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
  feedbackContext?: GearFeedbackSummary[]
  bringingDog?: boolean
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
    feedbackContext,
    bringingDog,
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
  const feedbackSection = buildFeedbackSection(feedbackContext)
  const clothingItems = gearInventory.filter((g) => g.category === 'clothing')
  const clothingGuidance = buildClothingGuidance(weather, clothingItems)

  const dogSection = bringingDog
    ? `\nDOG CONTEXT:\nWill is bringing his dog on this trip. Add a "Dog" section to the packing list with essential dog gear: food + collapsible bowl, water bowl, leash + backup leash, poop bags (2x expected amount), dog-specific first aid supplies (tweezers for ticks, wound spray). Note any dog-friendly considerations for the destination.\n`
    : ''

  const prompt = `You are a car camping trip packing assistant. Generate a smart, categorized packing list for this trip.

TRIP DETAILS:
- Name: ${tripName}
- Dates: ${startDate} to ${endDate} (${nights} night${nights !== 1 ? 's' : ''})
${locationName ? `- Location: ${locationName}${locationType ? ` (${locationType})` : ''}` : '- Location: Not specified'}
${vehicleName ? `- Vehicle: ${vehicleName}` : ''}
${tripNotes ? `- Notes: ${tripNotes}` : ''}

${weatherSection}
${clothingGuidance ? `\n${clothingGuidance}\n` : ''}${dogSection}
GEAR INVENTORY (items the user owns):
${gearSection || 'No gear in inventory yet.'}

${feedbackSection}

INSTRUCTIONS:
1. Build the packing list primarily from the user's gear inventory. Reference items by their [id:xxx] tag.
2. Add essential items NOT in the inventory (like food cooler, firewood, water, toiletries, etc.) — mark these as not from inventory.
3. Skip items marked [BROKEN].
4. Follow the CLOTHING GUIDANCE block above for specific weather-driven clothing directives. Organize clothing items into the sub-sections specified (Rain Gear, Layers, Sun Protection). If no CLOTHING GUIDANCE block is present, suggest comfortable layers for variable conditions.
5. Adjust for trip duration: longer trips need more consumables.
6. Categories: ${CATEGORIES.map((c) => c.value).join(', ')}.
7. Include 2-3 brief, specific tips based on the weather and trip details (e.g., "Charge the EcoFlow fully — limited solar expected with cloud cover Saturday").
8. If GEAR HISTORY is provided, use it to inform recommendations: deprioritize items marked "didn't need" on 2+ trips, and flag items frequently forgotten as "RECOMMENDED — frequently forgotten".

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
- "name" is the category key (lowercase): ${CATEGORIES.map((c) => c.value).join(', ')}
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
      emoji: cat.emoji || CATEGORY_EMOJI[cat.name] || '📦',
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

export async function generateDepartureChecklist(params: {
  tripName: string
  startDate: string
  endDate: string
  packingItems: Array<{ name: string; category: string; packed: boolean }>
  mealPlan: { result: string } | null
  powerBudget: string | null
  vehicleName: string | null
  vehicleMods: Array<{ name: string; description: string | null }>
  weatherNotes: string | null
  tripNotes: string | null
  departureTime: string | null
  lastStopNames: string[]
}): Promise<DepartureChecklistResult> {
  const {
    tripName,
    startDate,
    endDate,
    packingItems,
    mealPlan,
    powerBudget,
    vehicleName,
    vehicleMods,
    weatherNotes,
    tripNotes,
    departureTime,
    lastStopNames,
  } = params

  const unpackedItems = packingItems.filter((i) => !i.packed)
  const packedItems = packingItems.filter((i) => i.packed)

  const packingSection = [
    packedItems.length > 0
      ? `Packed items (${packedItems.length}): ${packedItems.map((i) => i.name).join(', ')}`
      : 'No items packed yet.',
    unpackedItems.length > 0
      ? `UNPACKED items (flag with isUnpackedWarning=true in checklist): ${unpackedItems.map((i) => i.name).join(', ')}`
      : 'All packing items are packed.',
  ].join('\n')

  const modsSection =
    vehicleMods.length > 0
      ? vehicleMods
          .map((m) => `- ${m.name}${m.description ? `: ${m.description}` : ''}`)
          .join('\n')
      : 'No vehicle mods on record.'

  const prompt = `You are a camping trip departure planning assistant. Generate a time-ordered departure checklist organized into time slots.

TRIP DETAILS:
- Name: ${tripName}
- Dates: ${startDate} to ${endDate}
${vehicleName ? `- Vehicle: ${vehicleName}` : ''}
${tripNotes ? `- Notes: ${tripNotes}` : ''}

PACKING STATUS:
${packingSection}

VEHICLE MODS (generate specific check items for each):
${modsSection}

${mealPlan ? `MEAL PLAN: A meal plan exists. Include meal prep and cooler packing items.` : 'MEAL PLAN: None generated.'}

${powerBudget ? `POWER BUDGET: A power budget exists. Include device charging and solar panel setup items.` : 'POWER BUDGET: None generated.'}

${weatherNotes ? `WEATHER NOTES: ${weatherNotes}` : ''}

${departureTime
  ? `DEPARTURE TIME: ${departureTime}
For each task, include a "suggestedTime" field with an absolute clock time (e.g. "9:00 PM Thu", "6:30 AM", "7:00 AM -- depart") anchored to this departure time. Night-before tasks get the prior evening. Day-of tasks get morning times. Final task is the departure time itself.`
  : `DEPARTURE TIME: Not set. Use suggestedTime: null for all items. Use slot label names as the only time reference (e.g. "Night Before", "Morning Of").`
}

${lastStopNames.length > 0
  ? `LAST STOPS BEFORE DESTINATION (include a reminder task for the nearest stop): ${lastStopNames.join(', ')}`
  : ''
}

INSTRUCTIONS:
1. Organize checklist into 2-5 time-ordered slots (e.g. "Night Before - Pack Vehicle", "Morning of Departure - Kitchen & Cooler", "Before Driving - Final Safety Checks"). Choose slot names and count based on trip complexity.
2. For each vehicle mod, generate at least one specific check item (e.g. "Check roof rack straps are tight", "Verify tire pressure is correct").
3. For any UNPACKED items listed above, include them as checklist items with isUnpackedWarning=true.
4. Add weather-aware tips if weather notes are provided (e.g. "Rain expected — pack tarps in easy-access spot").
5. If a meal plan exists, include ONE phase-level reminder: "Prep meals (see meal plan)". Only add extra meal tasks for time-sensitive items you spot (e.g. "Marinate meat tonight").
6. If a power budget exists, include "Charge EcoFlow to 100%". If current battery percentage is given, add context: "Currently at X% -- needs ~Yh to full."
7. Generate a unique ID for each item using format "chk-{slot_index}-{item_index}" (0-based).
8. Keep item text concise and action-oriented (verb-first: "Check", "Pack", "Verify", "Load").
9. Every item MUST include "suggestedTime" — either a clock time string or null.

Respond ONLY with valid JSON matching this exact structure:
{
  "slots": [
    {
      "label": "Night Before - Pack Vehicle",
      "items": [
        { "id": "chk-0-0", "text": "Pack sleeping bags and sleep system", "checked": false, "isUnpackedWarning": false, "suggestedTime": "9:00 PM Thu" },
        { "id": "chk-0-1", "text": "Load camp chairs and table", "checked": false, "isUnpackedWarning": true, "suggestedTime": "9:30 PM Thu" }
      ]
    }
  ]
}

Rules:
- "checked" is always false in the generated output (users check off during departure)
- "isUnpackedWarning" is true ONLY for items that are in the unpacked packing list above
- Do NOT wrap JSON in markdown code blocks`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text =
    message.content[0].type === 'text' ? message.content[0].text : ''

  const parseResult = parseClaudeJSON(text, DepartureChecklistResultSchema)
  if (!parseResult.success) {
    throw new Error(parseResult.error)
  }

  return parseResult.data
}

export async function generateTripSummary(params: {
  tripName: string
  startDate: string
  endDate: string
  locationName?: string
  currentLocationRating?: number | null
  usageItems: Array<{ name: string; category: string; usageStatus: string }>
}): Promise<TripSummaryResult> {
  const { tripName, startDate, endDate, locationName, currentLocationRating, usageItems } = params

  const usedItems = usageItems.filter((i) => i.usageStatus === 'used')
  const didntNeedItems = usageItems.filter((i) => i.usageStatus === "didn't need")
  const forgotItems = usageItems.filter((i) => i.usageStatus === 'forgot but needed')

  const prompt = `You are a camping trip debrief assistant. Analyze this post-trip gear usage data and generate a concise summary.

TRIP: ${tripName}
DATES: ${startDate} to ${endDate}
${locationName ? `LOCATION: ${locationName}${currentLocationRating ? ` (current rating: ${currentLocationRating}/5)` : ''}` : ''}

GEAR USAGE:
Used (${usedItems.length}): ${usedItems.map((i) => i.name).join(', ') || 'none'}
Didn't need (${didntNeedItems.length}): ${didntNeedItems.map((i) => i.name).join(', ') || 'none'}
Forgot but needed (${forgotItems.length}): ${forgotItems.map((i) => i.name).join(', ') || 'none'}

Return JSON with:
- whatToDrop: array of item names the user didn't need (recommend removing from future trips)
- whatWasMissing: array of items the user forgot but needed (recommend adding to future trips)
- locationRating: suggested 1-5 rating for this location based on the trip experience (null if location not specified)
- summary: 1-2 sentence prose debrief of the trip (what went well, what to improve)

Return ONLY valid JSON, no markdown.`

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const parsed = parseClaudeJSON(text, TripSummaryResultSchema)
  if (!parsed.success) {
    throw new Error(parsed.error)
  }
  return parsed.data
}

export async function findGearManual(params: {
  name: string;
  brand: string | null;
  modelNumber: string | null;
  category: string;
}): Promise<GearDocumentResult> {
  const { name, brand, modelNumber, category } = params;
  const prompt = `You are a product manual research assistant.
Given gear details, return the most likely manufacturer support page URL and PDF manual URL.

GEAR:
- Name: ${name}
- Brand: ${brand || 'Unknown'}
- Model Number: ${modelNumber || 'Unknown'}
- Category: ${category}

INSTRUCTIONS:
1. Generate the most likely URL for the manufacturer's support/product page for this exact model.
2. If the brand typically hosts PDF manuals (e.g. MSR, GSI, Black Diamond, Garmin, Goal Zero), generate the likely PDF URL.
3. For each URL, provide a confidence level: "high" (you know this brand's URL pattern well) or "low" (guessing).
4. Generate a descriptive title for each document (e.g. "MSR Hubba Hubba NX Owner's Manual").
5. Only include URLs you believe are real. If you cannot determine a likely URL, return an empty documents array.

Respond ONLY with valid JSON (no markdown code blocks):
{
  "documents": [
    {
      "type": "support_link" | "manual_pdf" | "product_page",
      "url": "https://...",
      "title": "Brand Model Document Title",
      "confidence": "high" | "low"
    }
  ]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const parseResult = parseClaudeJSON(text, GearDocumentResultSchema);
  if (!parseResult.success) {
    throw new Error(parseResult.error);
  }
  return parseResult.data;
}

export async function generateVehicleChecklist(params: {
  vehicleYear: number | null
  vehicleMake: string | null
  vehicleModel: string | null
  drivetrain: string | null
  groundClearance: number | null
  tripDays: number
  destinationName: string | null
  roadCondition: string | null
  clearanceNeeded: string | null
}): Promise<VehicleChecklistResult> {
  const {
    vehicleYear,
    vehicleMake,
    vehicleModel,
    drivetrain,
    groundClearance,
    tripDays,
    destinationName,
    roadCondition,
    clearanceNeeded,
  } = params

  const prompt = `You are a vehicle pre-trip inspection assistant for car camping.
Generate a practical, action-oriented pre-trip checklist specific to this vehicle and trip.

VEHICLE:
- Year/Make/Model: ${vehicleYear ?? 'Unknown'} ${vehicleMake ?? ''} ${vehicleModel ?? ''}
- Drivetrain: ${drivetrain ?? 'Unknown'}
- Ground Clearance: ${groundClearance != null ? `${groundClearance}"` : 'Unknown'}

TRIP CONTEXT:
- Duration: ${tripDays} day${tripDays !== 1 ? 's' : ''}
${destinationName ? `- Destination: ${destinationName}` : ''}
${roadCondition ? `- Road Condition: ${roadCondition}` : ''}
${clearanceNeeded ? `- Clearance Needed: ${clearanceNeeded}` : ''}

INSTRUCTIONS:
1. Generate 8-15 practical checklist items for this specific vehicle.
2. Each item should be action-oriented (verb-first: "Check", "Verify", "Inflate", "Top off").
3. Cover: tires, fluids (oil, coolant, washer fluid), lights, battery, emergency kit, cargo security.
4. If road condition indicates dirt/off-road, include items for that (skid plate check, recovery gear, etc.).
5. Generate a unique ID for each item using format "vc-{index}" (0-based).
6. All items start with checked: false.

Respond ONLY with valid JSON (no markdown):
{"items": [{"id": "vc-0", "text": "Check tire pressure (front/rear)", "checked": false}]}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  const parseResult = parseClaudeJSON(text, VehicleChecklistResultSchema)
  if (!parseResult.success) {
    throw new Error(parseResult.error)
  }

  return parseResult.data
}
