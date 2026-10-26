"use client";

import { activeMinutes, kcalBurned } from "@/lib/rules/activity";
import type { ParsedActivity } from "@/lib/parse/text";
import { saveProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase/client";

export type SavedActivity = {
  id: string;
  done_at: string;
  activity_key: string;
  label: string;
  minutes: number;
  met: number;
  kcal: number;
  active_minutes: number;
};

export async function saveActivity(a: ParsedActivity & { minutes: number }, weightKg: number | null, source: "text" | "voice" | "manual") {
  const { data, error } = await supabase()
    .from("activities")
    .insert({
      activity_key: a.key,
      label: a.label,
      minutes: a.minutes,
      met: a.met,
      kcal: kcalBurned(a.met, a.minutes, weightKg),
      active_minutes: activeMinutes(a.met, a.minutes),
      source,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as SavedActivity;
}

export async function loadActivities(from: Date, to: Date): Promise<SavedActivity[]> {
  const { data } = await supabase()
    .from("activities")
    .select("*")
    .gte("done_at", from.toISOString())
    .lt("done_at", to.toISOString())
    .order("done_at");
  return (data ?? []) as SavedActivity[];
}

export async function deleteActivity(id: string) {
  await supabase().from("activities").delete().eq("id", id);
}

export async function addWater(ml: number) {
  const { error } = await supabase().from("water_logs").insert({ ml });
  if (error) throw error;
}

export async function undoLastWater(from: Date) {
  const sb = supabase();
  const { data } = await sb.from("water_logs").select("id").gte("at", from.toISOString()).order("at", { ascending: false }).limit(1);
  if (data?.[0]) await sb.from("water_logs").delete().eq("id", data[0].id);
}

export async function loadWaterMl(from: Date, to: Date) {
  const { data } = await supabase().from("water_logs").select("ml").gte("at", from.toISOString()).lt("at", to.toISOString());
  return (data ?? []).reduce((a, r) => a + r.ml, 0);
}

/** Last night's sleep is recorded against the morning's date. */
export async function saveSleep(date: string, hours: number) {
  const { error } = await supabase().from("sleep_logs").upsert({ date, hours });
  if (error) throw error;
}

export async function loadSleep(date: string): Promise<number | null> {
  const { data } = await supabase().from("sleep_logs").select("hours").eq("date", date).maybeSingle();
  return data ? Number(data.hours) : null;
}

/** Records today's weight and makes it the profile's current weight. */
export async function saveWeight(date: string, kg: number) {
  const { error } = await supabase().from("weights").upsert({ date, kg });
  if (error) throw error;
  return saveProfile({ weight_kg: kg });
}
