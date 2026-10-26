"use client";

import { supabase } from "@/lib/supabase/client";

export type AvatarStage = { stage: number; url: string; is_placeholder: boolean };

/** Signed URLs for the current user's avatar stages, keyed by stage number. */
export async function loadAvatarStages(): Promise<Record<number, AvatarStage>> {
  const sb = supabase();
  const { data, error } = await sb.from("avatar_stages").select("stage, image_path, is_placeholder");
  if (error || !data?.length) return {};
  const signed = await sb.storage
    .from("avatars")
    .createSignedUrls(data.map((r) => r.image_path), 60 * 60 * 24);
  const out: Record<number, AvatarStage> = {};
  data.forEach((r, i) => {
    const url = signed.data?.[i]?.signedUrl;
    if (url) out[r.stage] = { stage: r.stage, url, is_placeholder: r.is_placeholder };
  });
  return out;
}
