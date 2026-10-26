import { describe, expect, it } from "vitest";
import { nextQuestion, type DripProfile } from "@/lib/onboarding/nextQuestion";

const fresh: DripProfile = {
  height_cm: null, weight_kg: null, birth_year: null, sex: null, goal_weight_kg: null, diet_type: null,
  created_at: "2026-10-26T06:00:00Z",
};

describe("drip onboarding", () => {
  it("asks nothing on first open", () => {
    expect(nextQuestion(fresh, "app_open")).toBeNull();
  });

  it("asks height and weight right after the first meal", () => {
    expect(nextQuestion(fresh, "meal_logged")?.id).toBe("body");
  });

  it("then asks age and sex, one question per moment", () => {
    const p = { ...fresh, height_cm: 160, weight_kg: 72 };
    expect(nextQuestion(p, "meal_logged")?.id).toBe("age_sex");
    expect(nextQuestion(p, "app_open")?.id).toBe("age_sex");
  });

  it("stops once the body info is complete", () => {
    const p = { ...fresh, height_cm: 160, weight_kg: 72, birth_year: 1978, sex: "female" as const };
    expect(nextQuestion(p, "meal_logged")).toBeNull();
  });

  it("asks goal weight only when stages are first shown", () => {
    expect(nextQuestion(fresh, "stages_shown")?.id).toBe("goal");
    expect(nextQuestion({ ...fresh, goal_weight_kg: 65 }, "stages_shown")).toBeNull();
  });

  it("asks diet type the first time food is suggested", () => {
    expect(nextQuestion(fresh, "food_suggested")?.id).toBe("diet");
    expect(nextQuestion({ ...fresh, diet_type: "veg" }, "food_suggested")).toBeNull();
  });

  it("asks about sleep from the second morning, once", () => {
    const sameDay = new Date("2026-10-26T08:00:00");
    const nextMorning = new Date("2026-10-27T08:00:00");
    const nextEvening = new Date("2026-10-27T20:00:00");
    const p = { ...fresh, created_at: "2026-10-26T07:00:00" };
    expect(nextQuestion(p, "morning", { now: sameDay })).toBeNull();
    expect(nextQuestion(p, "morning", { now: nextMorning })?.id).toBe("sleep");
    expect(nextQuestion(p, "morning", { now: nextMorning, sleepLoggedToday: true })).toBeNull();
    expect(nextQuestion(p, "morning", { now: nextEvening })).toBeNull();
  });
});
