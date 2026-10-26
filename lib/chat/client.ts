"use client";

import { api, supabase } from "@/lib/supabase/client";
import type { StatCard } from "./answer";

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  kind: "chat" | "nudge";
  content: string;
  stat: StatCard | null;
  created_at: string;
};

export async function loadChat(from: Date, to: Date): Promise<ChatMsg[]> {
  const { data } = await supabase()
    .from("chat_messages")
    .select("*")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at");
  return (data ?? []) as ChatMsg[];
}

export async function saveNudge(content: string) {
  await supabase().from("chat_messages").insert({ role: "assistant", kind: "nudge", content });
}

/** Asks about the day; streams the answer text and returns the stat card if any. */
export async function askHoppy(
  question: string,
  dayStart: Date,
  date: string,
  onText: (soFar: string) => void,
): Promise<{ text: string; stat: StatCard | null; suggestsFood: boolean }> {
  const res = await api("/api/chat/ask", {
    method: "POST",
    body: JSON.stringify({ question, dayStart: dayStart.toISOString(), date }),
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "I'm a bit slow right now — try again in a moment?");
  }
  const statHeader = res.headers.get("X-Hoppy-Stat");
  const stat = statHeader ? (JSON.parse(decodeURIComponent(statHeader)) as StatCard) : null;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    onText(text);
  }
  return { text: text.trim(), stat, suggestsFood: res.headers.get("X-Hoppy-Suggests-Food") === "1" };
}
