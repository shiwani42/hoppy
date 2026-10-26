import { describe, expect, it } from "vitest";
import { parseLog } from "@/lib/parse/text";
import { activeMinutes, kcalBurned } from "@/lib/rules/activity";

describe("activity maths", () => {
  it("burns MET × kg × hours", () => {
    expect(kcalBurned(4.3, 30, 70)).toBe(151); // 4.3 × 70 × 0.5
    expect(kcalBurned(2.5, 60)).toBe(163); // default 65 kg
  });
  it("counts moderate-equivalent minutes (vigorous ≈ double, light ≈ partial)", () => {
    expect(activeMinutes(4, 30)).toBe(30);
    expect(activeMinutes(8, 15)).toBe(30);
    expect(activeMinutes(2.5, 30)).toBe(18.8);
  });
});

describe("parseLog", () => {
  it("parses a Hinglish meal with number words", () => {
    const p = parseLog("2 roti, dal, thodi bhindi");
    expect(p.kind).toBe("meal");
    if (p.kind !== "meal") return;
    expect(p.items.map((i) => [i.name, i.quantity])).toEqual([
      ["Roti / chapati", 2],
      ["Dal tadka", 1],
      ["Bhindi sabzi", 0.5],
    ]);
  });

  it("handles 'do' as two and 'aur' as and", () => {
    const p = parseLog("maine do idli aur sambar khaya");
    expect(p.kind).toBe("meal");
    if (p.kind === "meal") expect(p.items.map((i) => [i.name, i.quantity])).toEqual([["Idli", 2], ["Sambar", 1]]);
  });

  it("keeps unknown parts for the AI fallback", () => {
    const p = parseLog("poha and some mystery thing");
    expect(p.kind).toBe("meal");
    if (p.kind === "meal") expect(p.unknown).toEqual(["some mystery thing"]);
  });

  it("parses exercise with minutes", () => {
    const p = parseLog("30 min brisk walk");
    expect(p).toMatchObject({ kind: "activity", activity: { key: "walk-brisk", minutes: 30 } });
  });

  it("converts surya namaskar rounds to minutes", () => {
    expect(parseLog("12 rounds surya namaskar")).toMatchObject({ kind: "activity", activity: { key: "surya-namaskar", minutes: 14 } });
  });

  it("understands hours and Hindi duration words", () => {
    expect(parseLog("yoga 1 hour")).toMatchObject({ activity: { key: "hatha-yoga", minutes: 60 } });
    expect(parseLog("aadha ghanta cycling")).toMatchObject({ activity: { key: "cycling-easy", minutes: 30 } });
  });

  it("asks for duration when missing", () => {
    expect(parseLog("played badminton")).toMatchObject({ kind: "activity", activity: { key: "badminton", minutes: null } });
  });

  it("returns unknown for questions", () => {
    expect(parseLog("how much protein did I have today?").kind).toBe("unknown");
  });
});

import { isQuestion } from "@/lib/parse/text";
describe("isQuestion", () => {
  it.each([
    ["how much protein today", true],
    ["kitna paani piya", true],
    ["can I have a samosa", true],
    ["2 roti dal", false],
    ["30 min walk", false],
  ])("%s → %s", (q, v) => expect(isQuestion(q)).toBe(v));
});
