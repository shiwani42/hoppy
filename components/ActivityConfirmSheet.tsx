"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { ACTIVITIES, activeMinutes, intensity, kcalBurned } from "@/lib/rules/activity";
import type { ParsedActivity } from "@/lib/parse/text";

/** Confirm an exercise/yoga log: activity, minutes, calories out (prd.md > Exercise and Yoga Logging). */
export function ActivityConfirmSheet({
  initial,
  weightKg,
  transcript,
  onConfirm,
  onClose,
}: {
  initial: ParsedActivity;
  weightKg: number | null;
  transcript?: string;
  onConfirm: (a: ParsedActivity & { minutes: number }) => Promise<void> | void;
  onClose: () => void;
}) {
  const [a, setA] = useState(initial);
  const [minutes, setMinutes] = useState(initial.minutes ?? 30);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const kcal = kcalBurned(a.met, minutes, weightKg);

  return (
    <Sheet open onClose={onClose} title="Nice! Log this workout?">
      {transcript && <p className="mb-4 rounded-2xl bg-card px-4 py-3 text-ink-soft">“{transcript}”</p>}
      <div className="rounded-3xl bg-card p-4 shadow-sm">
        <button onClick={() => setPicking((p) => !p)} className="flex w-full items-center gap-3 text-left" aria-expanded={picking}>
          <span className="text-4xl" aria-hidden>{a.emoji}</span>
          <span className="flex-1">
            <span className="block font-display text-xl font-semibold">{a.label}</span>
            <span className="text-sm text-ink-soft capitalize">{intensity(a.met)} · change</span>
          </span>
        </button>
        {picking && (
          <div className="mt-3 flex max-h-48 flex-wrap gap-2 overflow-y-auto">
            {ACTIVITIES.map((x) => (
              <button key={x.key} onClick={() => { setA({ key: x.key, label: x.label, emoji: x.emoji, met: x.met, minutes }); setPicking(false); }}
                className={`rounded-full px-3 py-1.5 text-sm ${x.key === a.key ? "bg-teal text-white" : "bg-cream"}`}>
                {x.emoji} {x.label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-center gap-4">
          <button aria-label="5 minutes less" disabled={minutes <= 5} onClick={() => setMinutes((m) => m - 5)} className="h-12 w-12 rounded-full bg-teal-soft font-display text-2xl text-teal disabled:opacity-30">−</button>
          <span className="min-w-28 text-center font-display text-3xl font-bold">{minutes} min</span>
          <button aria-label="5 minutes more" onClick={() => setMinutes((m) => Math.min(600, m + 5))} className="h-12 w-12 rounded-full bg-teal-soft font-display text-2xl text-teal">+</button>
        </div>
        <p className="mt-3 text-center text-ink-soft">
          ≈ <strong className="text-strength">{kcal} kcal</strong> burned · +{Math.round(activeMinutes(a.met, minutes))} min Strength
        </p>
      </div>
      <button
        disabled={saving}
        onClick={async () => { setSaving(true); try { await onConfirm({ ...a, minutes }); } finally { setSaving(false); } }}
        className="mt-6 h-14 w-full rounded-full bg-teal font-display text-lg font-semibold text-white shadow-md disabled:opacity-40"
      >
        {saving ? "Saving…" : `Log it · ${kcal} kcal`}
      </button>
    </Sheet>
  );
}
