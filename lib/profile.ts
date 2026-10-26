"use client";

import { supabase } from "@/lib/supabase/client";

export type Profile = {
  user_id: string;
  name: string | null;
  sex: "female" | "male" | null;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal_weight_kg: number | null;
  diet_type: "veg" | "egg" | "non-veg" | "jain" | "vegan" | null;
  current_stage: number;
  selfie_path: string | null;
  skin_tone: string | null;
  asked: Record<string, string>;
  stage_changed_at: string | null;
  start_weight_kg: number | null;
  milestones: { stage?: number; weight?: number; streak?: number };
  created_at: string;
};

export async function loadProfile(): Promise<Profile | null> {
  const { data } = await supabase().from("profiles").select("*").maybeSingle();
  return (data as Profile) ?? null;
}

export async function saveProfile(fields: Partial<Omit<Profile, "user_id" | "created_at">>) {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  const { data, error } = await sb
    .from("profiles")
    .upsert({ user_id: auth.user!.id, ...fields, updated_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return data as Profile;
}
