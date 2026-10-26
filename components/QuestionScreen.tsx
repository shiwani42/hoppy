"use client";

import { useState } from "react";
import { TwinArt, type Twin } from "@/components/art";
import { Overlay } from "@/components/Overlay";
import { Bubble, Button, Segmented } from "@/components/ui";
import type { QuestionId } from "@/lib/onboarding/nextQuestion";

export type DripAnswer = {
  height_cm?: number;
  weight_kg?: number;
  birth_year?: number;
  sex?: "female" | "male";
  goal_weight_kg?: number;
  diet_type?: "veg" | "egg" | "non-veg" | "jain" | "vegan";
  sleep_hours?: number;
};

/** What the twin says in the chat (short) and on the question screen (full). */
export const ASK: Record<QuestionId, { short: string; full: string }> = {
  body: { short: "Want to know if that fits your day? What's your height and weight?", full: "Want to know if that fits your day? Tell me your height and weight." },
  age_sex: { short: "Two more things and I can set your daily calorie target 🎯", full: "Two more things and I can set your daily calorie target!" },
  goal: { short: "Where are we headed together? What's your goal weight?", full: "I need to know a tiny bit more about you! What's your goal weight?" },
  diet: { short: "Before I suggest food — how do you eat?", full: "Before I suggest food — how do you usually eat?" },
  sleep: { short: "Good morning! How did you sleep last night? 😴", full: "Good morning! How many hours did you sleep last night?" },
};

const DIETS = [
  ["veg", "Vegetarian", "🥗"],
  ["egg", "Veg + egg", "🥚"],
  ["non-veg", "Non-veg", "🍗"],
  ["jain", "Jain", "🌿"],
  ["vegan", "Vegan", "🌱"],
] as const;

const round = (v: number, step: number) => Math.round(v / step) * step;

/** A saffron slider with the nearby values written under it ("76 kg • 77 kg • 78 kg…"). */
export function Ruler({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  const near = [-2, -1, 0, 1, 2].map((k) => value + k * step * (step < 1 ? 2 : 1)).filter((v) => v >= min && v <= max);
  return (
    <div>
      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-[14px] top-1/2 flex -translate-y-1/2 justify-between">
          {Array.from({ length: 21 }, (_, i) => (
            <span key={i} className={`w-px rounded-full ${i * 5 > fill ? "bg-[#cdbf9f]" : "bg-transparent"}`} style={{ height: i % 5 === 0 ? 18 : 10 }} />
          ))}
        </div>
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="ruler relative w-full"
          style={{ "--fill": `${fill}%` } as React.CSSProperties}
        />
      </div>
      <p className="mt-1 flex justify-center gap-1.5 text-[16px] text-ink-soft" aria-hidden>
        {near.map((v, i) => (
          <span key={v} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[10px]">•</span>}
            <span className={v === value ? "font-display text-[18px] font-bold text-turmeric" : ""}>{format(v)}</span>
          </span>
        ))}
      </p>
    </div>
  );
}

function Panel({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] bg-saffron-soft p-4 shadow-[inset_0_0_0_1px_rgb(220_152_19/0.12)]">
      <span className="inline-block rounded-[8px] bg-[#f6d79e] px-3 py-0.5 font-display text-[20px] font-bold text-ink">{tag}</span>
      <div className="mt-3">{children}</div>
    </div>
  );
}

const kgToLb = (kg: number) => Math.round(kg * 2.2046);

