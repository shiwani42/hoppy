"use client";

import { supabase } from "@/lib/supabase/client";

export type LeaderRow = { user_id: string; name: string | null; current_stage: number; strong_days: number; is_me: boolean };
export type FeedCard = { id: string; user_id: string; kind: string; title: string; created_at: string; url?: string; name?: string | null };

export const PENDING_INVITE = "hoppy:invite";

export async function acceptInvite(code: string): Promise<string | null> {
  const { data, error } = await supabase().rpc("accept_invite", { code });
  if (error) throw new Error(error.message.includes("own invite") ? "That's your own invite link 🙂" : "That invite link didn't work.");
  return data as string | null;
}

export async function loadLeaderboard(): Promise<LeaderRow[]> {
  const { data } = await supabase().rpc("weekly_leaderboard");
  return ((data ?? []) as LeaderRow[]).map((r) => ({ ...r, strong_days: Number(r.strong_days) }));
}

export async function loadFeed(): Promise<FeedCard[]> {
  const sb = supabase();
  const [cards, friends, me] = await Promise.all([
    sb.from("shared_cards").select("id, user_id, kind, title, image_path, created_at").order("created_at", { ascending: false }).limit(30),
    sb.rpc("friend_names"),
    sb.from("profiles").select("user_id, name").single(),
  ]);
  const names = new Map<string, string | null>([...((friends.data ?? []) as { user_id: string; name: string }[]).map((f) => [f.user_id, f.name] as const), [me.data?.user_id ?? "", me.data?.name ?? null]]);
  const rows = cards.data ?? [];
  if (!rows.length) return [];
  const signed = await sb.storage.from("cards").createSignedUrls(rows.map((r) => r.image_path), 3600);
  return rows.map((r, i) => ({ ...r, url: signed.data?.[i]?.signedUrl ?? undefined, name: names.get(r.user_id) }));
}

export async function loadInviteCode(): Promise<string | null> {
  const { data } = await supabase().from("profiles").select("invite_code").single();
  return data?.invite_code ?? null;
}
