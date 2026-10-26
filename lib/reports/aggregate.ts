/**
 * Report numbers from daily snapshots (prd.md > Reports). Pure, so the server
 * computes them itself and the same code drives the charts.
 */

export type SnapshotRow = {
  date: string;
  strength: number | null; muscle: number | null; digestion: number | null;
  hydration: number | null; energy: number | null; rest: number | null;
  strong_day: boolean;
  kcal_in: number; kcal_out: number; protein_g: number; fiber_g: number;
  water_ml: number; active_minutes: number; sleep_hours: number | null;
};
export type WeightRow = { date: string; kg: number };

export type ReportNumbers = {
  periodDays: number;
  from: string;
  to: string;
  daysLogged: number;
  strongDays: number;
  adherencePct: number;
  avg: { kcalIn: number; kcalOut: number; net: number; proteinG: number; fiberG: number; waterL: number; activeMin: number; sleepH: number | null };
  stats: Record<"strength" | "muscle" | "digestion" | "hydration" | "energy" | "rest", number | null>;
  weight: { start: number; end: number; change: number } | null;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function aggregate(rows: SnapshotRow[], weights: WeightRow[], periodDays: number, from: string, to: string): ReportNumbers {
  // A day counts as logged when something was eaten or done.
  const logged = rows.filter((x) => Number(x.kcal_in) > 0 || Number(x.active_minutes) > 0);
  const n = (k: keyof SnapshotRow) => logged.map((x) => Number(x[k]) || 0);
  const sleeps = logged.map((x) => x.sleep_hours).filter((v): v is number => v != null).map(Number);
  const statAvg = (k: keyof ReportNumbers["stats"]) => {
    const v = logged.map((x) => x[k]).filter((s): s is number => s != null);
    return v.length ? Math.round(mean(v)) : null;
  };
  const ws = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  return {
    periodDays,
    from,
    to,
    daysLogged: logged.length,
    strongDays: logged.filter((x) => x.strong_day).length,
    adherencePct: Math.round((logged.filter((x) => x.strong_day).length / periodDays) * 100),
    avg: {
      kcalIn: Math.round(mean(n("kcal_in"))),
      kcalOut: Math.round(mean(n("kcal_out"))),
      net: Math.round(mean(logged.map((x) => Number(x.kcal_in) - Number(x.kcal_out)))),
      proteinG: r1(mean(n("protein_g"))),
      fiberG: r1(mean(n("fiber_g"))),
      waterL: r1(mean(n("water_ml")) / 1000),
      activeMin: Math.round(mean(n("active_minutes"))),
      sleepH: sleeps.length ? r1(mean(sleeps)) : null,
    },
    stats: {
      strength: statAvg("strength"), muscle: statAvg("muscle"), digestion: statAvg("digestion"),
      hydration: statAvg("hydration"), energy: statAvg("energy"), rest: statAvg("rest"),
    },
    weight: ws.length >= 2 ? { start: Number(ws[0].kg), end: Number(ws.at(-1)!.kg), change: r1(Number(ws.at(-1)!.kg) - Number(ws[0].kg)) } : null,
  };
}

/** Plain-language summary used without a model (and as the model's fallback). */
export function templateSummary(x: ReportNumbers, name: string | null): string {
  const lines = [
    `${name ?? "You"} logged ${x.daysLogged} of ${x.periodDays} days; ${x.strongDays} were strong days (${x.adherencePct}% adherence).`,
    `Average intake ${x.avg.kcalIn} kcal and ${x.avg.kcalOut} kcal burned through activity (net ${x.avg.net} kcal/day).`,
    `Protein averaged ${x.avg.proteinG} g/day and fibre ${x.avg.fiberG} g/day; water ${x.avg.waterL} L/day.`,
    `Active ${x.avg.activeMin} moderate-equivalent minutes a day${x.avg.sleepH != null ? `; sleep ${x.avg.sleepH} h/night` : ""}.`,
  ];
  if (x.weight) lines.push(`Weight went from ${x.weight.start} to ${x.weight.end} kg (${x.weight.change > 0 ? "+" : ""}${x.weight.change} kg).`);
  return lines.map((l) => `• ${l}`).join("\n");
}