/** One drip question as a full screen (images/…7tg0…png, right): the twin asks, a slider answers. */
export function QuestionScreen({
  q,
  twin,
  stage,
  weightKg,
  onAnswer,
  onLater,
}: {
  q: QuestionId;
  twin: Twin | null;
  stage: number;
  weightKg: number | null;
  onAnswer: (a: DripAnswer) => Promise<void> | void;
  onLater: () => void;
}) {
  const [height, setHeight] = useState(165);
  const [weight, setWeight] = useState(weightKg ?? 72);
  const [goal, setGoal] = useState(round((weightKg ?? 80) - 4, 0.5));
  const [year, setYear] = useState(1975);
  const [sex, setSex] = useState<"female" | "male" | null>(null);
  const [diet, setDiet] = useState<DripAnswer["diet_type"] | null>(null);
  const [sleep, setSleep] = useState(7);
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [busy, setBusy] = useState(false);

  const kg = (v: number) => (unit === "kg" ? `${v} kg` : `${kgToLb(v)} lbs`);
  const answer: DripAnswer | null =
    q === "body" ? { height_cm: height, weight_kg: weight }
    : q === "age_sex" ? (sex ? { birth_year: year, sex } : null)
    : q === "goal" ? { goal_weight_kg: goal }
    : q === "diet" ? (diet ? { diet_type: diet } : null)
    : { sleep_hours: sleep };

  const toLose = weightKg ? Math.max(0, weightKg - goal) : 0;

  return (
    <Overlay label="A question from your twin" onClose={onLater}>
      <div className="flex flex-1 flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-6">
        <div className="relative mx-auto h-[190px] w-[190px]">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,#fbe7c4,#f3cf95)]" />
          <TwinArt twin={twin} pose="bust" stage={stage} className="absolute inset-x-2 bottom-0 h-[200px] w-[174px]" />
        </div>
        <Bubble tone="sand" tail="none" className="-mt-3 mr-6 rotate-[-1.5deg]">
          <svg aria-hidden width="26" height="18" viewBox="0 0 26 18" className="absolute -top-3.5 left-[46%]">
            <path d="M0 18 C8 12 12 6 14 0 C16 8 20 13 26 18 Z" fill="#efe7d8" />
          </svg>
          <p className="font-display text-[20px] leading-snug font-semibold">{ASK[q].full}</p>
        </Bubble>

        <div className="mt-5 flex flex-col gap-3">
          {q === "body" && (
            <>
              <Panel tag="Height">
                <Ruler label="Height" value={height} min={120} max={210} step={1} format={(v) => `${v}`} onChange={setHeight} />
                <p className="text-center text-[14px] text-ink-soft">{height} cm · {Math.floor(height / 30.48)}′{Math.round((height / 2.54) % 12)}″</p>
              </Panel>
              <Panel tag="Weight">
                <Ruler label="Weight" value={weight} min={35} max={160} step={0.5} format={(v) => kg(v).replace(" kg", "").replace(" lbs", "")} onChange={setWeight} />
                <div className="mt-2 flex items-center justify-between">
                  <p className="font-display text-[22px] font-bold">{kg(weight)}</p>
                  <Segmented label="Units" value={unit} options={[["kg", "kg"], ["lbs", "lbs"]]} onChange={setUnit} />
                </div>
              </Panel>
            </>
          )}
          {q === "goal" && (
            <Panel tag="Target Weight">
              <Ruler label="Goal weight" value={goal} min={35} max={Math.max(40, weightKg ?? 160)} step={0.5} format={kg} onChange={setGoal} />
              <div className="mt-3 flex justify-center">
                <Segmented label="Units" value={unit} options={[["kg", "kg"], ["lbs", "lbs"]]} onChange={setUnit} />
              </div>
            </Panel>
          )}
          {q === "age_sex" && (
            <Panel tag="Year you were born">
              <Ruler label="Year you were born" value={year} min={1935} max={new Date().getFullYear() - 18} step={1} format={(v) => `${v}`} onChange={setYear} />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[14px] leading-snug text-ink-soft">For the standard calorie formula only (Mifflin–St Jeor).</p>
                <div className="flex shrink-0 gap-2" role="group" aria-label="Sex">
                  {(["female", "male"] as const).map((s) => (
                    <button key={s} aria-pressed={sex === s} onClick={() => setSex(s)}
                      className={`h-11 rounded-[12px] px-4 font-display text-[17px] font-semibold capitalize ${sex === s ? "bg-teal text-white" : "bg-card text-ink"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>
          )}
          {q === "diet" && (
            <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Diet type">
              {DIETS.map(([v, label, emoji]) => (
                <button key={v} aria-pressed={diet === v} onClick={() => setDiet(v)}
                  className={`flex h-16 items-center gap-3 rounded-[18px] px-4 text-left font-display text-[18px] font-semibold transition ${diet === v ? "bg-teal text-white shadow-teal" : "bg-card shadow-card"}`}>
                  <span className="text-[28px]" aria-hidden>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          )}
          {q === "sleep" && (
            <Panel tag="Hours slept">
              <Ruler label="Hours slept" value={sleep} min={3} max={12} step={0.5} format={(v) => `${v} h`} onChange={setSleep} />
            </Panel>
          )}
        </div>

        {q === "goal" && (
          <p className="mt-3 text-center text-[15px] text-ink-soft">
            Let&apos;s aim for a safe, steady 0.5–1 kg/week.
            {toLose > 0 && ` That's about ${Math.ceil(toLose / 1)}–${Math.ceil(toLose / 0.5)} weeks.`}
          </p>
        )}

        <div className="mt-auto pt-6">
          <Button
            disabled={!answer || busy}
            onClick={async () => {
              if (!answer) return;
              setBusy(true);
              try {
                await onAnswer(answer);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Confirm"}
          </Button>
          <button onClick={onLater} className="mt-3 h-11 w-full font-display text-[18px] font-semibold text-ink-faint">
            Answer later
          </button>
        </div>
      </div>
    </Overlay>
  );
}
