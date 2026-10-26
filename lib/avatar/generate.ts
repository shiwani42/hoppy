import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateTwinGemini } from "@/lib/ai/gemini";
import { generateTwinOpenAI, type ImageRef } from "@/lib/ai/openai";
import { avatarPrompt, isTall, posePrompt, type Pose } from "@/lib/ai/prompts";
import { cutout, isCutOut } from "./cutout";
import { STYLE_REF_JPEG } from "./style-ref";
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
  return { profile, selfie, ownTwin: await loadOwnTwin(sb, userId) };
}

/** The user's twin portrait, if made: later images are drawn to match it. */
async function loadOwnTwin(sb: SupabaseClient, userId: string): Promise<ImageRef | null> {
  const { data } = await sb.from("avatar_poses").select("image_path, is_placeholder").eq("user_id", userId).eq("pose", "bust").maybeSingle();
  if (!data || data.is_placeholder) return null;
  const file = await sb.storage.from("avatars").download(data.image_path);
  return file.data ? { bytes: Buffer.from(await file.data.arrayBuffer()), mimeType: "image/png" } : null;
}

/**
 * Creates (or recreates) the given body-stage images for one user.
 * Falls back to the labeled placeholder when no image model is set up or it fails,
 * so onboarding never blocks (prd.md > States and Boundaries).
 */
export async function generateStages(sb: SupabaseClient, userId: string, stages: number[]): Promise<StageResult[]> {
  const { profile, selfie, ownTwin } = await loadSelfie(sb, userId);
  return Promise.all(
    stages.map(async (stage) => {
      const file = (await tryTwin(selfie, ownTwin, stage)) ?? placeholder(stage, profile.skin_tone);
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
 * Without an image model nothing is stored: screens fall back to the stage image.
 */
export async function generatePoses(sb: SupabaseClient, userId: string, poses: Pose[]): Promise<PoseResult[]> {
  const { selfie, ownTwin } = await loadSelfie(sb, userId);
  const out = await Promise.all(
    poses.map(async (pose) => {
      const file = await tryTwin(selfie, pose === "bust" ? null : ownTwin, pose);
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

/** OpenAI first, Gemini as backup; null (→ placeholder) when neither is set up or both fail. */
async function tryTwin(selfie: Selfie | null, ownTwin: ImageRef | null, what: number | Pose): Promise<File | null> {
  if (!selfie) return null;
  const refs: ImageRef[] = [selfie, { bytes: Buffer.from(STYLE_REF_JPEG, "base64"), mimeType: "image/jpeg" }, ...(ownTwin ? [ownTwin] : [])];
  const prompt = typeof what === "number" ? avatarPrompt(what, !!ownTwin) : posePrompt(what, !!ownTwin);
  let png: Buffer | null = null;
  try {
    png = await generateTwinOpenAI(refs, prompt, isTall(what));
  } catch (err) {
    console.error(`OpenAI twin ${what} failed, trying Gemini`, err);
  }
  if (!png) {
    try {
      png = (await generateTwinGemini(refs, prompt))?.bytes ?? null;
    } catch (err) {
      console.error(`Gemini twin ${what} failed`, err);
    }
  }
  if (!png) return null;
  // OpenAI returns a transparent background; Gemini can't, so cut it out.
  return { body: (await isCutOut(png)) ? png : await cutout(png), type: "image/png", ext: "png", placeholder: false };
}
