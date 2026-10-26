import data from "@/data/indian-foods.json";

export type Nutrients = {
  kcal: number;
  protein_g: number;
  fiber_g: number;
  carbs_g: number;
  fat_g: number;
  sodium_mg: number;
};

export type Food = {
  id: string;
  name: string;
  aliases: string[];
  unit: string;
  unitGrams: number;
  per100g: Nutrients;
  sticker: string;
};

export const FOODS = data.foods as Food[];
export const NUTRIENT_KEYS: (keyof Nutrients)[] = ["kcal", "protein_g", "fiber_g", "carbs_g", "fat_g", "sodium_mg"];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Best reference-table match for a dish name, or undefined. */
export function findFood(name: string): Food | undefined {
  const n = norm(name);
  if (!n) return undefined;
  const exact = FOODS.find((f) => norm(f.name) === n || f.aliases.some((a) => norm(a) === n));
  if (exact) return exact;
  // Longest name/alias contained in the query wins ("2 masala dosa with chutney" → masala dosa).
  let best: { food: Food; len: number } | undefined;
  for (const f of FOODS) {
    for (const key of [f.name, ...f.aliases].map(norm)) {
      if (key.length >= 3 && (n.includes(key) || key.includes(n)) && (!best || key.length > best.len)) {
        best = { food: f, len: key.length };
      }
    }
  }
  return best?.food;
}

export function searchFoods(query: string, limit = 8): Food[] {
  const q = norm(query);
  if (!q) return FOODS.slice(0, limit);
  return FOODS.filter((f) => [f.name, ...f.aliases].some((k) => norm(k).includes(q))).slice(0, limit);
}

export function nutrientsFor(per100g: Nutrients, grams: number): Nutrients {
  const out = {} as Nutrients;
  for (const k of NUTRIENT_KEYS) out[k] = Math.round((per100g[k] * grams) / 10) / 10;
  return out;
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  const out = { kcal: 0, protein_g: 0, fiber_g: 0, carbs_g: 0, fat_g: 0, sodium_mg: 0 };
  for (const it of items) for (const k of NUTRIENT_KEYS) out[k] += Number(it[k]) || 0;
  return out;
}
