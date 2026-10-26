import { describe, expect, it } from "vitest";
import { dueMilestone } from "@/lib/rules/milestones";
import { streak } from "@/lib/rules/streak";

describe("streak", () => {
  it("counts consecutive logged days ending today", () => {
    expect(streak(["2026-10-24", "2026-10-25", "2026-10-26"], "2026-10-26")).toBe(3);
  });
  it("doesn't break before today is logged", () => {
    expect(streak(["2026-10-24", "2026-10-25"], "2026-10-26")).toBe(2);
  });
  it("resets after a missed day", () => {
    expect(streak(["2026-10-22", "2026-10-23", "2026-10-25", "2026-10-26"], "2026-10-26")).toBe(2);
    expect(streak(["2026-10-23"], "2026-10-26")).toBe(0);
  });
  it("crosses month boundaries", () => {
    expect(streak(["2026-09-30", "2026-10-01"], "2026-10-01")).toBe(2);
  });
});

describe("milestones", () => {
  it("offers a stage-up once", () => {
    expect(dueMilestone({ stage: 2, kgLost: null, streak: 0 }, {})).toEqual({ type: "stage", value: 2 });
    expect(dueMilestone({ stage: 2, kgLost: null, streak: 0 }, { stage: 2 })).toBeNull();
  });
  it("offers every 2 kg", () => {
    expect(dueMilestone({ stage: 1, kgLost: 1.8, streak: 0 }, {})).toBeNull();
    expect(dueMilestone({ stage: 1, kgLost: 2.1, streak: 0 }, {})).toEqual({ type: "weight", value: 2 });
    expect(dueMilestone({ stage: 1, kgLost: 4.3, streak: 0 }, { weight: 2 })).toEqual({ type: "weight", value: 4 });
  });
  it("offers 7/30/100-day streaks", () => {
    expect(dueMilestone({ stage: 1, kgLost: null, streak: 6 }, {})).toBeNull();
    expect(dueMilestone({ stage: 1, kgLost: null, streak: 7 }, {})).toEqual({ type: "streak", value: 7 });
    expect(dueMilestone({ stage: 1, kgLost: null, streak: 12 }, { streak: 7 })).toBeNull();
    expect(dueMilestone({ stage: 1, kgLost: null, streak: 30 }, { streak: 7 })).toEqual({ type: "streak", value: 30 });
  });
});
