import "server-only";
import OpenAI, { toFile } from "openai";
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

export type ImageRef = { bytes: Buffer; mimeType: string };

/**
 * One twin image from reference images (selfie, style reference, own twin) and a
 * prompt (lib/ai/prompts.ts > twinPrompt). Transparent PNG. Null without a key.
 */
export async function generateTwinOpenAI(refs: ImageRef[], prompt: string, opts: { tall: boolean; portrait: boolean }): Promise<Buffer | null> {
  if (!hasKey.openai()) return null;
  const model = models.twinImage;
  const image = await Promise.all(
    refs.map((r, i) => toFile(r.bytes, `ref-${i + 1}.${r.mimeType.includes("png") ? "png" : "jpg"}`, { type: r.mimeType })),
  );
  const res = await openai().images.edit({
    model,
    image,
    prompt,
    size: opts.tall ? "1024x1536" : "1024x1024",
    quality: opts.portrait ? models.twinPortraitQuality : models.twinQuality,
    background: "transparent",
    output_format: "png",
    // Face likeness: an explicit setting only on the gpt-image-1 family; newer models do it by default.
    ...(model.startsWith("gpt-image-1") ? { input_fidelity: "high" as const } : {}),
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image");
  return Buffer.from(b64, "base64");
}
