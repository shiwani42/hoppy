"use client";

import { supabase } from "@/lib/supabase/client";
import type { ReminderRow } from "./due";

export const DEFAULT_REMINDERS: ReminderRow[] = [
  { meal_type: "breakfast", time: "08:30", enabled: true },
  { meal_type: "lunch", time: "13:30", enabled: true },
  { meal_type: "dinner", time: "20:30", enabled: true },
];

export async function loadReminders(): Promise<ReminderRow[]> {
  const { data } = await supabase().from("reminders").select("meal_type, time, enabled");
  return (data ?? []) as ReminderRow[];
}

/** Creates the default meal reminders the first time reminders are turned on. */
export async function ensureDefaultReminders() {
  const existing = await loadReminders();
  if (existing.length) return existing;
  const { error } = await supabase().from("reminders").insert(DEFAULT_REMINDERS);
  if (error) throw error;
  return DEFAULT_REMINDERS;
}

export async function saveReminder(r: ReminderRow) {
  const { error } = await supabase().from("reminders").upsert(r, { onConflict: "user_id,meal_type" });
  if (error) throw error;
}

/**
 * In-app fallback when push isn't allowed: the most recent meal reminder in the
 * last 3 hours whose meal hasn't been logged yet.
 */
export function missedMeal(reminders: ReminderRow[], nowHm: string, logged: Set<string>) {
  const m = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
  return reminders
    .filter((r) => r.enabled && !logged.has(r.meal_type) && m(nowHm) - m(r.time) >= 0 && m(nowHm) - m(r.time) <= 180)
    .sort((a, b) => b.time.localeCompare(a.time))[0];
}
