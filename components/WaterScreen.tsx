"use client";

import { useCallback, useEffect, useState } from "react";
import { TwinArt, useTwin } from "@/components/art";
import { IconMinus, IconPlus } from "@/components/icons";
import { Bubble, Loading, Screen, Toggle, TopBar, Toast } from "@/components/ui";
import { useMe } from "@/components/useMe";
import { addWater, loadWaterMl, undoLastWater } from "@/lib/logs/client";
import { startOfDay } from "@/lib/meals/client";
import { saveProfile } from "@/lib/profile";
import { enablePush, hasPushSubscription } from "@/lib/push/client";
import { loadToday, saveSnapshot } from "@/lib/stats/today";

const GLASS_ML = 250;

/** The big tumbler: a tapered glass whose water rises, waves and bubbles. Tap to add a glass. */
function Tumbler({ pct, splash, onTap }: { pct: number; splash: number; onTap: () => void }) {
  const top = 18;
  const bottom = 286;
  const level = bottom - (Math.min(100, pct) / 100) * (bottom - top - 18);
  const glass = "M22 14 L238 14 L214 280 Q212 292 199 292 L61 292 Q48 292 46 280 Z";
  return (
    <button onClick={onTap} aria-label="Add a glass of water" className="relative block h-[300px] w-[260px] active:scale-[.99]">
      <svg viewBox="0 0 260 300" className="h-full w-full overflow-visible" aria-hidden>
        <defs>
          <clipPath id="tumbler-in">
            <path d="M28 18 L232 18 L209 278 Q207 287 197 287 L63 287 Q53 287 51 278 Z" />
          </clipPath>
          <linearGradient id="tumbler-water" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#5cc8f2" />
            <stop offset=".5" stopColor="#2f9ee6" />
            <stop offset="1" stopColor="#1d7fd6" />
          </linearGradient>
          <linearGradient id="tumbler-glass" x1="0" x2="1">
            <stop offset="0" stopColor="#d9f1fb" stopOpacity=".75" />
            <stop offset=".5" stopColor="#ffffff" stopOpacity=".25" />
            <stop offset="1" stopColor="#cdebf8" stopOpacity=".7" />
          </linearGradient>
        </defs>
        <ellipse cx="130" cy="296" rx="92" ry="7" fill="#7cb9d6" opacity=".18" />
        <path d={glass} fill="url(#tumbler-glass)" />
        <g clipPath="url(#tumbler-in)">
          <g style={{ transform: `translateY(${level}px)`, transition: "transform 900ms cubic-bezier(.3,1.3,.5,1)" }}>
            <g className="wave-svg">
              <path d="M-40 6 Q 0 -8 40 6 T 120 6 T 200 6 T 280 6 T 360 6 T 440 6 V 320 H -40 Z" fill="url(#tumbler-water)" />
              <path d="M-40 6 Q 0 -8 40 6 T 120 6 T 200 6 T 280 6 T 360 6 T 440 6" fill="none" stroke="#a9e4fb" strokeWidth="5" opacity=".8" />
            </g>
            {[50, 92, 140, 176, 112, 160, 70].map((x, i) => (
              <circle key={i} cx={x} cy={150 + (i % 3) * 40} r={2 + (i % 3)} fill="#d8f3ff" opacity=".8" className="animate-rise" style={{ animationDelay: `${i * 0.45}s`, transformBox: "fill-box" }} />
            ))}
          </g>
        </g>
        <path d={glass} fill="none" stroke="#a8d8ee" strokeWidth="4" strokeLinejoin="round" />
        <ellipse cx="130" cy="15" rx="108" ry="7" fill="none" stroke="#c2e6f6" strokeWidth="3" />
        <path d="M44 40 L62 262" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".55" />
        <path d="M60 40 L66 120" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".5" />
      </svg>
      {/* Droplets that hop out when a glass is added. */}
      <span key={splash} aria-hidden className="pointer-events-none absolute inset-0">
        {splash > 0 &&
          [-1, 1, -0.6, 0.6].map((d, i) => (
            <svg
              key={i}
              width="16"
              height="20"
              viewBox="0 0 16 20"
              className="absolute animate-confetti"
              style={{ left: "48%", top: `${(level / 300) * 100}%`, "--dx": `${d * 90}px`, "--dy": `${-40 - i * 12}px`, "--rot": "0deg" } as React.CSSProperties}
            >
              <path d="M8 1 C12 7 14 10 14 13 A6 6 0 0 1 2 13 C2 10 4 7 8 1Z" fill="#3aa7ea" />
            </svg>
          ))}
      </span>
    </button>
  );
}

/** Floating drops around the glass (images/…gz31…png, centre). */
function Drop({ className, size = 22 }: { className: string; size?: number }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 16 20" className={`absolute animate-float ${className}`} aria-hidden>
      <path d="M8 1 C12 7 14 10 14 13 A6 6 0 0 1 2 13 C2 10 4 7 8 1Z" fill="#55b8ef" opacity=".85" />
      <ellipse cx="5.6" cy="12.5" rx="1.4" ry="2.2" fill="#fff" opacity=".6" />
    </svg>
  );
}

