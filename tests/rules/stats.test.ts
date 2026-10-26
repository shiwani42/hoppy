import { describe, expect, it } from "vitest";
import { computeStats, EMPTY_DAY, energyValue, isStrongDay, restValue } from "@/lib/rules/stats";
import { computeTargets } from "@/lib/rules/targets";

const targets = computeTargets({ sex: "female", age: 45, heightCm: 160, weightKg: 75, dietType: "non-veg" });

describe("stats", () => {
  it("starts the day empty, with rest locked until sleep is logged", () => {
    const s = computeStats(EMPTY_DAY, targets);
    expect(s.strength.value).toBe(0);
    expect(s.muscle.value).toBe(0);
    expect(s.rest.value).toBeNull();
  });

  it("raises Muscle with protein and Strength with active minutes", () => {
    const s = computeStats({ ...EMPTY_DAY, proteinG: 31, activeMinutes: 15 }, targets);
    expect(s.muscle.target).toBe(62);
    expect(s.muscle.value).toBe(50);
    expect(s.strength.value).toBe(50);
  });

  it("caps stats at 100", () => {
    expect(computeStats({ ...EMPTY_DAY, waterMl: 5000 }, targets).hydration.value).toBe(100);
  });

  it("locks stats whose data is missing", () => {
    const s = computeStats(EMPTY_DAY, computeTargets({}));
    expect(s.muscle.value).toBeNull();
    expect(s.energy.value).toBeNull();
  });

  it("fills Energy toward the target, full in the band, dims gently over", () => {
    expect(energyValue(0, 1500)).toBe(0);
    expect(energyValue(675, 1500)).toBe(50);
    expect(energyValue(1400, 1500)).toBe(100);
    expect(energyValue(1650, 1500)).toBe(100);
    expect(energyValue(1850, 1500)).toBe(80);
    expect(energyValue(5000, 1500)).toBe(40);
  });

  it("counts calories out against calories in", () => {
    const s = computeStats({ ...EMPTY_DAY, kcalIn: 1700, kcalOut: 300 }, targets);
    expect(s.energy.current).toBe(1400);
  });

  it("scores rest in the 7–9 h window", () => {
    expect(restValue(8)).toBe(100);
    expect(restValue(3.5)).toBe(50);
    expect(restValue(11)).toBe(80);
  });

  it("calls a day strong when 4 of 6 stats reach 70", () => {
    const good = computeStats(
      { kcalIn: 1300, kcalOut: 0, proteinG: 60, fiberG: 25, waterMl: 1800, activeMinutes: 10, sleepHours: null },
      targets,
    );
    expect(isStrongDay(good)).toBe(true);
    const meh = computeStats({ ...EMPTY_DAY, proteinG: 60, waterMl: 1800 }, targets);
    expect(isStrongDay(meh)).toBe(false);
  });
});
