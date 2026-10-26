"use client";

import { Sheet } from "@/components/Sheet";
import { STAGE_BODIES } from "@/lib/ai/prompts";
import { STAT_KEYS, type Stat, type StatKey } from "@/lib/rules/stats";
import { STAT_META } from "@/lib/stats/meta";

const fmt = (s: Stat) => {
  if (s.key === "hydration") return `${(s.current / 1000).toFixed(1)} / ${((s.target ?? 0) / 1000).toFixed(1)} L`;
  if (s.key === "rest") return `${s.current} h · aim 7–9 h`;
  if (s.key === "energy") return `${s.current} / ${s.target} kcal net`;
  return `${s.current} / ${s.target} ${s.unit}`;
};

/** Tap the avatar → six stat bars plus the body stage (prd.md > Stat Sheet). */
export function StatSheet({
  open,
  onClose,
  stats,
  stage,
  stageProgress,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  stats: Record<StatKey, Stat>;
  stage: number;
  stageProgress?: { done: number; needed: number } | null;
  footer?: React.ReactNode;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Today's stats">
      <ul className="flex flex-col gap-3">
        {STAT_KEYS.map((k) => {
          const s = stats[k];
          const m = STAT_META[k];
          const locked = s.value === null;
          return (
            <li key={k} className="rounded-3xl bg-card px-4 py-3 shadow-sm" data-stat={k}>
              <div className="flex items-baseline justify-between">
                <p className="font-display text-lg font-semibold">
                  <span aria-hidden>{m.emoji}</span> {m.label}
                </p>
                <p className="text-sm text-ink-soft">{locked ? "locked" : fmt(s)}</p>
              </div>
              <div
                className="mt-2 h-3 overflow-hidden rounded-full bg-cream"
                role="meter"
                aria-label={m.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={s.value ?? 0}
              >
                <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${s.value ?? 0}%`, background: m.color }} />
              </div>
              <p className="mt-1 text-xs text-ink-soft">{locked ? m.unlock : `Fills from ${m.fills}`}</p>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 rounded-3xl bg-teal-soft px-4 py-3">
        <p className="font-display text-lg font-semibold text-teal">
          Stage {stage} of 5 · {STAGE_BODIES[stage].name}
        </p>
        {stageProgress ? (
          <p className="text-sm text-ink-soft">
            {stageProgress.done} of {stageProgress.needed} strong days toward {stage < 5 ? STAGE_BODIES[stage + 1].name : "staying here"}
          </p>
        ) : (
          <p className="text-sm text-ink-soft">Strong days move you up. A bad week only pauses — never back.</p>
        )}
      </div>
      {footer}
    </Sheet>
  );
}
