/**
 * Streaks (prd.md > Streaks): a day counts when at least one meal is logged.
 * Today not being logged *yet* doesn't break the streak — it ends at yesterday
 * until the day is over.
 */

const prev = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return t.toISOString().slice(0, 10);
};

export function streak(loggedDays: Iterable<string>, today: string): number {
  const days = new Set(loggedDays);
  let day = days.has(today) ? today : prev(today);
  let n = 0;
  while (days.has(day)) {
    n++;
    day = prev(day);
  }
  return n;
}
