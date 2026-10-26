"use client";

import { supabase } from "@/lib/supabase/client";

export type Med = { id: string; name: string; dose: string | null; kind: "medicine" | "supplement"; times: string[] };
export type Dose = { med: Med; time: string; taken: boolean };

export async function loadMeds(): Promise<Med[]> {
  const { data } = await supabase().from("meds").select("id, name, dose, kind, times").order("created_at");
  return (data ?? []) as Med[];
}

/** Every scheduled dose today, in time order, with whether it's been taken. */
export async function loadDoses(date: string): Promise<Dose[]> {
  const [meds, logs] = await Promise.all([
    loadMeds(),
    supabase().from("med_logs").select("med_id, time").eq("date", date),
  ]);
  const taken = new Set((logs.data ?? []).map((l) => `${l.med_id}@${l.time}`));
  return meds
    .flatMap((med) => med.times.map((time) => ({ med, time, taken: taken.has(`${med.id}@${time}`) })))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export async function addMed(m: Omit<Med, "id">) {
  const { error } = await supabase().from("meds").insert({ ...m, times: [...new Set(m.times)].sort() });
  if (error) throw error;
}

export async function deleteMed(id: string) {
  await supabase().from("meds").delete().eq("id", id);
}

export async function setTaken(medId: string, date: string, time: string, taken: boolean) {
  const sb = supabase();
  if (taken) {
    const { error } = await sb.from("med_logs").upsert({ med_id: medId, date, time }, { onConflict: "med_id,date,time" });
    if (error) throw error;
  } else {
    await sb.from("med_logs").delete().match({ med_id: medId, date, time });
  }
}
