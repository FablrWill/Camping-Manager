-- Phase 34: Normalize MealPlan — replace JSON blob with Meal rows

-- Step 1: Recreate MealPlan without result/cachedAt columns, add notes
-- SQLite cannot DROP COLUMN, so we recreate the table
CREATE TABLE "new_MealPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealPlan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy existing rows (drop result + cachedAt data)
INSERT INTO "new_MealPlan" ("id", "tripId", "generatedAt", "createdAt")
    SELECT "id", "tripId", "generatedAt", "createdAt" FROM "MealPlan";

DROP TABLE "MealPlan";
ALTER TABLE "new_MealPlan" RENAME TO "MealPlan";

-- Recreate unique index on tripId
CREATE UNIQUE INDEX "MealPlan_tripId_key" ON "MealPlan"("tripId");

-- Step 2: Create Meal table
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mealPlanId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ingredients" TEXT NOT NULL,
    "cookInstructions" TEXT,
    "prepNotes" TEXT,
    "estimatedMinutes" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Meal_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Meal_mealPlanId_idx" ON "Meal"("mealPlanId");
CREATE INDEX "Meal_mealPlanId_day_slot_idx" ON "Meal"("mealPlanId", "day", "slot");
