import type { DietType } from "@/lib/rules/targets";

/** The compact day summary sent to the chat model (~300 tokens) instead of raw history. */
export type DaySummary = {
  name: string | null;
  diet: DietType | null;
  targets: { kcal: number | null; protein_g: number | null; fiber_g: number; water_ml: number; active_min: number };
  today: {
    kcal_in: number;
    kcal_out: number;
    protein_g: number;
    fiber_g: number;
    carbs_g: number;
    fat_g: number;
    sodium_mg: number;
    water_ml: number;
    active_min: number;
    sleep_h: number | null;
    meals: string[];
    workouts: string[];
  };
};
