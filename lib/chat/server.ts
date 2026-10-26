import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ageFromBirthYear, computeTargets } from "@/lib/rules/targets";
import type { DaySummary } from "./summary";

const n = (v: unknown) => Number(v) || 0;

/** Builds the compact day summary from the user's own rows (RLS applies). */
export async function loadDaySummary(sb: SupabaseClient, from: Date, date: string): Promise<DaySummary> {
  const to = new Date(from.getTime() + 864e5).toISOString();
  const since = from.toISOString();
  const [profile, meals, acts, water, sleep] = await Promise.all([
    sb.from("profiles").select("*").single(),
    sb.from("meals").select("meal_type, meal_items(name, quantity, unit, kcal, protein_g, fiber_g, carbs_g, fat_g, sodium_mg)").gte("eaten_at", since).lt("eaten_at", to),
    sb.from("activities").select("label, minutes, kcal, active_minutes").gte("done_at", since).lt("done_at", to),
    sb.from("water_logs").select("ml").gte("at", since).lt("at", to),
    sb.from("sleep_logs").select("hours").eq("date", date).maybeSingle(),
  ]);
  const p = profile.data ?? {};
  const t = computeTargets({ sex: p.sex, age: ageFromBirthYear(p.birth_year), heightCm: p.height_cm, weightKg: p.weight_kg, dietType: p.diet_type });
  const items = (meals.data ?? []).flatMap((m) => m.meal_items as Record<string, unknown>[]);
  const sum = (k: string) => Math.round(items.reduce((a, i) => a + n(i[k]), 0) * 10) / 10;
  return {
    name: p.name ?? null,
    diet: p.diet_type ?? null,
    targets: { kcal: t.calories, protein_g: t.proteinG, fiber_g: t.fiberG, water_ml: t.waterMl, active_min: t.activeMinutes },
    today: {
      kcal_in: sum("kcal"),
      kcal_out: (acts.data ?? []).reduce((a, x) => a + n(x.kcal), 0),
      protein_g: sum("protein_g"),
      fiber_g: sum("fiber_g"),
      carbs_g: sum("carbs_g"),
      fat_g: sum("fat_g"),
      sodium_mg: sum("sodium_mg"),
      water_ml: (water.data ?? []).reduce((a, x) => a + n(x.ml), 0),
      active_min: Math.round((acts.data ?? []).reduce((a, x) => a + n(x.active_minutes), 0)),
      sleep_h: sleep.data ? n(sleep.data.hours) : null,
      meals: (meals.data ?? []).map(
        (m) => `${m.meal_type}: ${(m.meal_items as { quantity: number; unit: string; name: string }[]).map((i) => `${n(i.quantity)} ${i.unit} ${i.name}`).join(", ")}`,
      ),
      workouts: (acts.data ?? []).map((a) => `${a.label} ${n(a.minutes)} min`),
    },
  };
}