/** "Paani Ka Tumbler": the day's water as a glass that fills, and the twin sipping along. */
export function WaterScreen() {
  const [me, setMe] = useMe();
  const twin = useTwin({ poses: ["drink"] });
  const [ml, setMl] = useState<number | null>(null);
  const [target, setTarget] = useState(2500);
  const [splash, setSplash] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!me) return;
    const t = await loadToday(me);
    await saveSnapshot(t, me.weight_kg);
    return t;
  }, [me]);
  const apply = useCallback((t: Awaited<ReturnType<typeof reload>>) => {
    if (!t) return;
    setMl(t.totals.waterMl);
    setTarget(t.targets.waterMl);
  }, []);

  useEffect(() => {
    reload().then(apply).catch(console.error);
  }, [reload, apply]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 3500);
    return () => clearTimeout(t);
  }, [note]);

  if (!me || ml === null) return <Loading />;

  async function add() {
    setMl((v) => (v ?? 0) + GLASS_ML);
    setSplash(Date.now());
    await addWater(GLASS_ML);
    apply(await reload());
  }

  async function undo() {
    if (!ml) return;
    setMl((v) => Math.max(0, (v ?? 0) - GLASS_ML));
    await undoLastWater(startOfDay());
    const from = startOfDay();
    setMl(await loadWaterMl(from, new Date(from.getTime() + 864e5)));
    apply(await reload());
  }

  async function reminders(on: boolean) {
    if (!me) return;
    if (on && !(await hasPushSubscription())) {
      const r = await enablePush().catch(() => "denied" as const);
      if (r !== "granted") setNote("Notifications are off — I'll remind you inside Hoppy instead.");
    }
    setMe(await saveProfile({ water_reminders: on }));
    if (on) setNote("I'll nudge you at 10:30, 12:30, 3, 5:30 and 7:30 💧");
  }

  const glasses = Math.round(ml / GLASS_ML);
  const left = Math.max(0, Math.ceil((target - ml) / GLASS_ML));
  const pct = (ml / target) * 100;
  const name = me.name?.split(" ")[0];
  const say =
    ml === 0
      ? `Namaste ${name}! Let's start with one glass 💧`
      : left > 0
        ? `Shabaash ${name}! ${left} more glass${left === 1 ? "" : "es"} to hit your target today!${pct >= 50 ? " Hydration looking good 💧" : ""}`
        : `Target done, ${name}! Fresh as nimbu paani 🍋`;

  return (
    <Screen className="overflow-hidden">
      <TopBar />
      <h1 className="-mt-2 text-center font-display text-[32px] leading-tight font-extrabold">Paani Ka Tumbler</h1>

      <div className="relative mt-3 h-[566px] shrink-0">
        <Drop className="top-6 right-10" size={24} />
        <Drop className="top-16 right-4 [animation-delay:1.2s]" size={16} />
        <Drop className="top-[150px] left-0 [animation-delay:.6s]" size={20} />
        <Drop className="top-[300px] left-6 [animation-delay:1.8s]" size={14} />
        <div className="absolute top-2 left-0 origin-top-left scale-[.95]">
          <Tumbler pct={pct} splash={splash} onTap={add} />
        </div>
        <div className="absolute left-[256px] text-left" style={{ top: `${Math.max(30, 18 + (1 - Math.min(1, pct / 100)) * 240)}px`, transition: "top 900ms" }}>
          <span className="absolute top-3 -left-7 h-[2px] w-6 bg-ink" aria-hidden />
          <span className="absolute top-[9px] -left-8 h-2.5 w-2.5 rounded-full bg-ink" aria-hidden />
          <p className="font-display text-[28px] leading-none font-extrabold" data-testid="water-total">{(Math.round(ml / 100) / 10).toFixed(1)}L</p>
          <p className="text-[14px] leading-tight text-ink-soft">
            logged of
            <br />
            {(target / 1000).toFixed(1)}L target
          </p>
        </div>
        <div className="absolute right-0 bottom-[192px] z-10 w-[200px]">
          <Bubble tail="none">
            <p className="font-display text-[15px] leading-snug font-semibold">{say}</p>
            <svg aria-hidden width="20" height="16" viewBox="0 0 20 16" className="absolute -bottom-3 left-[58%]"><path d="M0 0 C6 4 10 10 6 16 C12 10 16 4 20 0 Z" fill="#fff" /></svg>
          </Bubble>
        </div>
        <TwinArt twin={twin} pose="drink" stage={me.current_stage} className="absolute right-[-14px] bottom-[-4px] h-[200px] w-[176px] [mask-image:radial-gradient(ellipse_70%_80%_at_62%_42%,black_62%,transparent_100%)]" />
        <div className="absolute bottom-8 left-1">
          <p className="font-display text-[24px] leading-tight font-extrabold">{glasses} glass peeya aaj</p>
          <p className="text-[14px] text-ink-soft">({glasses} glass{glasses === 1 ? "" : "es"} today)</p>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3 pt-2">
        <button onClick={undo} disabled={!ml} aria-label="Remove a glass" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#5f9fa1] text-white shadow-[0_8px_18px_rgb(16_104_106/0.22)] active:scale-95 disabled:opacity-40">
          <IconMinus size={30} strokeWidth={2.6} />
        </button>
        <button onClick={add} className="flex h-16 flex-1 items-center justify-center gap-3 rounded-full bg-teal text-white shadow-teal active:scale-[.98]">
          <IconPlus size={34} strokeWidth={2.6} />
          <span className="text-left leading-none">
            <span className="block font-display text-[28px] font-bold">250ml</span>
            <span className="block text-[14px] opacity-90">(1 Glass)</span>
          </span>
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="font-display text-[17px] font-semibold">Set reminders to drink water</p>
        <Toggle on={me.water_reminders ?? false} onChange={reminders} label="Water reminders" />
      </div>
      {note && <Toast>{note}</Toast>}
    </Screen>
  );
}
