import { z } from "zod";
import { generateStages } from "@/lib/avatar/generate";
import { HttpError, route, userFromRequest } from "@/lib/supabase/server";

const Body = z.object({ stages: z.array(z.number().int().min(1).max(5)).min(1).max(5).default([1]) });

/** POST /api/avatar — spec.md > Avatar Service */
export const POST = route(async (req) => {
  const { sb, user } = await userFromRequest(req);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw new HttpError(400, "Invalid stages");
  const stages = await generateStages(sb, user.id, parsed.data.stages);
  return Response.json({ stages });
});
