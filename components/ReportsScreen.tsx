"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DayBars, WeightLine } from "@/components/charts/DayBars";
import { PageHeader } from "@/components/PageHeader";
import { loadProfile, type Profile } from "@/lib/profile";
import { aggregate, type ReportNumbers, type SnapshotRow, type WeightRow } from "@/lib/reports/aggregate";
import { STAT_KEYS } from "@/lib/rules/stats";
import { ageFromBirthYear } from "@/lib/rules/targets";
import { STAT_META } from "@/lib/stats/meta";
import { dateKey, targetsFor } from "@/lib/stats/today";
import { apiJson, ensureSession, supabase } from "@/lib/supabase/client";

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

function daysBack(to: string, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(`${to}T12:00:00`);
    d.setDate(d.getDate() - (n - 1 - i));
    return dateKey(d);
  });
}

/** prd.md > Reports — trends per stat, calories in vs out, weight, adherence, AI summary, PDF. */
export function ReportsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(30);
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [weights, setWeights] = useState<WeightRow[]>([]);
  const [summary, setSummary] = useState<{ text: string; demo: boolean; cached: boolean } | null>(null);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    (async () => {
      await ensureSession();
      const p = await loadProfile();
      if (!p?.name) return router.replace("/onboarding");
      setProfile(p);
      setTo(dateKey(new Date()));
    })().catch(console.error);
  }, [router]);

  useEffect(() => {
    if (!to) return;
    (async () => {
      const from = daysBack(to, period)[0];
      const sb = supabase();
      const [s, w] = await Promise.all([
        sb.from("daily_snapshots").select("*").gte("date", from).lte("date", to).order("date"),
        sb.from("weights").select("date, kg").gte("date", from).lte("date", to).order("date"),
      ]);
      setRows((s.data ?? []) as SnapshotRow[]);
      setWeights((w.data ?? []) as WeightRow[]);
    })().catch(console.error);
  }, [to, period]);

  const days = useMemo(() => (to ? daysBack(to, period) : []), [to, period]);
  const byDate = useMemo(() => new Map(rows.map((r) => [r.date, r])), [rows]);
  const x: ReportNumbers | null = to ? aggregate(rows, weights, period, days[0], to) : null;
  const series = (k: keyof SnapshotRow) => days.map((d) => (byDate.has(d) ? Number(byDate.get(d)![k]) : null));
  const targets = profile ? targetsFor(profile) : null;

  async function writeSummary() {
    if (!to) return;
    setWriting(true);
    try {
      const r = await apiJson<{ summary: string; demo: boolean; cached: boolean }>("/api/report/summary", { periodDays: period, to });
      setSummary({ text: r.summary, demo: r.demo, cached: r.cached });
    } finally {
      setWriting(false);
    }
  }

  if (!profile || !x || !to) return <main className="flex flex-1 items-center justify-center font-display text-xl text-ink-soft">Reports…</main>;
  const age = ageFromBirthYear(profile.birth_year);

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 pt-6 pb-10 print:px-0 print:pt-0">
      <div className="print:hidden"><PageHeader title="Reports" /></div>

      <header className="hidden print:block" data-testid="print-header">
        <p className="font-display text-2xl font-bold">Hoppy health report — {profile.name}</p>
        <p className="text-sm">
          {[age && `${age} y`, profile.sex, profile.height_cm && `${profile.height_cm} cm`, profile.diet_type].filter(Boolean).join(" · ")}
          {" · "}Period {x.from} to {x.to} ({period} days) · Generated {new Date().toLocaleDateString("en-IN")}
        </p>
      </header>

      <div className="print:hidden flex gap-2" role="group" aria-label="Period">
        {PERIODS.map((p) => (
          <button key={p} aria-pressed={period === p} onClick={() => { setPeriod(p); setSummary(null); }}
            className={`h-11 flex-1 rounded-full font-display font-semibold ${period === p ? "bg-teal text-white" : "bg-card"}`}>
            {p} days
          </button>
        ))}
      </div>

      <section className="grid grid-cols-3 gap-2 text-center" aria-label="At a glance" data-testid="glance">
        <div className="rounded-2xl bg-card py-3 shadow-sm"><p className="text-xs text-ink-soft">Days logged</p><p className="font-display text-3xl font-bold">{x.daysLogged}</p><p className="text-xs text-ink-soft">of {period}</p></div>
        <div className="rounded-2xl bg-card py-3 shadow-sm"><p className="text-xs text-ink-soft">Strong days</p><p className="font-display text-3xl font-bold text-teal">{x.strongDays}</p><p className="text-xs text-ink-soft">{x.adherencePct}% adherence</p></div>
        <div className="rounded-2xl bg-card py-3 shadow-sm"><p className="text-xs text-ink-soft">Weight</p><p className="font-display text-3xl font-bold">{x.weight ? `${x.weight.change > 0 ? "+" : ""}${x.weight.change}` : "—"}</p><p className="text-xs text-ink-soft">kg</p></div>
      </section>

      <section className="rounded-3xl bg-card p-4 shadow-sm print:shadow-none print:ring-1 print:ring-line" aria-label="Calories in vs out">
        <h2 className="font-display text-lg font-bold">Calories in vs out</h2>
        <p className="text-sm text-ink-soft">Avg {x.avg.kcalIn} in · {x.avg.kcalOut} out · net {x.avg.net}{targets?.calories ? ` (target ${targets.calories})` : ""}</p>
        <DayBars values={series("kcal_in")} target={targets?.calories} color="var(--color-energy)" label="Calories in" unit="kcal" />
        <DayBars values={series("kcal_out")} color="var(--color-strength)" label="Calories out" unit="kcal" />
      </section>

      <section className="rounded-3xl bg-card p-4 shadow-sm print:shadow-none print:ring-1 print:ring-line" aria-label="Weight trend">
        <h2 className="font-display text-lg font-bold">Weight</h2>
        <WeightLine points={weights} />
      </section>

      <section className="grid grid-cols-2 gap-3" aria-label="Stats">
        {STAT_KEYS.map((k) => (
          <div key={k} className="rounded-3xl bg-card p-3 shadow-sm" data-stat={k}>
            <p className="font-display font-semibold">{STAT_META[k].emoji} {STAT_META[k].label}</p>
            <p className="text-xs text-ink-soft">avg {x.stats[k] ?? "—"}/100</p>
            <DayBars values={series(k)} target={70} color={STAT_META[k].color} label={STAT_META[k].label} unit="/100" />
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-card p-4 shadow-sm print:shadow-none print:ring-1 print:ring-line" aria-label="Averages">
        <h2 className="font-display text-lg font-bold">Daily averages</h2>
        <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-ink-soft">Protein</dt><dd>{x.avg.proteinG} g{targets?.proteinG ? ` / ${targets.proteinG} g` : ""}</dd>
          <dt className="text-ink-soft">Fibre</dt><dd>{x.avg.fiberG} g / {targets?.fiberG} g</dd>
          <dt className="text-ink-soft">Water</dt><dd>{x.avg.waterL} L</dd>
          <dt className="text-ink-soft">Active</dt><dd>{x.avg.activeMin} min</dd>
          <dt className="text-ink-soft">Sleep</dt><dd>{x.avg.sleepH ?? "—"} h</dd>
        </dl>
      </section>

      <section className="rounded-3xl bg-card p-4 shadow-sm print:shadow-none print:ring-1 print:ring-line" aria-label="Summary">
        <h2 className="font-display text-lg font-bold">Summary</h2>
        {summary ? (
          <>
            <p className="mt-2 whitespace-pre-line leading-relaxed" data-testid="summary">{summary.text}</p>
            {summary.demo && <p className="print:hidden mt-2 text-xs text-ink-soft">Written from your numbers by Hoppy&apos;s template — connect Gemini for an AI-written summary.</p>}
          </>
        ) : (
          <button onClick={writeSummary} disabled={writing} className="print:hidden mt-2 h-12 w-full rounded-full bg-teal font-display font-semibold text-white disabled:opacity-50">
            {writing ? "Writing…" : "✍️ Write my summary"}
          </button>
        )}
      </section>

      <p className="text-xs text-ink-soft">
        Hoppy is a wellness tracker, not a medical device. Calorie and nutrient values are estimates from photos, voice and the ICMR-NIN–based food table.
        Targets follow ICMR-NIN 2020/2024 and WHO 2020 guidance. Please discuss changes with your doctor.
      </p>

      <button onClick={() => window.print()} className="print:hidden h-14 rounded-full bg-ink font-display text-lg font-semibold text-cream">
        ⬇ Export PDF for my doctor
      </button>
    </main>
  );
}
