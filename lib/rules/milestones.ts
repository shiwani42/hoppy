/**
 * Milestones worth a share card (prd.md > Milestone Share Cards): a stage-up,
 * every 2 kg toward the goal, and 7/30/100-day streaks. Each is offered once.
 */

export const STREAK_MILESTONES = [7, 30, 100];
export const WEIGHT_STEP_KG = 2;

export type Milestone = { type: "stage" | "weight" | "streak"; value: number };
export type Celebrated = { stage?: number; weight?: number; streak?: number };

export function dueMilestone(
  now: { stage: number; kgLost: number | null; streak: number },
  done: Celebrated,
): Milestone | null {
  if (now.stage > 1 && now.stage > (done.stage ?? 1)) return { type: "stage", value: now.stage };
  if (now.kgLost != null) {
    const step = Math.floor(now.kgLost / WEIGHT_STEP_KG) * WEIGHT_STEP_KG;
    if (step >= WEIGHT_STEP_KG && step > (done.weight ?? 0)) return { type: "weight", value: step };
  }
  const reached = STREAK_MILESTONES.filter((m) => now.streak >= m).at(-1);
  if (reached && reached > (done.streak ?? 0)) return { type: "streak", value: reached };
  return null;
}
