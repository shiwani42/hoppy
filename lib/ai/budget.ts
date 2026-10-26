import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "@/lib/supabase/server";

/** Per-user daily cap on AI-backed requests (spec.md > Cost controls). */
export const DAILY_AI_CALLS = 40;

export async function spendAiCall(sb: SupabaseClient, kind: string) {
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await sb.from("ai_calls").select("id", { count: "exact", head: true }).gte("at", since);
  if ((count ?? 0) >= DAILY_AI_CALLS) {
    throw new HttpError(429, "We've chatted a lot today! I'll be fresh again tomorrow 🌙 Logging still works.");
  }
  await sb.from("ai_calls").insert({ kind });
}
