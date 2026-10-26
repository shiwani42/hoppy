/**
 * Body stages over weeks — spec.md > Rules Engine (stages.ts).
 *
 * Moving up a stage needs a sustained run: 20 strong days out of the last 28,
 * counted only since the previous stage-up (so stages are ~4 weeks apart). If the
 * user has a weight-loss goal and logs weight, they also need real progress:
 * stage n → n+1 requires losing n/4 of the start→goal gap. At a safe 0.5–1 kg/week
 * the avatar never runs far ahead of the real body. Stages never go down.
 */

export const STRONG_DAYS_NEEDED = 20;
export const WINDOW_DAYS = 28;
export const MAX_STAGE = 5;

export type StageInput = {
  stage: number;
  /** YYYY-MM-DD of the last stage-up, or null if never. */
  stageChangedAt: string | null;
  /** YYYY-MM-DD dates of strong days (any order). */
  strongDays: string[];
  today: string;
  startWeightKg: number | null;
  goalWeightKg: number | null;
  currentWeightKg: number | null;
};

export type StageProgress = {
  done: number;
  needed: number;
  weightOk: boolean;
  /** kg still to lose before the weight condition is met, if it applies. */
  kgToGo: number | null;
  canStageUp: boolean;
};

const dayMs = 864e5;
const toDay = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

export function stageProgress(i: StageInput): StageProgress {
  if (i.stage >= MAX_STAGE) return { done: 0, needed: STRONG_DAYS_NEEDED, weightOk: true, kgToGo: null, canStageUp: false };

  const today = toDay(i.today);
  const windowStart = today - (WINDOW_DAYS - 1) * dayMs;
  const since = i.stageChangedAt ? Math.max(windowStart, toDay(i.stageChangedAt) + dayMs) : windowStart;
  const done = new Set(i.strongDays.filter((d) => toDay(d) >= since && toDay(d) <= today)).size;

  let weightOk = true;
  let kgToGo: number | null = null;
  const { startWeightKg: start, goalWeightKg: goal, currentWeightKg: now } = i;
  if (start && goal && now && goal < start) {
    const needLost = ((start - goal) * i.stage) / 4;
    const lost = start - now;
    weightOk = lost >= needLost - 1e-9;
    kgToGo = weightOk ? 0 : Math.round((needLost - lost) * 10) / 10;
  }

  return { done, needed: STRONG_DAYS_NEEDED, weightOk, kgToGo, canStageUp: done >= STRONG_DAYS_NEEDED && weightOk };
}
