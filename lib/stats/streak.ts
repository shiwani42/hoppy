"use client";

import { streak } from "@/lib/rules/streak";
import { supabase } from "@/lib/supabase/client";
import { dateKey } from "./today";

/** Current streak from the days with at least one meal (last 120 days). */
export async function loadStreak(now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 120 * 864e5);
  const { data } = await supabase().from("meals").select("eaten_at").gte("eaten_at", since.toISOString());
  return streak((data ?? []).map((m) => dateKey(new Date(m.eaten_at))), dateKey(now));
}
