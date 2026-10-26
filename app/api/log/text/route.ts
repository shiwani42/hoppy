import { z } from "zod";
import { spendAiCall } from "@/lib/ai/budget";
import { parseWithFallback } from "@/lib/parse/server";
import { HttpError, route, userFromRequest } from "@/lib/supabase/server";

const Body = z.object({ text: z.string().trim().min(1).max(300) });

/** POST /api/log/text — typed (or on-device transcribed) meal or activity log. */
export const POST = route(async (req) => {
  const { sb } = await userFromRequest(req);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, "Say or type what you ate or did");
  const result = await parseWithFallback(parsed.data.text);
  if (result.ai) await spendAiCall(sb, "parse");
  return Response.json(result);
});
