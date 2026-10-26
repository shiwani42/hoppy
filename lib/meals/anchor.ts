import { findFood, nutrientsFor, type Nutrients } from "./foods";
import type { MealItem } from "./types";

/** What a model returns per item, before we anchor it to the reference table. */
export type RawItem = {
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  confidence: number;
  alternatives?: string[];
} & Nutrients;

const DEFAULT_STICKER = "🍽️";

/**
 * Anchors a model's estimate to the reference table when the dish is known
 * (spec.md > Meal Logging): the model decides *what* and *how much*, the table
 * decides the nutrients per gram.
 */
export function anchorItem(raw: RawItem): MealItem {
  const food = findFood(raw.name);
  const grams = raw.grams > 0 ? raw.grams : food ? raw.quantity * food.unitGrams : 100;
  const per100g: Nutrients = food
    ? food.per100g
    : {
        kcal: (raw.kcal / grams) * 100,
        protein_g: (raw.protein_g / grams) * 100,
        fiber_g: (raw.fiber_g / grams) * 100,
        carbs_g: (raw.carbs_g / grams) * 100,
        fat_g: (raw.fat_g / grams) * 100,
        sodium_mg: (raw.sodium_mg / grams) * 100,
      };
  return {
    name: food?.name ?? raw.name,
    quantity: raw.quantity,
    unit: raw.unit || food?.unit || "plate",
    grams: Math.round(grams),
    per100g,
    ...nutrientsFor(per100g, grams),
    sticker: food?.sticker ?? DEFAULT_STICKER,
    food_id: food?.id ?? null,
    confidence: raw.confidence,
    alternatives: raw.alternatives ?? [],
  };
}

/** Rescales an item to a new quantity, keeping grams-per-unit constant. */
export function withQuantity(item: MealItem, quantity: number): MealItem {
  const gramsPerUnit = item.grams / item.quantity;
  const grams = Math.round(gramsPerUnit * quantity);
  return { ...item, quantity, grams, ...nutrientsFor(item.per100g, grams) };
}

/** A fresh item from the reference table (manual search / "something else"). */
export function itemFromFood(foodName: string, quantity = 1): MealItem | null {
  const food = findFood(foodName);
  if (!food) return null;
  const grams = food.unitGrams * quantity;
  return {
    name: food.name,
    quantity,
    unit: food.unit,
    grams,
    per100g: food.per100g,
    ...nutrientsFor(food.per100g, grams),
    sticker: food.sticker,
    food_id: food.id,
    confidence: 1,
    alternatives: [],
  };
}
