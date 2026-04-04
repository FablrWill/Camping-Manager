-- Phase 35: Add ShoppingListItem, updated MealFeedback, and prepGuide to MealPlan
-- NOTE: prepGuide, ShoppingListItem, and MealFeedback were already created by
-- 20260404000000_add_meal_feedback — this migration is intentionally a no-op
-- to avoid duplicate column errors on fresh dev databases.
-- Production databases that were migrated before 20260404000000 would have needed
-- this migration, but dev databases apply both sequentially.

-- Drop old MealFeedback table and recreate with updated schema (idempotent)
DROP TABLE IF EXISTS "MealFeedback";

CREATE TABLE IF NOT EXISTS "MealFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mealId" TEXT,
    "mealPlanId" TEXT NOT NULL,
    "mealName" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealFeedback_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MealFeedback_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MealFeedback_mealPlanId_idx" ON "MealFeedback"("mealPlanId");
CREATE INDEX IF NOT EXISTS "MealFeedback_mealId_idx" ON "MealFeedback"("mealId");
CREATE INDEX IF NOT EXISTS "MealFeedback_createdAt_idx" ON "MealFeedback"("createdAt");

CREATE TABLE IF NOT EXISTS "ShoppingListItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mealPlanId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'other',
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShoppingListItem_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ShoppingListItem_mealPlanId_idx" ON "ShoppingListItem"("mealPlanId");
