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

const MealPlanMealSchema = z.object({
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

// --- Float Plan Email Schema ---

export const FloatPlanEmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type FloatPlanEmail = z.infer<typeof FloatPlanEmailSchema>;

// --- Trip Summary Schema (Phase 9 - LEARN-02) ---

export const TripSummaryResultSchema = z.object({
  whatToDrop: z.array(z.string()).default([]),
  whatWasMissing: z.array(z.string()).default([]),
  locationRating: z.number().min(1).max(5).nullable(),
  summary: z.string(),
});

export type TripSummaryResult = z.infer<typeof TripSummaryResultSchema>;
