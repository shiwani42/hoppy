"use client";

import { api, supabase } from "@/lib/supabase/client";
import { sumNutrients, type Nutrients } from "./foods";
import type { MealItem, MealType } from "./types";

export type SavedMealItem = Nutrients & { id: string; name: string; quantity: number; unit: string; grams: number; sticker: string | null; food_id: string | null };
export type SavedMeal = {
  id: string;
  eaten_at: string;
  meal_type: MealType;
  source: "photo" | "voice" | "manual";
  photo_path: string | null;
  photo_url?: string;
  reply: string | null;
  is_demo: boolean;
  meal_items: SavedMealItem[];
};

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function saveMeal(input: {
  meal_type: MealType;
  source: SavedMeal["source"];
  photo_path?: string | null;
  is_demo?: boolean;
  items: MealItem[];
}): Promise<SavedMeal> {
  const sb = supabase();
  const { data: meal, error } = await sb
    .from("meals")
    .insert({ meal_type: input.meal_type, source: input.source, photo_path: input.photo_path ?? null, is_demo: !!input.is_demo })
    .select("*")
    .single();
  if (error) throw error;
  const rows = input.items.map((it) => ({
    meal_id: meal.id,
    name: it.name,
    quantity: it.quantity,
    unit: it.unit,
    grams: it.grams,
    kcal: it.kcal,
    protein_g: it.protein_g,
    fiber_g: it.fiber_g,
    carbs_g: it.carbs_g,
    fat_g: it.fat_g,
    sodium_mg: it.sodium_mg,
    sticker: it.sticker,
    food_id: it.food_id,
  }));
  const items = await sb.from("meal_items").insert(rows).select("*");
  if (items.error) throw items.error;
  return { ...meal, meal_items: items.data };
}

export async function loadMeals(from: Date, to = new Date(from.getTime() + 864e5)): Promise<SavedMeal[]> {
  const sb = supabase();
  const { data, error } = await sb
    .from("meals")
    .select("*, meal_items(*)")
    .gte("eaten_at", from.toISOString())
    .lt("eaten_at", to.toISOString())
    .order("eaten_at", { ascending: true });
  if (error) throw error;
  const meals = (data ?? []) as SavedMeal[];
  const paths = meals.map((m) => m.photo_path).filter((p): p is string => !!p);
  if (paths.length) {
    const signed = await sb.storage.from("meals").createSignedUrls(paths, 3600);
    const byPath = new Map(signed.data?.map((s) => [s.path, s.signedUrl]));
    for (const m of meals) if (m.photo_path) m.photo_url = byPath.get(m.photo_path) ?? undefined;
  }
  return meals;
}

export async function deleteMeal(id: string) {
  const { error } = await supabase().from("meals").delete().eq("id", id);
  if (error) throw error;
}

export async function setMealReply(id: string, reply: string) {
  await supabase().from("meals").update({ reply }).eq("id", id);
}

export const mealTotals = (m: Pick<SavedMeal, "meal_items">) => sumNutrients(m.meal_items);

/** Streams the avatar's one-liner for a just-logged meal. */
export async function streamMealReply(
  items: { name: string; quantity: number; unit: string }[],
  totals: Nutrients,
  name: string | undefined,
  onText: (soFar: string) => void,
): Promise<string> {
  const res = await api("/api/chat/reply", {
    method: "POST",
    body: JSON.stringify({ items, totals, name }),
  });
  if (!res.ok || !res.body) return "";
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    onText(text);
  }
  return text.trim();
}

/** Replaces a saved meal's items and type (edit flow). */
export async function updateMeal(id: string, meal_type: MealType, items: MealItem[]) {
  const sb = supabase();
  const up = await sb.from("meals").update({ meal_type }).eq("id", id);
  if (up.error) throw up.error;
  const del = await sb.from("meal_items").delete().eq("meal_id", id);
  if (del.error) throw del.error;
  const ins = await sb.from("meal_items").insert(
    items.map((it) => ({
      meal_id: id, name: it.name, quantity: it.quantity, unit: it.unit, grams: it.grams, kcal: it.kcal,
      protein_g: it.protein_g, fiber_g: it.fiber_g, carbs_g: it.carbs_g, fat_g: it.fat_g, sodium_mg: it.sodium_mg,
      sticker: it.sticker, food_id: it.food_id,
    })),
  );
  if (ins.error) throw ins.error;
}

/** A saved row back into an editable item (per-100 g derived from its own numbers). */
export function toEditable(it: SavedMealItem): MealItem {
  const g = Number(it.grams) || 1;
  const per = (v: number) => (Number(v) / g) * 100;
  return {
    name: it.name, quantity: Number(it.quantity), unit: it.unit, grams: g,
    kcal: Number(it.kcal), protein_g: Number(it.protein_g), fiber_g: Number(it.fiber_g),
    carbs_g: Number(it.carbs_g), fat_g: Number(it.fat_g), sodium_mg: Number(it.sodium_mg),
    per100g: { kcal: per(it.kcal), protein_g: per(it.protein_g), fiber_g: per(it.fiber_g), carbs_g: per(it.carbs_g), fat_g: per(it.fat_g), sodium_mg: per(it.sodium_mg) },
    sticker: it.sticker ?? "🍽️", food_id: it.food_id ?? null, confidence: 1, alternatives: [],
  };
}
