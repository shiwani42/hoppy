import { STAGE_BODIES } from "@/lib/ai/prompts";
import type { ShareCardData } from "@/components/ShareCard";
import type { AvatarStage } from "@/lib/avatar/client";
import type { Profile } from "@/lib/profile";
import type { StageProgress } from "@/lib/rules/stages";
import { STAT_KEYS, STRONG_STAT } from "@/lib/rules/stats";
import type { Today } from "@/lib/stats/today";

const r = Math.round;

export function journeyDay(createdAt: string, now = new Date()) {
  const a = new Date(createdAt);
  a.setHours(0, 0, 0, 0);
  const b = new Date(now);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 864e5) + 1;
}

/** Weight progress toward the goal, if the user set one and logged weight. */
export function goalProgress(p: Pick<Profile, "start_weight_kg" | "weight_kg" | "goal_weight_kg">) {
  const { start_weight_kg: s, weight_kg: w, goal_weight_kg: g } = p;
  if (!s || !w || !g || g >= s) return null;
  const lost = Math.max(0, Math.round((s - w) * 10) / 10);
  return { lost, pct: Math.round((lost / (s - g)) * 100) };
}

/** Everything the daily card shows, from real logs only (prd.md > Daily Share Card). */
export function todayCard(
  p: Profile,
  t: Today,
  stages: Record<number, AvatarStage>,
  _progress: StageProgress | null,
  streak?: number,
): ShareCardData {
  const day = journeyDay(p.created_at);
  const strongBars = STAT_KEYS.filter((k) => (t.stats[k].value ?? 0) >= STRONG_STAT).length;
  return {
    title: `Hoppy — ${p.name}'s Journey`,
    subtitle: `Day ${day} · ${strongBars} of 6 stats strong today`,
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    start: { url: stages[1]?.url, label: "Day 1", sub: `(${STAGE_BODIES[1].name})` },
    now: { url: stages[p.current_stage]?.url ?? stages[1]?.url, label: `Day ${day}`, sub: `(${STAGE_BODIES[p.current_stage].name})` },
    heading: "Today's Highlights:",
    lines: [
      `${r(t.totals.kcalIn).toLocaleString("en-IN")} kcal in | ${r(t.totals.kcalOut).toLocaleString("en-IN")} kcal out`,
      `${r(t.totals.activeMinutes)} min active · ${(t.totals.waterMl / 1000).toFixed(1)} L water`,
    ],
    badge: streak && streak > 1 ? `${streak}-Day Consistent Logging Streak! 🔥` : t.strong ? "Strong day ✨" : "Showing up is the first win 🌱",
  };
}

const MILESTONE_COPY = {
  stage: (v: number) => ({ title: `Stage ${v}: ${STAGE_BODIES[v].name}`, line: "Weeks of strong days, made visible" }),
  weight: (v: number) => ({ title: `${v} kg lighter`, line: "Steady, safe progress — one plate at a time" }),
  streak: (v: number) => ({ title: `${v}-day streak`, line: "Showing up, every single day" }),
} as const;

/** A milestone card: the achievement, Day 1 vs now, and the journey so far. */
export function milestoneCard(
  p: Profile,
  stages: Record<number, AvatarStage>,
  type: keyof typeof MILESTONE_COPY,
  value: number,
  streakDays: number,
): ShareCardData {
  const copy = MILESTONE_COPY[type](value);
  const goal = goalProgress(p);
  const day = journeyDay(p.created_at);
  return {
    title: `Hoppy — ${p.name}'s Journey`,
    subtitle: `Milestone: ${copy.title}`,
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    start: { url: stages[1]?.url, label: "Day 1", sub: `(${STAGE_BODIES[1].name})` },
    now: { url: stages[p.current_stage]?.url ?? stages[1]?.url, label: `Day ${day}`, sub: `(${STAGE_BODIES[p.current_stage].name})` },
    heading: `${copy.title}!`,
    lines: [copy.line, goal ? `−${goal.lost} kg so far · ${goal.pct}% of the way` : `${day} days into the journey`],
    badge: streakDays > 1 ? `${streakDays}-Day Consistent Logging Streak! 🔥` : "Milestone 🏅",
  };
}
