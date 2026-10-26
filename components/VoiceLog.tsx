"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FoodSticker, TwinArt, type Twin } from "@/components/art";
import { IconDrop, IconMic, IconWalk } from "@/components/icons";
import { Overlay } from "@/components/Overlay";
import { BackButton, Bubble, Button, Title } from "@/components/ui";
import { sumNutrients } from "@/lib/meals/foods";
import type { MealItem } from "@/lib/meals/types";
import { isQuestion, type Parsed, type ParsedActivity } from "@/lib/parse/text";
import { activeMinutes, kcalBurned } from "@/lib/rules/activity";
import { api, apiJson } from "@/lib/supabase/client";
import { startRecording, type Recording } from "@/lib/voice";

export type VoiceResult = { items: MealItem[]; activity: (ParsedActivity & { minutes: number }) | null; waterMl: number; transcript: string };

type Phase = "listening" | "processing" | "heard" | "error";

/** Everything one spoken log carries, flattened. */
function flatten(p: Parsed) {
  if (p.kind === "meal") return { items: p.items, activity: p.activity ?? null, waterMl: p.waterMl ?? 0 };
  if (p.kind === "activity") return { items: p.items ?? [], activity: p.activity, waterMl: p.waterMl ?? 0 };
  if (p.kind === "water") return { items: [], activity: null, waterMl: p.waterMl };
  return { items: [], activity: null, waterMl: 0 };
}

const glasses = (ml: number) => Math.round((ml / 250) * 10) / 10;

/** A plain-English line for what was understood ("brisk walk for 25 minutes and 2 glasses of water"). */
function gloss(r: Omit<VoiceResult, "transcript">) {
  const parts: string[] = [];
  if (r.activity) parts.push(`${r.activity.label.toLowerCase()} for ${r.activity.minutes} minutes`);
  if (r.items.length) parts.push(r.items.map((i) => `${i.quantity} ${i.unit} ${i.name.toLowerCase()}`).join(", "));
  if (r.waterMl) parts.push(`${glasses(r.waterMl)} glass${glasses(r.waterMl) === 1 ? "" : "es"} of water`);
  return parts.join(" and ");
}

