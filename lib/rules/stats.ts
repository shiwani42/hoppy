import type { Targets } from "./targets";

/**
 * Six daily stats, each 0–100, that only ever fill up from what the user does
 * (prd.md > Daily Stats). A stat is `null` while it is locked for lack of data.
 */
export type StatKey = "strength" | "muscle" | "digestion" | "hydration" | "energy" | "rest";

export const STAT_KEYS: StatKey[] = ["strength", "muscle", "digestion", "hydration", "energy", "rest"];

export type DayTotals = {
  kcalIn: number;
  kcalOut: number;
  proteinG: number;
  fiberG: number;
  waterMl: number;
  /** Moderate-equivalent minutes: vigorous minutes count double (WHO 2020). */
  activeMinutes: number;
  sleepHours: number | null;
};

export type Stat = {
  key: StatKey;
  value: number | null;
  current: number;
  target: number | null;
  unit: string;
};

export const EMPTY_DAY: DayTotals = {
  kcalIn: 0,
  kcalOut: 0,
  proteinG: 0,
  fiberG: 0,
  waterMl: 0,
  activeMinutes: 0,
  sleepHours: null,
};

/** Energy stays full inside ±150 kcal of the target. */
export const ENERGY_BAND = 150;
/** A strong day: at least 4 of the 6 stats at 70 or more. */
export const STRONG_STAT = 70;
export const STRONG_COUNT = 4;

const pct = (current: number, target: number) =>
  target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : 0;

/**
 * Energy fills like a fuel gauge as net calories approach the target, is full
 * inside the band, and dims gently (never below 40) when the day runs over —
 * supportive, never a red "over budget" state.
 */
export function energyValue(net: number, target: number) {
  const low = target - ENERGY_BAND;
  const high = target + ENERGY_BAND;
  if (net <= 0) return 0;
  if (net < low) return pct(net, low);
  if (net <= high) return 100;
  return Math.max(40, Math.round(100 - (net - high) / 10));
}

export function restValue(hours: number) {
  if (hours >= 7 && hours <= 9) return 100;
  if (hours < 7) return pct(hours, 7);
  return Math.max(70, Math.round(100 - (hours - 9) * 10));
}

export function computeStats(day: DayTotals, t: Targets): Record<StatKey, Stat> {
  const net = day.kcalIn - day.kcalOut;
  return {
    strength: {
      key: "strength",
      value: pct(day.activeMinutes, t.activeMinutes),
      current: Math.round(day.activeMinutes),
      target: t.activeMinutes,
      unit: "min",
    },
    muscle: {
      key: "muscle",
      value: t.proteinG ? pct(day.proteinG, t.proteinG) : null,
      current: Math.round(day.proteinG),
      target: t.proteinG,
      unit: "g protein",
    },
    digestion: {
      key: "digestion",
      value: pct(day.fiberG, t.fiberG),
      current: Math.round(day.fiberG),
      target: t.fiberG,
      unit: "g fibre",
    },
    hydration: {
      key: "hydration",
      value: pct(day.waterMl, t.waterMl),
      current: Math.round(day.waterMl),
      target: t.waterMl,
      unit: "ml",
    },
    energy: {
      key: "energy",
      value: t.calories ? energyValue(net, t.calories) : null,
      current: Math.round(net),
      target: t.calories,
      unit: "kcal net",
    },
    rest: {
      key: "rest",
      value: day.sleepHours == null ? null : restValue(day.sleepHours),
      current: day.sleepHours ?? 0,
      target: t.sleepHours.min,
      unit: "h sleep",
    },
  };
}

export function isStrongDay(stats: Record<StatKey, Stat>) {
  return STAT_KEYS.filter((k) => (stats[k].value ?? 0) >= STRONG_STAT).length >= STRONG_COUNT;
}

/** 0–1 overall liveliness used for the avatar's glow and expression. */
export function vitality(stats: Record<StatKey, Stat>) {
  const unlocked = STAT_KEYS.map((k) => stats[k].value).filter((v): v is number => v != null);
  if (!unlocked.length) return 0;
  return unlocked.reduce((a, b) => a + b, 0) / unlocked.length / 100;
}
