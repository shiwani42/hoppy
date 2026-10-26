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
  progress: StageProgress | null,
  streak?: number,
): ShareCardData {
  const strongBars = STAT_KEYS.filter((k) => (t.stats[k].value ?? 0) >= STRONG_STAT).length;
  const net = r(t.totals.kcalIn - t.totals.kcalOut);
  const goal = goalProgress(p);
  return {
    title: `${p.name}'s Day ${journeyDay(p.created_at)}`,
    subtitle: strongBars ? `${strongBars} of 6 bars strong today` : "Showing up is the first win",
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    startUrl: stages[1]?.url,
    nowUrl: stages[p.current_stage]?.url ?? stages[1]?.url,
    stageName: STAGE_BODIES[p.current_stage].name,
    stageNumber: p.current_stage,
    numbers: [
      { label: t.targets.calories ? `Net kcal · of ${t.targets.calories}` : "Calories in", value: String(t.targets.calories ? net : r(t.totals.kcalIn)), color: "var(--color-energy)" },
      { label: "Protein", value: String(r(t.totals.proteinG)), unit: "g", color: "var(--color-muscle)" },
      { label: "Active", value: String(r(t.totals.activeMinutes)), unit: "min", color: "var(--color-strength)" },
      { label: "Water", value: (t.totals.waterMl / 1000).toFixed(1), unit: "L", color: "var(--color-hydration)" },
    ],
    progress: goal
      ? { label: `−${goal.lost} kg · ${goal.pct}% of the way to goal`, pct: goal.pct }
      : progress && p.current_stage < 5
        ? { label: `${progress.done}/${progress.needed} strong days to ${STAGE_BODIES[p.current_stage + 1].name}`, pct: (progress.done / progress.needed) * 100 }
        : null,
    badge: streak && streak > 1 ? `🔥 ${streak}-day streak` : t.strong ? "Strong day ✨" : null,
  };
}

const MILESTONE_COPY = {
  stage: (v: number) => ({ title: `Stage ${v}: ${STAGE_BODIES[v].name}`, subtitle: "Weeks of strong days, made visible", hero: { label: "Stage", value: `${v}`, unit: "of 5" } }),
  weight: (v: number) => ({ title: `${v} kg lighter`, subtitle: "Steady, safe progress — one plate at a time", hero: { label: "Down", value: `−${v}`, unit: "kg" } }),
  streak: (v: number) => ({ title: `${v}-day streak 🔥`, subtitle: "Showing up, every single day", hero: { label: "Streak", value: `${v}`, unit: "days" } }),
} as const;

/** A milestone card: the achievement as the hero number plus the journey so far. */
export function milestoneCard(
  p: Profile,
  stages: Record<number, AvatarStage>,
  type: keyof typeof MILESTONE_COPY,
  value: number,
  streakDays: number,
): ShareCardData {
  const copy = MILESTONE_COPY[type](value);
  const goal = goalProgress(p);
  return {
    title: copy.title,
    subtitle: `${p.name} · ${copy.subtitle}`,
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    startUrl: stages[1]?.url,
    nowUrl: stages[p.current_stage]?.url ?? stages[1]?.url,
    stageName: STAGE_BODIES[p.current_stage].name,
    stageNumber: p.current_stage,
    numbers: [
      { ...copy.hero, color: "var(--color-turmeric)" },
      { label: "Journey", value: String(journeyDay(p.created_at)), unit: "days", color: "var(--color-teal)" },
      ...(goal ? [{ label: "Lost so far", value: `${goal.lost}`, unit: "kg", color: "var(--color-digestion)" }] : []),
      ...(type !== "streak" ? [{ label: "Streak", value: String(streakDays), unit: "days", color: "var(--color-strength)" }] : []),
    ].slice(0, 4),
    progress: goal ? { label: `${goal.pct}% of the way to goal`, pct: goal.pct } : null,
    badge: "Milestone 🏅",
  };
}
