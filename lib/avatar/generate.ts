import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateAvatarImage } from "@/lib/ai/gemini";
import type { Pose } from "@/lib/ai/prompts";
import { cutout } from "./cutout";
import { placeholderAvatarSvg } from "./placeholder";

export type StageResult = { stage: number; image_path: string; is_placeholder: boolean };
export type PoseResult = { pose: Pose; image_path: string; is_placeholder: boolean };

type Selfie = { bytes: Buffer; mimeType: string };
type File = { body: Buffer | string; type: string; ext: string; placeholder: boolean };

async function loadSelfie(sb: SupabaseClient, userId: string) {
  const { data: profile, error } = await sb
    .from("profiles")
    .select("selfie_path, skin_tone, current_stage")
    .eq("user_id", userId)
    .single();
  if (error || !profile?.selfie_path) throw new Error("Take a selfie first");
  const download = await sb.storage.from("selfies").download(profile.selfie_path);
  const selfie: Selfie | null = download.data
    ? { bytes: Buffer.from(await download.data.arrayBuffer()), mimeType: download.data.type || "image/jpeg" }
    : null;
  return { profile, selfie };
}

/**
 * Creates (or recreates) the given body-stage images for one user.
 * Falls back to the labeled placeholder when Gemini is unavailable or fails,
 * so onboarding never blocks (prd.md > States and Boundaries).
 */
export async function generateStages(sb: SupabaseClient, userId: string, stages: number[]): Promise<StageResult[]> {
  const { profile, selfie } = await loadSelfie(sb, userId);
  return Promise.all(
    stages.map(async (stage) => {
      const file = (await tryGemini(selfie, stage)) ?? placeholder(stage, profile.skin_tone);
      const image_path = `${userId}/stage-${stage}.${file.ext}`;
      await upload(sb, image_path, file);
      const row = { user_id: userId, stage, image_path, is_placeholder: file.placeholder };
      const ins = await sb.from("avatar_stages").upsert(row);
      if (ins.error) throw ins.error;
      return row;
    }),
  );
}

/**
 * Poses of the twin used around the app (drinking water, stretching, cheering…).
 * Without Gemini nothing is stored: screens fall back to the stage image.
 */
export async function generatePoses(sb: SupabaseClient, userId: string, poses: Pose[]): Promise<PoseResult[]> {
  const { selfie } = await loadSelfie(sb, userId);
  const out = await Promise.all(
    poses.map(async (pose) => {
      const file = await tryGemini(selfie, pose);
      if (!file) return null;
      const image_path = `${userId}/pose-${pose}.${file.ext}`;
      await upload(sb, image_path, file);
      const row = { user_id: userId, pose, image_path, is_placeholder: false };
      const ins = await sb.from("avatar_poses").upsert(row);
      if (ins.error) throw ins.error;
      return row;
    }),
  );
  return out.filter((r) => r !== null);
}

function placeholder(stage: number, skinTone: string | null): File {
  return { body: placeholderAvatarSvg(stage, skinTone ?? undefined), type: "image/svg+xml", ext: "svg", placeholder: true };
}

async function upload(sb: SupabaseClient, path: string, file: File) {
  const up = await sb.storage.from("avatars").upload(path, file.body, { contentType: file.type, upsert: true });
  if (up.error) throw up.error;
}

async function tryGemini(selfie: Selfie | null, what: number | Pose): Promise<File | null> {
  if (!selfie) return null;
  try {
    const img = await generateAvatarImage(selfie, what);
    if (!img) return null;
    // Transparent background, so the twin sits on any card or ring.
    return { body: await cutout(img.bytes), type: "image/png", ext: "png", placeholder: false };
  } catch (err) {
    console.error(`avatar ${what} failed`, err);
    return null;
  }
}
