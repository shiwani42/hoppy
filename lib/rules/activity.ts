import data from "@/data/met-activities.json";

/**
 * Calories out and active minutes — spec.md > Rules Engine (activity.ts).
 *
 * - Energy: kcal = MET × body weight (kg) × hours (Compendium of Physical Activities 2024).
 * - Active minutes are moderate-equivalent: MET-minutes ÷ 4. This matches WHO 2020's
 *   ~600 MET-min/week (150 min × 4 MET) and makes vigorous minutes count about double,
 *   while gentle yoga still earns partial credit instead of none.
 */

export type Activity = { key: string; label: string; aliases: string[]; met: number; emoji: string };
export const ACTIVITIES = data.activities as Activity[];

/** Used for calories out until the user tells us their weight. */
export const DEFAULT_WEIGHT_KG = 65;
/** One surya namaskar round of 12 poses takes roughly this long at a steady pace. */
export const MINUTES_PER_SURYA_ROUND = 1.2;

export function activityByKey(key: string) {
  return ACTIVITIES.find((a) => a.key === key);
}

export function kcalBurned(met: number, minutes: number, weightKg?: number | null) {
  return Math.round(met * (weightKg || DEFAULT_WEIGHT_KG) * (minutes / 60));
}

export function activeMinutes(met: number, minutes: number) {
  return Math.round(((met * minutes) / 4) * 10) / 10;
}

export function intensity(met: number): "light" | "moderate" | "vigorous" {
  return met < 3 ? "light" : met < 6 ? "moderate" : "vigorous";
}
