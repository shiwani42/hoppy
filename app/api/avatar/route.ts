import { z } from "zod";
import { POSES, type Pose } from "@/lib/ai/prompts";
import { generatePoses, generateStages } from "@/lib/avatar/generate";
import { HttpError, route, userFromRequest } from "@/lib/supabase/server";

const Body = z.object({
  stages: z.array(z.number().int().min(1).max(5)).max(5).default([]),
  poses: z.array(z.enum(Object.keys(POSES) as [Pose, ...Pose[]])).max(6).default([]),
  /** Redo images that already exist (retaking the selfie). Otherwise only missing ones are made. */
  force: z.boolean().default(false),
});

export const maxDuration = 60;

/** POST /api/avatar — spec.md > Avatar Service: body stages and/or poses of the twin. */
export const POST = route(async (req) => {
  const { sb, user } = await userFromRequest(req);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || parsed.data.stages.length + parsed.data.poses.length === 0) throw new HttpError(400, "Invalid stages or poses");
  const [stages, poses] = await Promise.all([
    parsed.data.stages.length ? generateStages(sb, user.id, parsed.data.stages, parsed.data.force) : [],
    parsed.data.poses.length ? generatePoses(sb, user.id, parsed.data.poses, parsed.data.force) : [],
  ]);
  return Response.json({ stages, poses });
});
