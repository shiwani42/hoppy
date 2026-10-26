import { z } from "zod";
import { spendAiCall } from "@/lib/ai/budget";
import { geminiReport } from "@/lib/ai/gemini";
import { aggregate, templateSummary, type SnapshotRow, type WeightRow } from "@/lib/reports/aggregate";
import { HttpError, route, userFromRequest } from "@/lib/supabase/server";

const Body = z.object({
  periodDays: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Key-order-independent JSON (Postgres jsonb reorders object keys). */
const stable = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(stable).join(",")}]`
    : v && typeof v === "object"
      ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}`
      : JSON.stringify(v);

const addDays = (d: string, n: number) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

/**
 * POST /api/report/summary — numbers computed here from the user's own rows,
 * then a short summary (Gemini when configured, a factual template otherwise),
 * cached per period and end date so asking again costs nothing.
 */
export const POST = route(async (req) => {
  const { sb } = await userFromRequest(req);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, "Choose 7, 30 or 90 days");
  const { periodDays, to } = parsed.data;
  const from = addDays(to, -(periodDays - 1));

  const [snaps, weights, profile, cached] = await Promise.all([
    sb.from("daily_snapshots").select("*").gte("date", from).lte("date", to),
    sb.from("weights").select("date, kg").gte("date", from).lte("date", to),
    sb.from("profiles").select("name").single(),
    sb.from("reports").select("summary, numbers, is_demo").eq("period_days", periodDays).eq("to_date", to).maybeSingle(),
  ]);
  const numbers = aggregate((snaps.data ?? []) as SnapshotRow[], (weights.data ?? []) as WeightRow[], periodDays, from, to);
  if (cached.data && stable(cached.data.numbers) === stable(numbers)) {
    return Response.json({ numbers, summary: cached.data.summary, cached: true, demo: cached.data.is_demo });
  }

  let summary: string | null = null;
  try {
    const prompt =
      `Write a short, factual health summary (4–6 bullet points starting with •) for ${profile.data?.name ?? "the user"} ` +
      `to share with their doctor, nutritionist or trainer. Indian adult using a calorie tracker. Use only these numbers, ` +
      `note trends and consistency, be encouraging, and do not diagnose or give medical advice.\n\n${JSON.stringify(numbers)}`;
    summary = await geminiReport(prompt);
    if (summary) await spendAiCall(sb, "report");
  } catch (err) {
    console.error("report summary failed", err);
  }
  const demo = !summary;
  summary ??= templateSummary(numbers, profile.data?.name ?? null);
  await sb.from("reports").upsert({ period_days: periodDays, to_date: to, numbers, summary, is_demo: demo }, { onConflict: "user_id,period_days,to_date" });
  return Response.json({ numbers, summary, cached: false, demo });
});
