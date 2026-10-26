import { describe, expect, it } from "vitest";
import { aggregate, templateSummary, type SnapshotRow } from "@/lib/reports/aggregate";

const row = (date: string, strong: boolean, kcal = 1500): SnapshotRow => ({
  date, strength: strong ? 90 : 20, muscle: strong ? 80 : 30, digestion: 70, hydration: 60, energy: 100, rest: null,
  strong_day: strong, kcal_in: kcal, kcal_out: 200, protein_g: 55, fiber_g: 25, water_ml: 2000, active_minutes: 30, sleep_hours: 7,
});

describe("report aggregates", () => {
  const rows = [row("2026-10-20", true), row("2026-10-21", false, 2000), row("2026-10-22", true), { ...row("2026-10-23", false), kcal_in: 0, active_minutes: 0 }];
  const x = aggregate(rows, [{ date: "2026-10-20", kg: 80 }, { date: "2026-10-26", kg: 79.2 }], 7, "2026-10-20", "2026-10-26");

  it("counts logged and strong days and adherence over the whole period", () => {
    expect(x.daysLogged).toBe(3);
    expect(x.strongDays).toBe(2);
    expect(x.adherencePct).toBe(29); // 2 of 7
  });
  it("averages only logged days", () => {
    expect(x.avg.kcalIn).toBe(1667);
    expect(x.avg.net).toBe(1467);
    expect(x.stats.strength).toBe(67);
    expect(x.stats.rest).toBeNull();
  });
  it("reports the weight change", () => {
    expect(x.weight).toEqual({ start: 80, end: 79.2, change: -0.8 });
  });
  it("writes a factual template summary", () => {
    expect(templateSummary(x, "Asha")).toContain("Asha logged 3 of 7 days");
    expect(templateSummary(x, "Asha")).toContain("80 to 79.2 kg (-0.8 kg)");
  });
});
