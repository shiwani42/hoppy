import { describe, expect, it } from "vitest";
import { nudgeFor } from "@/lib/rules/nudges";
import { computeStats, EMPTY_DAY } from "@/lib/rules/stats";
import { computeTargets } from "@/lib/rules/targets";

const t = computeTargets({ sex: "female", age: 45, heightCm: 160, weightKg: 70 });
const empty = computeStats(EMPTY_DAY, t);
const at = (h: number, m = 0) => new Date(2026, 9, 26, h, m);

describe("nudges", () => {
  it("stays quiet in the morning", () => {
    expect(nudgeFor(empty, at(9), [])).toBeNull();
  });
  it("asks for water first, then protein once it's afternoon", () => {
    expect(nudgeFor(empty, at(11, 30), [])).toBe("hydration");
    expect(nudgeFor(empty, at(14), [])).toBe("hydration"); // both 0 → the earlier rule wins ties
    expect(nudgeFor(empty, at(14), [{ at: at(11, 30), key: "hydration" }])).toBe("muscle");
  });
  it("waits two hours between nudges", () => {
    expect(nudgeFor(empty, at(13, 0), [{ at: at(11, 30), key: "hydration" }])).toBeNull();
  });
  it("never more than three a day", () => {
    const past = [{ at: at(11), key: "hydration" }, { at: at(13), key: "muscle" }, { at: at(17), key: "strength" }];
    expect(nudgeFor(empty, at(20), past)).toBeNull();
  });
  it("skips stats that are fine or locked", () => {
    const good = computeStats({ ...EMPTY_DAY, waterMl: 1500, proteinG: 50, activeMinutes: 30, fiberG: 25 }, t);
    expect(nudgeFor(good, at(20), [])).toBeNull();
    const locked = computeStats(EMPTY_DAY, computeTargets({}));
    expect(nudgeFor(locked, at(14), [{ at: at(11), key: "hydration" }])).toBeNull();
  });
});
