import { z, ZodSchema } from 'zod';

/**
 * Parse and validate a Claude API JSON response using Zod.
 * Strips markdown code fences, parses JSON, validates against schema.
 * Returns typed result or error string — never throws.
 */
export function parseClaudeJSON<T>(
  raw: string,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  let parsed: unknown;
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { success: false, error: 'Claude returned non-JSON response' };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error: `Claude response schema mismatch: ${result.error.issues.map((i) => i.message).join(', ')}`,
    };
  }
  return { success: true, data: result.data };
}

// --- Packing List Schemas (matches lib/claude.ts PackingListResult interface) ---

const PackingListItemSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  fromInventory: z.coerce.boolean(),
  gearId: z.string().optional(),
  reason: z.string().optional(),
});

const PackingListCategorySchema = z.object({
  name: z.string(),
  emoji: z.string().optional(),
  items: z.array(PackingListItemSchema),
});

export const PackingListResultSchema = z.object({
  categories: z.array(PackingListCategorySchema),
  tips: z.array(z.string()).default([]),
});

export type PackingListResult = z.infer<typeof PackingListResultSchema>;

// --- Meal Plan Schemas (matches lib/claude.ts MealPlanResult interface) ---

export const MealPlanMealSchema = z.object({
  name: z.string(),
  prepType: z.string(), // "home" | "camp"
  prepNotes: z.string(),
  ingredients: z.array(z.string()).default([]),
  cookwareNeeded: z.array(z.string()).default([]),
});

const MealPlanMealsSchema = z.object({
  breakfast: MealPlanMealSchema.nullable(),
  lunch: MealPlanMealSchema.nullable(),
  dinner: MealPlanMealSchema.nullable(),
  snacks: z.array(z.string()).default([]),
});

const MealPlanDaySchema = z.object({
  dayNumber: z.coerce.number(),
  dayLabel: z.string(),
  date: z.string(),
  meals: MealPlanMealsSchema,
});

const ShoppingItemSchema = z.object({
  name: z.string(),
  section: z.string(),
  forMeal: z.string(),
});

export const MealPlanResultSchema = z.object({
  days: z.array(MealPlanDaySchema),
  shoppingList: z.array(ShoppingItemSchema).default([]),
  prepTimeline: z.array(z.string()).default([]),
  tips: z.array(z.string()).default([]),
});

export type MealPlanResult = z.infer<typeof MealPlanResultSchema>;

// --- Departure Checklist Schemas ---

const DepartureChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().default(false),
  isUnpackedWarning: z.boolean().default(false),
  suggestedTime: z.string().nullable().optional(),
});

const DepartureChecklistSlotSchema = z.object({
  label: z.string(),
  items: z.array(DepartureChecklistItemSchema),
});

export const DepartureChecklistResultSchema = z.object({
  slots: z.array(DepartureChecklistSlotSchema),
});

export type DepartureChecklistResult = z.infer<typeof DepartureChecklistResultSchema>;
export type DepartureChecklistItem = z.infer<typeof DepartureChecklistItemSchema>;
export type DepartureChecklistSlot = z.infer<typeof DepartureChecklistSlotSchema>;

// --- Trip Summary Schema (Phase 9 - LEARN-02) ---

export const TripSummaryResultSchema = z.object({
  whatToDrop: z.array(z.string()).default([]),
  whatWasMissing: z.array(z.string()).default([]),
  locationRating: z.number().min(1).max(5).nullable(),
  summary: z.string(),
});

export type TripSummaryResult = z.infer<typeof TripSummaryResultSchema>;

// --- Voice Insight Schemas (matches lib/voice/types.ts InsightPayload) ---

const InsightItemSchema = z.object({
  text: z.string(),
});

const GearFeedbackItemSchema = z.object({
  text: z.string(),
  gearName: z.string().nullable(),
});

const SpotRatingSchema = z.object({
  locationName: z.string().nullable(),
  rating: z.number().min(1).max(5).nullable(),
});

export const InsightPayloadSchema = z.object({
  whatWorked: z.array(InsightItemSchema).default([]),
  whatDidnt: z.array(InsightItemSchema).default([]),
  gearFeedback: z.array(GearFeedbackItemSchema).default([]),
  spotRating: SpotRatingSchema,
});

export type InsightPayload = z.infer<typeof InsightPayloadSchema>;

// --- Agent Memory Schema ---

export const MemoryArraySchema = z.array(
  z.object({ key: z.string(), value: z.string() })
);

// --- Intake Triage Schemas (Phase 24) ---

export const GearDraftSchema = z.object({
  name: z.string(),
  brand: z.string().nullable().optional(),
  category: z.string().default('tools'),
  description: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  purchaseUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isWishlist: z.boolean().default(true),
});
export type GearDraft = z.infer<typeof GearDraftSchema>;

export const LocationDraftSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  type: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type LocationDraft = z.infer<typeof LocationDraftSchema>;

export const TextClassificationSchema = z.object({
  triageType: z.enum(['gear', 'location', 'knowledge', 'tip', 'unknown']),
  summary: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  extractedData: z.record(z.string(), z.unknown()).optional(),
});
export type TextClassification = z.infer<typeof TextClassificationSchema>;

// --- Gear Document Schemas (matches GearDocument model) ---

export const GearDocumentResultSchema = z.object({
  documents: z.array(z.object({
    type: z.enum(['manual_pdf', 'support_link', 'warranty', 'product_page']),
    url: z.string().url(),
    title: z.string(),
    confidence: z.enum(['high', 'low']).optional(),
  })),
});

export type GearDocumentResult = z.infer<typeof GearDocumentResultSchema>;

// --- Vehicle Checklist Schemas (Phase 29) ---

const VehicleChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().default(false),
});

export const VehicleChecklistResultSchema = z.object({
  items: z.array(VehicleChecklistItemSchema),
});

export type VehicleChecklistResult = z.infer<typeof VehicleChecklistResultSchema>;
export type VehicleChecklistItem = z.infer<typeof VehicleChecklistItemSchema>;
