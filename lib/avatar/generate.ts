import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { generateTwinGemini } from "@/lib/ai/gemini";
import { generateTwinOpenAI, type ImageRef } from "@/lib/ai/openai";
import { avatarPrompt, isTall, posePrompt, type Pose } from "@/lib/ai/prompts";
import { cutout, isCutOut } from "./cutout";
import { STYLE_REF_JPEG } from "./style-ref";

/** Twin images are the priciest AI call: at most this many per user per day (regenerations included). */
export const DAILY_TWIN_IMAGES = 16;

async function twinBudgetLeft(sb: SupabaseClient) {
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await sb.from("ai_calls").select("id", { count: "exact", head: true }).eq("kind", "twin").gte("at", since);
  return DAILY_TWIN_IMAGES - (count ?? 0);
}
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
  return file.data ? { bytes: Buffer.from(await file.data.arrayBuffer()), mimeType: file.data.type || "image/webp" } : null;
}

/**
 * Creates (or recreates) the given body-stage images for one user.
 * Falls back to the labeled placeholder when no image model is set up or it fails,
 * so onboarding never blocks (prd.md > States and Boundaries).
 */
export async function generateStages(sb: SupabaseClient, userId: string, stages: number[], force = false): Promise<StageResult[]> {
  const { profile, selfie, ownTwin } = await loadSelfie(sb, userId);
  const { data: have } = await sb.from("avatar_stages").select("stage, is_placeholder").eq("user_id", userId);
  // Only make what's missing (or still a placeholder) unless asked to redo them.
  const todo = force ? stages : stages.filter((n) => !have?.some((h) => h.stage === n && !h.is_placeholder));
  return Promise.all(
    todo.map(async (stage) => {
      const file = (await tryTwin(sb, selfie, ownTwin, stage)) ?? placeholder(stage, profile.skin_tone);
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
export async function generatePoses(sb: SupabaseClient, userId: string, poses: Pose[], force = false): Promise<PoseResult[]> {
  const { selfie, ownTwin } = await loadSelfie(sb, userId);
  const { data: have } = await sb.from("avatar_poses").select("pose").eq("user_id", userId);
  const todo = force ? poses : poses.filter((p) => !have?.some((h) => h.pose === p));
  const out = await Promise.all(
    todo.map(async (pose) => {
      const file = await tryTwin(sb, selfie, pose === "bust" ? null : ownTwin, pose);
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
async function tryTwin(sb: SupabaseClient, selfie: Selfie | null, ownTwin: ImageRef | null, what: number | Pose): Promise<File | null> {
  if (!selfie) return null;
  if ((await twinBudgetLeft(sb)) <= 0) return null;
  await sb.from("ai_calls").insert({ kind: "twin" });
  // Two input images per request: the selfie, plus the user's own portrait (or, for the first portrait, the style reference).
  const refs: ImageRef[] = [selfie, ownTwin ?? { bytes: Buffer.from(STYLE_REF_JPEG, "base64"), mimeType: "image/jpeg" }];
  const prompt = typeof what === "number" ? avatarPrompt(what, !!ownTwin) : posePrompt(what, !!ownTwin);
  let png: Buffer | null = null;
  try {
    png = await generateTwinOpenAI(refs, prompt, { tall: isTall(what), portrait: what === "bust" });
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
  const clear = (await isCutOut(png)) ? png : await cutout(png);
  // A 1024px PNG is ~2 MB; WebP with alpha at phone size is a few hundred KB.
  const body = await sharp(clear).resize({ width: 768, height: 1152, fit: "inside", withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 90 }).toBuffer();
  return { body, type: "image/webp", ext: "webp", placeholder: false };
}
