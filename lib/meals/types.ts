import type { Nutrients } from "./foods";

export type MealType = "breakfast" | "lunch" | "snack" | "dinner";

/** One editable line in the confirm sheet and in meal_items. */
export type MealItem = Nutrients & {
  name: string;
  quantity: number;
  unit: string;
  /** grams for the current quantity */
  grams: number;
  /** nutrients per 100 g so portions can be rescaled without another AI call */
  per100g: Nutrients;
  sticker: string;
  food_id: string | null;
  confidence: number;
  alternatives: string[];
};

export type MealAnalysis = {
  is_food: boolean;
  items: MealItem[];
  /** true when the result came from the labeled demo fallback, not a real model */
  demo: boolean;
};

export function mealTypeFor(date = new Date()): MealType {
  const h = date.getHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 16) return "lunch";
  if (h >= 19 && h < 23) return "dinner";
  return "snack";
}

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "snack", "dinner"];
