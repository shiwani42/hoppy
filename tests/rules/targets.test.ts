import { describe, expect, it } from "vitest";
import { bmr, computeTargets } from "@/lib/rules/targets";

describe("targets", () => {
  it("uses Mifflin–St Jeor for BMR", () => {
    // 10*80 + 6.25*170 - 5*45 + 5 = 1642.5
    expect(bmr({ sex: "male", age: 45, heightCm: 170, weightKg: 80 })).toBeCloseTo(1642.5);
    // 10*70 + 6.25*158 - 5*50 - 161 = 1276.5
    expect(bmr({ sex: "female", age: 50, heightCm: 158, weightKg: 70 })).toBeCloseTo(1276.5);
  });

  it("sets a 500 kcal deficit with sex-specific floors", () => {
    const man = computeTargets({ sex: "male", age: 45, heightCm: 170, weightKg: 80 });
    expect(man.maintenance).toBe(1971);
    expect(man.calories).toBe(1500); // 1471 is under the 1500 floor
    const woman = computeTargets({ sex: "female", age: 30, heightCm: 165, weightKg: 85 });
    expect(woman.calories).toBe(Math.round((10 * 85 + 6.25 * 165 - 150 - 161) * 1.2) - 500);
  });

  it("keeps calories locked until the body info is complete", () => {
    const t = computeTargets({ weightKg: 70 });
    expect(t.calories).toBeNull();
    expect(t.proteinG).toBe(58); // 0.83 g/kg
    expect(t.fiberG).toBe(40); // reference 2000 kcal
  });

  it("uses 1 g/kg protein for cereal-based diets", () => {
    expect(computeTargets({ weightKg: 70, dietType: "veg" }).proteinG).toBe(70);
    expect(computeTargets({ weightKg: 70, dietType: "non-veg" }).proteinG).toBe(58);
  });

  it("scales fibre to the calorie target (40 g per 2000 kcal)", () => {
    const t = computeTargets({ sex: "female", age: 50, heightCm: 158, weightKg: 70 });
    expect(t.calories).toBe(1200);
    expect(t.fiberG).toBe(24);
  });

  it("sets water by sex", () => {
    expect(computeTargets({ sex: "female" }).waterMl).toBe(2000);
    expect(computeTargets({ sex: "male" }).waterMl).toBe(2500);
    expect(computeTargets({}).waterMl).toBe(2250);
  });
});
