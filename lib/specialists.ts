"use client";

import { apiJson, supabase } from "@/lib/supabase/client";
import { dateKey } from "@/lib/stats/today";

export type Specialist = {
  id: string;
  name: string;
  role: "nutritionist" | "dietitian" | "trainer" | "yoga";
  city: string;
  languages: string[];
  bio: string;
  is_sample: boolean;
  title: string | null;
  years: number | null;
  specialty: string | null;
  photo: string | null;
};
export type ConsultRequest = { id: string; specialist_id: string; note: string | null; created_at: string; report_id: string | null };

export async function loadSpecialists(): Promise<Specialist[]> {
  const { data } = await supabase().from("specialists").select("*").order("role").order("name");
  return (data ?? []) as Specialist[];
}

export async function loadRequests(): Promise<ConsultRequest[]> {
  const { data } = await supabase().from("consult_requests").select("*").order("created_at", { ascending: false });
  return (data ?? []) as ConsultRequest[];
}

/** Sends the request, with the 30-day report attached (creating its summary if needed) unless turned off. */
export async function requestConsult(specialistId: string, note: string, withReport = true) {
  let reportId: string | null = null;
  if (withReport) {
    const to = dateKey();
    await apiJson("/api/report/summary", { periodDays: 30, to });
    const { data: report } = await supabase().from("reports").select("id").eq("period_days", 30).eq("to_date", to).single();
    reportId = report?.id ?? null;
  }
  const { error } = await supabase().from("consult_requests").insert({ specialist_id: specialistId, report_id: reportId, note: note.trim() || null });
  if (error) throw error;
}
