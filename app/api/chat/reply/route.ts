import { z } from "zod";
import { streamGlm } from "@/lib/ai/glm";
import { streamText } from "@/lib/ai/mock";
import { MEAL_REPLIES, pick } from "@/lib/copy/voice";
import { HttpError, route, userFromRequest } from "@/lib/supabase/server";

const Body = z.object({
  items: z.array(z.object({ name: z.string(), quantity: z.number(), unit: z.string() })).min(1).max(12),
  totals: z.object({ kcal: z.number(), protein_g: z.number(), fiber_g: z.number(), fat_g: z.number(), carbs_g: z.number() }),
  name: z.string().max(40).optional(),
});

const SYSTEM = `You are Hoppy, a warm, playful avatar of the user who lives in their calorie tracker.
React to the meal they just logged in ONE short line (max 14 words). Be appreciative and encouraging,
never critical or preachy, never call food bad. Light Hinglish is welcome. At most one emoji.`;

/** Picks a canned line matching the meal's character, for the keyless demo. */
function demoLine(t: z.infer<typeof Body>["totals"]) {
  if (t.protein_g >= 15) return pick(MEAL_REPLIES.protein);
  if (t.fiber_g >= 6) return pick(MEAL_REPLIES.fiber);
  if (t.fat_g >= 25 || t.kcal >= 700) return pick(MEAL_REPLIES.treat);
  if (t.kcal <= 350) return pick(MEAL_REPLIES.light);
  return pick(MEAL_REPLIES.default);
}

/** POST /api/chat/reply — streams the post-log one-liner. spec.md > Chat */
export const POST = route(async (req) => {
  await userFromRequest(req);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, "Invalid meal");
  const { items, totals, name } = parsed.data;

  const meal = items.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(", ");
  let stream: ReadableStream<Uint8Array> | null = null;
  try {
    stream = await streamGlm([
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `${name ? `My name is ${name}. ` : ""}I just ate: ${meal}. ` +
          `About ${Math.round(totals.kcal)} kcal, ${Math.round(totals.protein_g)} g protein, ${Math.round(totals.fiber_g)} g fibre.`,
      },
    ], 60);
  } catch (err) {
    console.error("GLM reply failed", err);
  }
  return new Response(stream ?? streamText(demoLine(totals)), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
});
