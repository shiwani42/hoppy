"use client";

import { supabase } from "@/lib/supabase/client";

export type LeaderRow = {
  user_id: string;
  name: string | null;
  current_stage: number;
  strong_days: number;
  is_me: boolean;
  avatar_path: string | null;
  avatar_url?: string;
  streak: number;
};
export type FeedCard = { id: string; user_id: string; kind: string; title: string; created_at: string; url?: string; name?: string | null };

export const PENDING_INVITE = "hoppy:invite";

export async function acceptInvite(code: string): Promise<string | null> {
  const { data, error } = await supabase().rpc("accept_invite", { code });
  if (error) throw new Error(error.message.includes("own invite") ? "That's your own invite link 🙂" : "That invite link didn't work.");
  return data as string | null;
}

export async function loadLeaderboard(): Promise<LeaderRow[]> {
  const sb = supabase();
  const { data } = await sb.rpc("weekly_leaderboard");
  const rows = ((data ?? []) as LeaderRow[]).map((r) => ({ ...r, strong_days: Number(r.strong_days), streak: Number(r.streak ?? 0) }));
  // Friends' twin portraits are readable through the "friends read" storage policy.
  const paths = rows.map((r) => r.avatar_path).filter((p): p is string => !!p);
  if (paths.length) {
    const signed = await sb.storage.from("avatars").createSignedUrls(paths, 3600);
    const byPath = new Map(signed.data?.map((s) => [s.path, s.signedUrl]));
    for (const r of rows) if (r.avatar_path) r.avatar_url = byPath.get(r.avatar_path) ?? undefined;
  }
  return rows;
}

/** My strong days over the last 14 days (for "you vs last week"). */
export async function loadMyFortnight(): Promise<{ date: string; strong: boolean }[]> {
  const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const me = (await supabase().auth.getUser()).data.user?.id ?? "";
  const { data } = await supabase().from("daily_snapshots").select("date, strong_day").eq("user_id", me).gte("date", since);
  return (data ?? []).map((r) => ({ date: r.date as string, strong: !!r.strong_day }));
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

export type Cheer = { id: string; from_id: string; name: string | null; created_at: string };

/** Cheers friends sent me that I haven't seen yet. */
export async function loadNewCheers(): Promise<Cheer[]> {
  const sb = supabase();
  const me = (await sb.auth.getUser()).data.user?.id;
  const [{ data }, friends] = await Promise.all([
    sb.from("cheers").select("id, from_id, created_at").eq("to_id", me ?? "").eq("seen", false).order("created_at"),
    sb.rpc("friend_names"),
  ]);
  const names = new Map(((friends.data ?? []) as { user_id: string; name: string }[]).map((f) => [f.user_id, f.name]));
  return (data ?? []).map((c) => ({ ...c, name: names.get(c.from_id) ?? null }));
}

export async function markCheersSeen(ids: string[]) {
  if (ids.length) await supabase().from("cheers").update({ seen: true }).in("id", ids);
}

export async function sendCheer(toId: string) {
  const { error } = await supabase().from("cheers").insert({ to_id: toId });
  if (error) throw error;
}
