import { describe, expect, it } from "vitest";
import { stageProgress, type StageInput } from "@/lib/rules/stages";

const days = (n: number, endDay = 28) =>
  Array.from({ length: n }, (_, k) => `2026-02-${String(endDay - k).padStart(2, "0")}`);
const base: StageInput = {
  stage: 1, stageChangedAt: null, strongDays: [], today: "2026-02-28",
  startWeightKg: null, goalWeightKg: null, currentWeightKg: null,
};

describe("stage progression", () => {
  it("needs 20 strong days in the last 28", () => {
    expect(stageProgress({ ...base, strongDays: days(19) }).canStageUp).toBe(false);
    expect(stageProgress({ ...base, strongDays: days(20) })).toMatchObject({ done: 20, canStageUp: true });
  });

  it("ignores strong days older than 28 days", () => {
    const old = Array.from({ length: 20 }, (_, k) => `2026-01-${String(k + 1).padStart(2, "0")}`);
    expect(stageProgress({ ...base, strongDays: old }).done).toBe(0);
  });

  it("only counts days after the previous stage-up (stages ~4 weeks apart)", () => {
    const p = stageProgress({ ...base, stage: 2, stageChangedAt: "2026-02-27", strongDays: days(28) });
    expect(p.done).toBe(1);
    expect(p.canStageUp).toBe(false);
  });

  it("requires real weight progress when a weight-loss goal is set", () => {
    const w = { startWeightKg: 80, goalWeightKg: 68 }; // 12 kg gap → 3 kg per stage
    expect(stageProgress({ ...base, ...w, currentWeightKg: 78, strongDays: days(22) })).toMatchObject({ weightOk: false, kgToGo: 1, canStageUp: false });
    expect(stageProgress({ ...base, ...w, currentWeightKg: 77, strongDays: days(22) }).canStageUp).toBe(true);
    expect(stageProgress({ ...base, ...w, stage: 2, currentWeightKg: 74, strongDays: days(22) }).canStageUp).toBe(true); // 6 of 6 kg
    expect(stageProgress({ ...base, ...w, stage: 3, currentWeightKg: 74, strongDays: days(22) }).canStageUp).toBe(false); // needs 9 kg
  });

  it("uses consistency alone when no goal or weight is logged", () => {
    expect(stageProgress({ ...base, startWeightKg: 80, goalWeightKg: 68, strongDays: days(20) }).canStageUp).toBe(true);
  });

  it("never goes past Thriving", () => {
    expect(stageProgress({ ...base, stage: 5, strongDays: days(28) }).canStageUp).toBe(false);
  });

  it("a bad week only pauses — nothing here can lower a stage", () => {
    const p = stageProgress({ ...base, stage: 3, stageChangedAt: "2026-02-01", strongDays: [] });
    expect(p.canStageUp).toBe(false);
    expect(p.done).toBe(0);
  });
});
