"use client";

import type { Profile } from "@/lib/profile";
import { saveProfile } from "@/lib/profile";
import { stageProgress, WINDOW_DAYS, type StageProgress } from "@/lib/rules/stages";
import { dateKey } from "@/lib/stats/today";
import { supabase } from "@/lib/supabase/client";

export async function loadStrongDays(today = new Date()): Promise<string[]> {
  const since = new Date(today.getTime() - WINDOW_DAYS * 864e5);
  const { data } = await supabase().from("daily_snapshots").select("date").eq("strong_day", true).gte("date", dateKey(since));
  return (data ?? []).map((r) => r.date as string);
}

export async function progressFor(p: Profile, today = new Date()): Promise<StageProgress> {
  return stageProgress({
    stage: p.current_stage,
    stageChangedAt: p.stage_changed_at,
    strongDays: await loadStrongDays(today),
    today: dateKey(today),
    startWeightKg: p.start_weight_kg,
    goalWeightKg: p.goal_weight_kg,
    currentWeightKg: p.weight_kg,
  });
}

/** Moves the avatar up one stage (never down). */
export async function stageUp(p: Profile) {
  return saveProfile({ current_stage: Math.min(5, p.current_stage + 1), stage_changed_at: dateKey() });
}
