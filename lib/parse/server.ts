import "server-only";
import { z } from "zod";
import { glmJson } from "@/lib/ai/glm";
import { AiMealItem } from "@/lib/ai/schemas";
import { anchorItem } from "@/lib/meals/anchor";
import { ACTIVITIES, activityByKey } from "@/lib/rules/activity";
import { parseLog, type Parsed } from "./text";

const GlmResult = z.object({
  kind: z.enum(["meal", "activity", "unknown"]),
  items: z.array(AiMealItem).optional(),
  activity_key: z.string().optional(),
  minutes: z.number().nullable().optional(),
});

const SYSTEM = `You turn a short food or exercise log from an Indian user (English, Hindi or Hinglish) into JSON.
Return {"kind":"meal","items":[...]} for food, {"kind":"activity","activity_key":"...","minutes":N|null} for exercise,
or {"kind":"unknown"} for anything else (questions, chit-chat).
Meal items: {name (common Indian dish name in English), quantity, unit (roti|paratha|naan|puri|katori|plate|piece|dosa|egg|omelette|cup|glass|slice|handful),
grams, kcal, protein_g, fiber_g, carbs_g, fat_g, sodium_mg, confidence (0-1), alternatives: []} — nutrients for the whole portion, typical home cooking.
Activity keys: ${ACTIVITIES.map((a) => a.key).join(", ")}.`;

/** Local parser first; GLM only for what it couldn't understand (spec.md > Cost controls). */
export async function parseWithFallback(text: string): Promise<Parsed & { ai?: boolean }> {
  const local = parseLog(text);
  const needsAi = local.kind === "unknown" || (local.kind === "meal" && local.unknown.length > 0);
  if (!needsAi) return local;

  let ai: z.infer<typeof GlmResult> | null = null;
  try {
    const raw = await glmJson([
      { role: "system", content: SYSTEM },
      { role: "user", content: local.kind === "meal" ? local.unknown.join(", ") : text },
    ]);
    ai = raw ? GlmResult.parse(raw) : null;
  } catch (err) {
    console.error("GLM parse failed", err);
  }
  if (!ai) return local;

  if (ai.kind === "meal" && ai.items?.length) {
    const items = ai.items.map(anchorItem);
    return { kind: "meal", items: local.kind === "meal" ? [...local.items, ...items] : items, unknown: [], ai: true };
  }
  if (ai.kind === "activity" && ai.activity_key) {
    const a = activityByKey(ai.activity_key);
    if (a) return { kind: "activity", activity: { key: a.key, label: a.label, emoji: a.emoji, met: a.met, minutes: ai.minutes ?? null }, ai: true };
  }
  return local;
}
