import "server-only";
import { analyzeMealPhotoGemini } from "@/lib/ai/gemini";
import { mockMeal } from "@/lib/ai/mock";
import { analyzeMealPhoto, MEAL_PROMPT } from "@/lib/ai/openai";
import { hasKey } from "@/lib/ai/config";
import type { AiMealT } from "@/lib/ai/schemas";
import { anchorItem } from "./anchor";
import type { MealAnalysis } from "./types";

/**
 * Photo → anchored meal items. OpenAI first (strongest on food photos), Gemini
 * as backup, labeled demo data when neither key is set.
 */
export async function analyzePhoto(image: Buffer, mimeType: string, sample = false): Promise<MealAnalysis> {
  let raw: AiMealT | null = null;
  try {
    raw = await analyzeMealPhoto(image, mimeType);
  } catch (err) {
    console.error("OpenAI meal photo failed, trying Gemini", err);
  }
  if (!raw) {
    try {
      raw = await analyzeMealPhotoGemini(image, mimeType, MEAL_PROMPT);
    } catch (err) {
      console.error("Gemini meal photo failed", err);
    }
  }
  const demo = !raw && !hasKey.openai() && !hasKey.gemini();
  if (!raw && !demo) throw new Error("AI unavailable");
  raw ??= mockMeal(image, sample);
  return { is_food: raw.is_food, items: raw.is_food ? raw.items.map(anchorItem) : [], demo };
}