/** A moving voice line: teal and saffron waves that swell with the mic level. */
function Waveform({ level, active }: { level: number; active: boolean }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const tick = () => {
      setPhase((p) => p + 0.12);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  const amp = active ? 10 + level * 26 + Math.sin(phase * 0.7) * 4 : 6;
  const path = (k: number, shift: number, a: number) => {
    let d = "";
    for (let x = 0; x <= 240; x += 4) {
      const env = Math.sin((Math.PI * x) / 240) ** 2;
      const y = 45 + Math.sin(x * k + phase + shift) * a * env + Math.sin(x * k * 2.3 + phase * 1.7) * a * 0.35 * env;
      d += `${x === 0 ? "M" : "L"}${x + 10} ${y.toFixed(1)} `;
    }
    return d;
  };
  return (
    <svg viewBox="0 0 260 90" className="mx-auto h-[92px] w-[260px]" aria-hidden>
      <path d={path(0.055, 1.6, amp * 0.8)} fill="none" stroke="var(--color-turmeric)" strokeWidth="7" strokeLinecap="round" opacity=".95" />
      <path d={path(0.05, 0, amp)} fill="none" stroke="var(--color-teal)" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

/** "Voice Logging" (images/…5benes…png, centre): speak a meal, workout or water in any mix. */
export function VoiceLog({
  twin,
  stage,
  name,
  weightKg,
  serverVoice,
  onConfirm,
  onEditMeal,
  onAsk,
  onClose,
}: {
  twin: Twin | null;
  stage: number;
  name: string;
  weightKg: number | null;
  serverVoice: boolean;
  onConfirm: (r: VoiceResult) => Promise<void>;
  onEditMeal: (r: VoiceResult) => void;
  onAsk: (text: string) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("listening");
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<Omit<VoiceResult, "transcript"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const rec = useRef<Recording | null>(null);

  const listen = useCallback(async () => {
    setPhase("listening");
    setError(null);
    setResult(null);
    setTranscript("");
    try {
      rec.current = await startRecording(serverVoice, setLevel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the mic");
      setPhase("error");
    }
  }, [serverVoice]);

  useEffect(() => {
    // Start listening as soon as the screen opens.
    const t = setTimeout(listen, 0);
    return () => {
      clearTimeout(t);
      rec.current?.stop().catch(() => {});
    };
  }, [listen]);

  async function stop() {
    if (!rec.current) return;
    setPhase("processing");
    const r = rec.current;
    rec.current = null;
    try {
      const { audio, transcript: said } = await r.stop();
      let parsed: Parsed & { transcript?: string };
      if (audio) {
        const form = new FormData();
        form.append("audio", audio, "voice.webm");
        const res = await api("/api/log/voice", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        parsed = json;
      } else if (said) {
        parsed = { ...(await apiJson<Parsed>("/api/log/text", { text: said })), transcript: said };
      } else {
        throw new Error("I didn't hear anything. Tap the mic and try again?");
      }
      const text = parsed.transcript ?? said ?? "";
      setTranscript(text);
      const flat = flatten(parsed);
      if (!flat.items.length && !flat.activity && !flat.waterMl) {
        if (text && isQuestion(text)) {
          onAsk(text);
          onClose();
          return;
        }
        throw new Error("I didn't catch a food, workout or water in that. Try “2 roti, dal” or “30 min walk”.");
      }
      setResult({ ...flat, activity: flat.activity ? { ...flat.activity, minutes: flat.activity.minutes ?? 30 } : null });
      setPhase("heard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't hear that clearly.");
      setPhase("error");
    }
  }

  const mealTotals = result?.items.length ? sumNutrients(result.items) : null;
  const firstName = name.split(" ")[0];
  const bubble =
    phase === "listening"
      ? `I'm listening, ${firstName}! Tell me what you ate, did or drank.`
      : phase === "processing"
        ? `I'm on it, ${firstName}! Processing your log…`
        : phase === "heard"
          ? `Got it, ${firstName}! Here's what I heard.`
          : "Hmm, let's try that once more.";

  return (
    <Overlay label="Voice logging" onClose={onClose}>
      <div className="flex flex-1 flex-col px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6">
        <BackButton label="Close voice logging" />
        <Title align="center" className="-mt-3">Voice Logging</Title>

        <div className="mt-3">
          <Waveform level={level} active={phase === "listening" || phase === "processing"} />
        </div>

        <div className="mt-3 min-h-[92px] rounded-[18px] border border-[#ebe1cf] bg-card px-4 py-3 text-center shadow-card" aria-live="polite">
          {transcript ? (
            <>
              <p className="font-display text-[21px] leading-snug font-semibold italic">“{transcript}”</p>
              {result && <p className="mt-1 text-[14px] leading-snug text-ink-soft">(“{gloss(result)}”)</p>}
            </>
          ) : (
            <p className="flex h-full min-h-[68px] items-center justify-center font-display text-[18px] text-ink-faint">
              {phase === "listening" ? "Try: “pachis minute brisk walk kiya aur do glass paani piya”" : phase === "processing" ? "Writing it down…" : error}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-end gap-2">
          <TwinArt twin={twin} pose="wave" stage={stage} className="h-[130px] w-[110px] shrink-0" />
          <Bubble tail="left" className="mb-6 flex-1">
            <p className="font-display text-[18px] leading-snug font-semibold">{bubble}</p>
          </Bubble>
        </div>

        {result && (
          <section className="mt-1 rounded-[18px] border border-[#ebe1cf] bg-card p-4 shadow-card animate-fade-up" aria-label="What I'll log">
            <h2 className="font-display text-[18px] font-bold">Here&apos;s what I&apos;ll log</h2>
            <ul className="mt-2 flex flex-col gap-3">
              {result.activity && (
                <li className="flex gap-3">
                  <IconWalk size={26} className="mt-0.5 shrink-0 text-teal" />
                  <div>
                    <p className="font-display text-[17px] leading-tight font-semibold">
                      Activity: {result.activity.label} ({result.activity.minutes} min)
                    </p>
                    <p className="text-[14px] text-ink-soft">
                      ≈{kcalBurned(result.activity.met, result.activity.minutes, weightKg)} kcal burned · Strength +{Math.round(activeMinutes(result.activity.met, result.activity.minutes))} min
                    </p>
                  </div>
                </li>
              )}
              {result.items.length > 0 && mealTotals && (
                <li className="flex gap-3">
                  <FoodSticker foodId={result.items[0].food_id} emoji={result.items[0].sticker} size={28} />
                  <div>
                    <p className="font-display text-[17px] leading-tight font-semibold">Meal: {result.items.map((i) => i.name).join(", ")}</p>
                    <p className="text-[14px] text-ink-soft">
                      ≈{Math.round(mealTotals.kcal)} kcal · {Math.round(mealTotals.protein_g)} g protein ·{" "}
                      <button onClick={() => onEditMeal({ ...result, transcript })} className="font-semibold text-teal underline-offset-2">
                        adjust portions
                      </button>
                    </p>
                  </div>
                </li>
              )}
              {result.waterMl > 0 && (
                <li className="flex gap-3">
                  <IconDrop size={26} className="mt-0.5 shrink-0 text-hydration" />
                  <div>
                    <p className="font-display text-[17px] leading-tight font-semibold">
                      Water: {glasses(result.waterMl)} glass{glasses(result.waterMl) === 1 ? "" : "es"} ({result.waterMl} ml)
                    </p>
                    <p className="text-[14px] text-ink-soft">Hydration +</p>
                  </div>
                </li>
              )}
            </ul>
          </section>
        )}

        <div className="mt-auto flex items-start gap-3 pt-6">
          <div className="flex-1">
            <Button
              className="rounded-full"
              disabled={!result || saving}
              onClick={async () => {
                if (!result) return;
                setSaving(true);
                try {
                  await onConfirm({ ...result, transcript });
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Confirm"}
            </Button>
            <p className="mt-1.5 text-center text-[13px] text-ink-soft">{result ? "Adds it all to today" : " "}</p>
          </div>
          <div className="flex flex-col items-center">
            <button
              onClick={phase === "listening" ? stop : listen}
              disabled={phase === "processing"}
              aria-label={phase === "listening" ? "Stop and log" : "Speak again"}
              className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-teal text-white shadow-[0_0_0_8px_rgb(16_104_106/0.12),0_0_24px_rgb(16_104_106/0.45)] active:scale-95 ${phase === "listening" ? "animate-pulse" : ""}`}
            >
              {phase === "listening" ? <span className="h-4 w-4 rounded-[4px] bg-white" /> : <IconMic size={24} />}
            </button>
            <p className="mt-1.5 text-[13px] text-ink-soft">
              {phase === "listening" ? "Tap to stop" : phase === "processing" ? "Processing…" : "Tap to retry"}
            </p>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
