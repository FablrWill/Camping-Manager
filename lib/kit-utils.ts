import type { PackingListResult } from '@/lib/claude'

/**
 * Extracts gear IDs from a Claude-generated packing list result.
 * Only returns IDs for items that are from the user's inventory and have a gearId.
 */
export function extractGearIdsFromPackingList(packingList: PackingListResult): string[] {
  return packingList.categories
    .flatMap(cat => cat.items)
    .filter((item): item is typeof item & { gearId: string } =>
      item.fromInventory === true && typeof item.gearId === 'string'
    )
    .map(item => item.gearId)
}

/**
 * Computes which gear IDs from a removed kit can safely be un-packed.
 * IDs that appear in any of the remaining applied kits are "protected" and must stay.
 */
export function computeGearIdsToRemove(
  kitGearIds: string[],
  remainingKitsGearIds: string[][]
): string[] {
  const protectedIds = new Set(remainingKitsGearIds.flat())
  return kitGearIds.filter(id => !protectedIds.has(id))
}

interface ReviewContext {
  appliedKits: Array<{ name: string; gearNames: string[] }>
  tripName: string
  nights: number
  locationName: string
  locationType: string
  weatherSummary: string
  bringingDog: boolean
}

/**
 * Builds a Claude prompt that asks for gap analysis on top of applied kit presets.
 * The prompt is gap-focused — not a full packing list regeneration.
 */
export function buildReviewPrompt(ctx: ReviewContext): string {
  const kitSummary = ctx.appliedKits
    .map(k => `${k.name}: ${k.gearNames.join(', ')}`)
    .join('\n')

  return `You are reviewing a camping packing list built from kit presets.

APPLIED KITS:
${kitSummary}

TRIP CONTEXT:
- ${ctx.tripName}, ${ctx.nights} night${ctx.nights !== 1 ? 's' : ''}
- Location: ${ctx.locationName} (${ctx.locationType})
- Weather: ${ctx.weatherSummary}
${ctx.bringingDog ? '- Bringing a dog\n' : ''}
Identify what is MISSING from this kit for this specific trip.
Be specific and brief. List only genuine gaps — not things already covered.
Format: bullet points only. 3-6 items max. No preamble.`
}
