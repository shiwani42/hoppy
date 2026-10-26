import { z } from "zod";

export const UNITS = [
  "roti", "paratha", "naan", "puri", "katori", "plate", "piece", "dosa",
  "egg", "omelette", "cup", "glass", "slice", "handful",
] as const;

export const AiMealItem = z.object({
  name: z.string().describe("Common Indian dish name in English, e.g. 'Dal tadka', 'Roti / chapati'"),
  quantity: z.number().describe("How many of `unit`, e.g. 3 rotis, 1 katori"),
  unit: z.enum(UNITS),
  grams: z.number().describe("Estimated grams for the whole portion"),
  kcal: z.number(),
  protein_g: z.number(),
  fiber_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  sodium_mg: z.number(),
  confidence: z.number().describe("0 to 1"),
  alternatives: z.array(z.string()).describe("Up to 3 other likely dishes when unsure, else empty"),
});

export const AiMeal = z.object({
  is_food: z.boolean(),
  items: z.array(AiMealItem),
});

export type AiMealT = z.infer<typeof AiMeal>;
