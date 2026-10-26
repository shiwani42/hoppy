import { after } from "next/server";
import { z } from "zod";
import { POSES, type Pose } from "@/lib/ai/prompts";
import { generatePoses, generateStages } from "@/lib/avatar/generate";
import { HttpError, route, userFromRequest } from "@/lib/supabase/server";

const Body = z.object({
  stages: z.array(z.number().int().min(1).max(5)).max(5).default([]),
  poses: z.array(z.enum(Object.keys(POSES) as [Pose, ...Pose[]])).max(6).default([]),
  /** Redo images that already exist (retaking the selfie). Otherwise only missing ones are made. */
  force: z.boolean().default(false),
  /** Reply at once and make the images after the response (onboarding doesn't wait). */
  background: z.boolean().default(false),
});

export const maxDuration = 60;

/** POST /api/avatar — spec.md > Avatar Service: body stages and/or poses of the twin. */
export const POST = route(async (req) => {
  const { sb, user } = await userFromRequest(req);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || parsed.data.stages.length + parsed.data.poses.length === 0) throw new HttpError(400, "Invalid stages or poses");
  const { stages, poses, force, background } = parsed.data;

  if (background) {
    // Poses first (the portrait is what later images match), then the stages.
    after(async () => {
      try {
        if (poses.length) await generatePoses(sb, user.id, poses, force);
        if (stages.length) await generateStages(sb, user.id, stages, force);
      } catch (err) {
        console.error("background twin failed", err);
      }
    });
    return Response.json({ started: true }, { status: 202 });
  }

  const [s, p] = await Promise.all([
    stages.length ? generateStages(sb, user.id, stages, force) : [],
    poses.length ? generatePoses(sb, user.id, poses, force) : [],
  ]);
  return Response.json({ stages: s, poses: p });
});
