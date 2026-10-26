import { describe, expect, it } from "vitest";
import { answerLocally, detectIntent, fitsDiet, suggestFoods } from "@/lib/chat/answer";
import type { DaySummary } from "@/lib/chat/summary";
import { FOODS } from "@/lib/meals/foods";

const day: DaySummary = {
  name: "Asha",
  diet: "veg",
  targets: { kcal: 1500, protein_g: 60, fiber_g: 30, water_ml: 2000, active_min: 30 },
  today: {
    kcal_in: 900, kcal_out: 150, protein_g: 31.4, fiber_g: 12, carbs_g: 120, fat_g: 30, sodium_mg: 1500,
    water_ml: 750, active_min: 20, sleep_h: null, meals: ["lunch: 2 roti, dal"], workouts: ["Brisk walking 30 min"],
  },
};

describe("chat intents", () => {
  it.each([
    ["how much protein today?", "protein"],
    ["kitna paani piya?", "water"],
    ["can I have a samosa?", "can_i_have"],
    ["what should I eat for dinner?", "suggest"],
    ["is this ok for my diabetes", "medical"],
    ["how many calories left", "calories"],
  ])("%s → %s", (q, intent) => expect(detectIntent(q)).toBe(intent));
});

describe("local answers", () => {
  it("answers protein with the real sum and a stat card", () => {
    const a = answerLocally("how much protein today?", day);
    expect(a.stat).toEqual({ label: "Protein", value: 31, unit: "g", target: 60 });
    expect(a.text).toContain("31 g of your 60 g");
    expect(a.suggestsFood).toBe(true);
  });

  it("checks a treat against what's left", () => {
    const a = answerLocally("can I have a samosa?", day);
    expect(a.stat?.value).toBe(217);
    expect(a.text).toMatch(/Yes!.*~750 left/);
  });

  it("never suggests meat or egg to a vegetarian", () => {
    const veg = suggestFoods("veg", "protein_g", 10);
    expect(veg.every((f) => !/chicken|fish|mutton|egg|omelette/i.test(f.name))).toBe(true);
  });

  it("prefers light, protein-dense dishes for weight loss", () => {
    const top = suggestFoods("veg", "protein_g", 3).map((f) => f.id);
    expect(top).not.toContain("chole-bhature");
    expect(top).not.toContain("paneer-butter-masala");
    expect(top).toContain("sprouts");
  });

  it("suggests only vegetarian food before the diet is known", () => {
    const unknown = suggestFoods(null, "protein_g", 10);
    expect(unknown.every((f) => !/chicken|fish|mutton|egg|omelette/i.test(f.name))).toBe(true);
  });

  it("keeps Jain suggestions free of root vegetables", () => {
    const aloo = FOODS.find((f) => f.id === "aloo-gobi")!;
    expect(fitsDiet(aloo, "jain")).toBe(false);
  });

  it("defers medical questions to a doctor", () => {
    expect(answerLocally("my blood pressure is high, what do I do", day).text).toMatch(/doctor/);
  });
});
