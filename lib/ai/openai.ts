import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { hasKey, models } from "./config";
import { AiMeal, type AiMealT } from "./schemas";

export const MEAL_PROMPT = `You are the food eye of Hoppy, a calorie tracker for Indian home food.
Look at the photo and list every distinct food item (split thalis and combo plates into items).
For each item give: the common Indian dish name in English, the unit (count rotis/puris/idlis,
"katori" means a ~150 ml bowl), the quantity, estimated grams for the whole portion, and nutrients
for that portion. Assume typical Indian home cooking unless you can see otherwise (ghee, fried, etc.).
Set confidence 0–1; when below 0.6, give up to 3 alternatives. If the photo is not food,
return is_food=false and no items.`;

let client: OpenAI | null = null;
const openai = () => (client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }));

/** Meal photo → items. Returns null without a key so callers use the demo fallback. */
export async function analyzeMealPhoto(image: Buffer, mimeType: string): Promise<AiMealT | null> {
  if (!hasKey.openai()) return null;
  const res = await openai().responses.parse({
    model: models.mealVision,
    input: [
      { role: "system", content: MEAL_PROMPT },
      {
        role: "user",
        content: [
          { type: "input_image", image_url: `data:${mimeType};base64,${image.toString("base64")}`, detail: "auto" },
          { type: "input_text", text: "What's on this plate?" },
        ],
      },
    ],
    text: { format: zodTextFormat(AiMeal, "meal") },
  });
  if (!res.output_parsed) throw new Error("OpenAI returned no parsed meal");
  return res.output_parsed;
}
