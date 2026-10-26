"use client";

import type { SavedActivity } from "@/lib/logs/client";
import { activityByKey } from "@/lib/rules/activity";

export function ActivityCard({ a, onDelete }: { a: SavedActivity; onDelete?: () => void }) {
  return (
    <article className="flex items-center gap-4 rounded-[1.75rem] bg-card p-4 shadow-sm animate-fade-up" data-kind="activity">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-strength/10 text-3xl" aria-hidden>
        {activityByKey(a.activity_key)?.emoji ?? "🏃"}
      </span>
      <div className="flex-1">
        <p className="text-sm text-ink-soft">{a.label} · {Number(a.minutes)} min</p>
        <p className="font-display text-4xl leading-none font-bold text-strength">−{Math.round(Number(a.kcal))}</p>
        <p className="text-xs text-ink-soft">kcal burned · +{Math.round(Number(a.active_minutes))} min Strength</p>
      </div>
      {onDelete && <button onClick={onDelete} className="self-end rounded-full px-3 py-2 text-sm text-ink-soft">Delete</button>}
    </article>
  );
}
