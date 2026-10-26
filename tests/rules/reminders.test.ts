import { describe, expect, it } from "vitest";
import { duePushes, localClock } from "@/lib/reminders/due";

const base = {
  reminders: [{ meal_type: "lunch" as const, time: "13:30", enabled: true }],
  meds: [{ id: "m1", name: "Vitamin D3", dose: "60k IU", times: ["08:00", "21:00"] }],
  takenDoses: new Set<string>(),
  loggedMealTypes: new Set<string>(),
  sentKeys: new Set<string>(),
};

describe("due reminders", () => {
  it("fires inside the 10-minute window only", () => {
    expect(duePushes({ ...base, now: "13:29" })).toEqual([]);
    expect(duePushes({ ...base, now: "13:30" }).map((p) => p.key)).toEqual(["meal:lunch"]);
    expect(duePushes({ ...base, now: "13:39" }).map((p) => p.key)).toEqual(["meal:lunch"]);
    expect(duePushes({ ...base, now: "13:40" })).toEqual([]);
  });
  it("skips meals already logged and reminders already sent", () => {
    expect(duePushes({ ...base, now: "13:31", loggedMealTypes: new Set(["lunch"]) })).toEqual([]);
    expect(duePushes({ ...base, now: "13:31", sentKeys: new Set(["meal:lunch"]) })).toEqual([]);
  });
  it("reminds about untaken doses with a deep link to meds", () => {
    const [p] = duePushes({ ...base, now: "21:02" });
    expect(p).toMatchObject({ key: "med:m1@21:00", url: "/meds", body: "💊 Time for Vitamin D3 (60k IU)" });
    expect(duePushes({ ...base, now: "21:02", takenDoses: new Set(["m1@21:00"]) })).toEqual([]);
  });
  it("ignores disabled reminders", () => {
    expect(duePushes({ ...base, now: "13:31", reminders: [{ ...base.reminders[0], enabled: false }] })).toEqual([]);
  });
  it("computes the user's local clock", () => {
    expect(localClock("Asia/Kolkata", new Date("2026-10-26T08:05:00Z"))).toEqual({ date: "2026-10-26", hm: "13:35" });
    expect(localClock("Asia/Kolkata", new Date("2026-10-26T19:00:00Z"))).toEqual({ date: "2026-10-27", hm: "00:30" });
  });
});

describe("duePushes — water and snoozes", () => {
  const base = { reminders: [], meds: [], takenDoses: new Set<string>(), loggedMealTypes: new Set<string>(), sentKeys: new Set<string>() };

  it("sends water nudges only when turned on, once per slot", () => {
    expect(duePushes({ ...base, now: "10:32" }).length).toBe(0);
    const on = duePushes({ ...base, now: "10:32", water: true });
    expect(on).toMatchObject([{ key: "water:10:30", url: "/water" }]);
    expect(duePushes({ ...base, now: "10:32", water: true, sentKeys: new Set(["water:10:30"]) }).length).toBe(0);
  });

  it("sends a snooze once its time has come", () => {
    const s = { id: "s1", title: "Hoppy", body: "💊 Time for Triphala", url: "/meds", remind_at: "2026-10-26T15:45:00Z" };
    expect(duePushes({ ...base, now: "21:00", snoozes: [s], at: new Date("2026-10-26T15:40:00Z") }).length).toBe(0);
    expect(duePushes({ ...base, now: "21:16", snoozes: [s], at: new Date("2026-10-26T15:46:00Z") })).toMatchObject([{ key: "snooze:s1", body: "💊 Time for Triphala" }]);
  });
});
