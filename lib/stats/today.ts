"use client";

import { sumNutrients } from "@/lib/meals/foods";
import { loadActivities, loadSleep, loadWaterMl, type SavedActivity } from "@/lib/logs/client";
import { loadMeals, startOfDay, type SavedMeal } from "@/lib/meals/client";
import type { Profile } from "@/lib/profile";
import { computeStats, EMPTY_DAY, isStrongDay, type DayTotals, type Stat, type StatKey } from "@/lib/rules/stats";
import { ageFromBirthYear, computeTargets, type Targets } from "@/lib/rules/targets";
import { supabase } from "@/lib/supabase/client";

export type Today = {
  date: string;
  meals: SavedMeal[];
  activities: SavedActivity[];
  totals: DayTotals;
  targets: Targets;
  stats: Record<StatKey, Stat>;
  strong: boolean;
};

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function targetsFor(p: Profile) {
  return computeTargets({
    sex: p.sex,
    age: ageFromBirthYear(p.birth_year),
    heightCm: p.height_cm,
    weightKg: p.weight_kg,
    dietType: p.diet_type,
  });
}

export async function loadToday(profile: Profile, day = new Date()): Promise<Today> {
  const from = startOfDay(day);
  const to = new Date(from.getTime() + 864e5);
  const date = dateKey(from);
  const [meals, activities, waterMl, sleepHours] = await Promise.all([
    loadMeals(from, to),
    loadActivities(from, to),
    loadWaterMl(from, to),
    loadSleep(date),
  ]);
  const n = sumNutrients(meals.flatMap((m) => m.meal_items));
  const totals: DayTotals = {
    ...EMPTY_DAY,
    kcalIn: n.kcal,
    proteinG: n.protein_g,
    fiberG: n.fiber_g,
    kcalOut: activities.reduce((a, x) => a + Number(x.kcal), 0),
    activeMinutes: activities.reduce((a, x) => a + Number(x.active_minutes), 0),
    waterMl,
    sleepHours,
  };
  const targets = targetsFor(profile);
  const stats = computeStats(totals, targets);
  return { date, meals, activities, totals, targets, stats, strong: isStrongDay(stats) };
}

/** Upserts today's row in daily_snapshots after every log. */
export async function saveSnapshot(t: Today, weightKg?: number | null) {
  const s = t.stats;
  const { error } = await supabase().from("daily_snapshots").upsert({
    date: t.date,
    strength: s.strength.value,
    muscle: s.muscle.value,
    digestion: s.digestion.value,
    hydration: s.hydration.value,
    energy: s.energy.value,
    rest: s.rest.value,
    strong_day: t.strong,
    kcal_in: Math.round(t.totals.kcalIn),
    kcal_out: Math.round(t.totals.kcalOut),
    protein_g: Math.round(t.totals.proteinG * 10) / 10,
    fiber_g: Math.round(t.totals.fiberG * 10) / 10,
    water_ml: t.totals.waterMl,
    active_minutes: t.totals.activeMinutes,
    sleep_hours: t.totals.sleepHours,
    weight_kg: weightKg ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("snapshot", error);
}
