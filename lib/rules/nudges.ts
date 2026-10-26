import type { Stat, StatKey } from "./stats";

/**
 * When the avatar speaks up about a low stat (prd.md > Daily Stats):
 * at most 3 times a day, at least 2 hours apart, each stat once a day, and only
 * after the time of day when it's reasonable to expect progress.
 */

export const MAX_NUDGES_PER_DAY = 3;
export const MIN_GAP_MS = 2 * 60 * 60 * 1000;

const RULES: { key: Exclude<StatKey, "energy" | "rest">; afterHour: number; below: number }[] = [
  { key: "hydration", afterHour: 11, below: 30 },
  { key: "muscle", afterHour: 13, below: 40 },
  { key: "strength", afterHour: 17, below: 30 },
  { key: "digestion", afterHour: 18, below: 40 },
];

export type PastNudge = { at: Date; key: string };

export function nudgeFor(
  stats: Record<StatKey, Stat>,
  now: Date,
  past: PastNudge[],
): (typeof RULES)[number]["key"] | null {
  if (past.length >= MAX_NUDGES_PER_DAY) return null;
  const last = past.reduce((m, p) => Math.max(m, p.at.getTime()), 0);
  if (last && now.getTime() - last < MIN_GAP_MS) return null;
  const done = new Set(past.map((p) => p.key));
  // Lowest qualifying stat first: the one that needs it most.
  const due = RULES.filter(
    (r) => now.getHours() >= r.afterHour && !done.has(r.key) && stats[r.key].value !== null && (stats[r.key].value ?? 0) < r.below,
  ).sort((a, b) => (stats[a.key].value ?? 0) - (stats[b.key].value ?? 0));
  return due[0]?.key ?? null;
}
