-- Phase 35: Add ShoppingListItem, updated MealFeedback, and prepGuide to MealPlan

-- Add prepGuide field to MealPlan (nullable JSON string)
ALTER TABLE "MealPlan" ADD COLUMN "prepGuide" TEXT;

-- Drop old MealFeedback table (had mealId @unique constraint, different schema)
DROP TABLE IF EXISTS "MealFeedback";

-- Create updated MealFeedback table (denormalized mealName, nullable mealId, mealPlanId required)
CREATE TABLE "MealFeedback" (
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

CREATE INDEX "MealFeedback_mealPlanId_idx" ON "MealFeedback"("mealPlanId");
CREATE INDEX "MealFeedback_mealId_idx" ON "MealFeedback"("mealId");
CREATE INDEX "MealFeedback_createdAt_idx" ON "MealFeedback"("createdAt");

-- Create ShoppingListItem table
CREATE TABLE "ShoppingListItem" (
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

CREATE INDEX "ShoppingListItem_mealPlanId_idx" ON "ShoppingListItem"("mealPlanId");
