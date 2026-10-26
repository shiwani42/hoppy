"use client";

import { useState } from "react";
import type { Question } from "@/lib/onboarding/nextQuestion";

export type DripAnswer = {
  height_cm?: number;
  weight_kg?: number;
  birth_year?: number;
  sex?: "female" | "male";
  goal_weight_kg?: number;
  diet_type?: "veg" | "egg" | "non-veg" | "jain" | "vegan";
  sleep_hours?: number;
};

const input = "h-12 w-full rounded-2xl border border-line bg-cream px-4 text-lg outline-none focus:border-teal";
const DIETS = [
  ["veg", "Veg"], ["egg", "Veg + egg"], ["non-veg", "Non-veg"], ["jain", "Jain"], ["vegan", "Vegan"],
] as const;

/** One drip question as an avatar chat bubble with inline inputs. */
export function DripQuestion({
  q,
  onAnswer,
  onLater,
}: {
  q: Question;
  onAnswer: (a: DripAnswer) => Promise<void> | void;
  onLater: () => void;
}) {
  const [a, setA] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const num = (k: string) => (a[k] ? Number(a[k]) : undefined);

  const answer: DripAnswer | null = (() => {
    switch (q.id) {
      case "body": {
        const h = num("h"), w = num("w");
        return h && w && h >= 80 && h <= 250 && w >= 20 && w <= 350 ? { height_cm: h, weight_kg: w } : null;
      }
      case "age_sex": {
        const y = num("y");
        const ok = y && y >= 1920 && y <= new Date().getFullYear() - 13 && (a.sex === "female" || a.sex === "male");
        return ok ? { birth_year: y, sex: a.sex as "female" | "male" } : null;
      }
      case "goal": {
        const g = num("g");
        return g && g >= 30 && g <= 300 ? { goal_weight_kg: g } : null;
      }
      case "diet":
        return a.diet ? { diet_type: a.diet as DripAnswer["diet_type"] } : null;
      case "sleep": {
        const s = num("s") ?? 7;
        return { sleep_hours: s };
      }
    }
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer) return;
    setBusy(true);
    try {
      await onAnswer(answer);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[1.75rem] rounded-tl-md bg-card p-4 shadow-sm animate-fade-up" aria-label="Question from your avatar">
      <p className="font-display text-lg leading-snug">{q.prompt}</p>
      <div className="mt-3 flex flex-col gap-2">
        {q.id === "body" && (
          <div className="flex gap-2">
            <label className="flex-1 text-sm text-ink-soft">Height (cm)
              <input className={input} inputMode="numeric" type="number" min={80} max={250} value={a.h ?? ""} onChange={(e) => setA({ ...a, h: e.target.value })} />
            </label>
            <label className="flex-1 text-sm text-ink-soft">Weight (kg)
              <input className={input} inputMode="decimal" type="number" step="0.1" min={20} max={350} value={a.w ?? ""} onChange={(e) => setA({ ...a, w: e.target.value })} />
            </label>
          </div>
        )}
        {q.id === "age_sex" && (
          <>
            <label className="text-sm text-ink-soft">Year you were born
              <input className={input} inputMode="numeric" type="number" min={1920} value={a.y ?? ""} onChange={(e) => setA({ ...a, y: e.target.value })} />
            </label>
            <div className="flex gap-2" role="group" aria-label="Sex (for the calorie formula)">
              {(["female", "male"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={a.sex === s} onClick={() => setA({ ...a, sex: s })}
                  className={`h-12 flex-1 rounded-full font-display font-semibold capitalize ${a.sex === s ? "bg-teal text-white" : "bg-cream"}`}>
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-soft">Used only for the standard calorie formula (Mifflin–St Jeor).</p>
          </>
        )}
        {q.id === "goal" && (
          <label className="text-sm text-ink-soft">Goal weight (kg)
            <input className={input} inputMode="decimal" type="number" step="0.1" value={a.g ?? ""} onChange={(e) => setA({ ...a, g: e.target.value })} />
          </label>
        )}
        {q.id === "diet" && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Diet type">
            {DIETS.map(([v, label]) => (
              <button key={v} type="button" aria-pressed={a.diet === v} onClick={() => setA({ ...a, diet: v })}
                className={`h-11 rounded-full px-4 font-display font-semibold ${a.diet === v ? "bg-teal text-white" : "bg-cream"}`}>
                {label}
              </button>
            ))}
          </div>
        )}
        {q.id === "sleep" && (
          <label className="text-sm text-ink-soft">
            <span className="font-display text-3xl font-bold text-rest">{num("s") ?? 7} h</span>
            <input type="range" min={3} max={12} step={0.5} value={a.s ?? "7"} onChange={(e) => setA({ ...a, s: e.target.value })} className="mt-2 w-full accent-[var(--color-rest)]" aria-label="Hours slept" />
          </label>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button disabled={!answer || busy} className="h-12 flex-1 rounded-full bg-teal font-display font-semibold text-white disabled:opacity-40">
          {busy ? "Saving…" : "Done"}
        </button>
        <button type="button" onClick={onLater} className="h-12 rounded-full px-4 font-display font-semibold text-ink-soft">
          Later
        </button>
      </div>
    </form>
  );
}
