import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateAvatarImage } from "@/lib/ai/gemini";
import { placeholderAvatarSvg } from "./placeholder";

export type StageResult = { stage: number; image_path: string; is_placeholder: boolean };

/**
 * Creates (or recreates) the given body-stage images for one user.
 * Falls back to the labeled placeholder when Gemini is unavailable or fails,
 * so onboarding never blocks (prd.md > States and Boundaries).
 */
export async function generateStages(
  sb: SupabaseClient,
  userId: string,
  stages: number[],
): Promise<StageResult[]> {
  const { data: profile, error } = await sb
    .from("profiles")
    .select("selfie_path, skin_tone")
    .eq("user_id", userId)
    .single();
  if (error || !profile?.selfie_path) throw new Error("Take a selfie first");

  let selfie: { bytes: Buffer; mimeType: string } | null = null;
  const download = await sb.storage.from("selfies").download(profile.selfie_path);
  if (download.data) {
    selfie = {
      bytes: Buffer.from(await download.data.arrayBuffer()),
      mimeType: download.data.type || "image/jpeg",
    };
  }

  const results: StageResult[] = [];
  for (const stage of stages) {
    const file = (await tryGemini(selfie, stage)) ?? {
      body: placeholderAvatarSvg(stage, profile.skin_tone ?? undefined),
      type: "image/svg+xml",
      ext: "svg",
      placeholder: true,
    };

    const image_path = `${userId}/stage-${stage}.${file.ext}`;
    const up = await sb.storage
      .from("avatars")
      .upload(image_path, file.body, { contentType: file.type, upsert: true });
    if (up.error) throw up.error;

    const row = { user_id: userId, stage, image_path, is_placeholder: file.placeholder };
    const ins = await sb.from("avatar_stages").upsert(row);
    if (ins.error) throw ins.error;
    results.push(row);
  }
  return results;
}

async function tryGemini(selfie: { bytes: Buffer; mimeType: string } | null, stage: number) {
  if (!selfie) return null;
  try {
    const img = await generateAvatarImage(selfie, stage);
    if (!img) return null;
    return {
      body: img.bytes,
      type: img.mimeType,
      ext: img.mimeType.includes("png") ? "png" : "jpg",
      placeholder: false,
    };
  } catch (err) {
    console.error(`avatar stage ${stage} failed`, err);
    return null;
  }
}
