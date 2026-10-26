"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { TwinArt, useTwin } from "@/components/art";
import { IconPlus, IconSearch } from "@/components/icons";
import { Button, Chip, Loading, Screen, TopBar } from "@/components/ui";
import { useMe } from "@/components/useMe";
import { saveActivity } from "@/lib/logs/client";
import { ACTIVITIES, activeMinutes, activityByKey, kcalBurned, MINUTES_PER_SURYA_ROUND, type Activity } from "@/lib/rules/activity";
import { loadToday, saveSnapshot } from "@/lib/stats/today";

/** Popular picks in the carousel, in order. */
const FEATURED = ["surya-namaskar", "walk-brisk", "hatha-yoga", "cycling-easy", "dancing", "weights-moderate"];
const YOGA = new Set(["surya-namaskar", "hatha-yoga", "power-yoga", "pranayama", "stretching", "pilates", "plank", "calisthenics"]);
const WALKS = new Set(["walk-slow", "walk-brisk", "treadmill-walk", "jogging", "running", "stairs", "elliptical", "cricket", "badminton", "football", "tennis"]);

/** Easy / Moderate / Hard scales the activity's MET (the Compendium value is "moderate"). */
const EFFORT = { easy: 0.8, moderate: 1, hard: 1.25 } as const;
type Effort = keyof typeof EFFORT;

const label = (a: Activity) => (a.key === "surya-namaskar" ? "Surya Namaskar" : a.label);

/** "Aapka Vyayaam" (images/…ac9n…png, left): pick a workout, how long and how hard. */
export function MoveScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const [me] = useMe();
  const twin = useTwin({ poses: ["stretch", "walk"] });
  const initial = activityByKey(search.get("a") ?? "") ?? activityByKey("surya-namaskar")!;
  const [act, setAct] = useState<Activity>(initial);
  const [q, setQ] = useState(search.get("a") ? label(initial) : "");
  const [typing, setTyping] = useState(false);
  const [minutes, setMinutes] = useState(Number(search.get("m")) || (initial.key === "surya-namaskar" ? Math.round(12 * MINUTES_PER_SURYA_ROUND) : 30));
  const [effort, setEffort] = useState<Effort>("moderate");
  const [saving, setSaving] = useState(false);
  const rail = useRef<HTMLDivElement>(null);

  const cards = useMemo(() => [act.key, ...FEATURED.filter((k) => k !== act.key)].map((k) => activityByKey(k)!).slice(0, 6), [act.key]);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!typing || !s) return [];
    return ACTIVITIES.filter((a) => a.label.toLowerCase().includes(s) || a.aliases.some((x) => x.includes(s))).slice(0, 6);
  }, [q, typing]);

  useEffect(() => rail.current?.scrollTo({ left: 0, behavior: "smooth" }), [act.key]);

  if (!me) return <Loading />;

  const met = act.met * EFFORT[effort];
  const kcal = kcalBurned(met, minutes, me.weight_kg);
  const strengthPct = Math.min(100, Math.round((activeMinutes(met, minutes) / 30) * 100));
  const durations: [number, string][] =
    act.key === "surya-namaskar"
      ? [[20, "20 Mins"], [Math.round(12 * MINUTES_PER_SURYA_ROUND), `12 Rounds (~${Math.round(12 * MINUTES_PER_SURYA_ROUND)}m)`], [45, "45 Mins"]]
      : [[15, "15 Mins"], [30, "30 Mins"], [45, "45 Mins"], [60, "1 Hour"]];
  if (!durations.some(([m]) => m === minutes)) durations.splice(1, 0, [minutes, `${minutes} Mins`]);

  function pick(a: Activity) {
    setAct(a);
    setQ(label(a));
    setTyping(false);
    if (a.key === "surya-namaskar") setMinutes(Math.round(12 * MINUTES_PER_SURYA_ROUND));
  }

  async function add() {
    if (!me) return;
    setSaving(true);
    try {
      await saveActivity({ key: act.key, label: act.label, emoji: act.emoji, met, minutes }, me.weight_kg, search.get("a") ? "text" : "manual");
      const t = await loadToday(me);
      await saveSnapshot(t, me.weight_kg);
      router.push("/?moved=1");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <TopBar right={<button onClick={() => document.getElementById("what")?.focus()} aria-label="Search workouts" className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card"><IconSearch size={20} /></button>} />
      <header className="-mt-8 text-center">
        <h1 className="font-display text-[30px] leading-tight font-extrabold">Aapka Vyayaam</h1>
        <p className="text-[16px] text-ink-soft">(Log Exercise)</p>
      </header>

      <div className="relative mt-4 rounded-[20px] bg-card px-4 pt-3 pb-2 shadow-card">
        <label htmlFor="what" className="font-display text-[18px] font-semibold">What did you do?</label>
        <input
          id="what"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setTyping(true);
          }}
          onFocus={() => setTyping(true)}
          placeholder="Surya Namaskar, walk, cycling…"
          className="h-11 w-full border-b-2 border-teal bg-transparent font-display text-[22px] outline-none placeholder:text-[18px] placeholder:text-ink-faint"
        />
        {results.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-[16px] bg-card shadow-lift">
            {results.map((a) => (
              <li key={a.key}>
                <button onClick={() => pick(a)} className="flex w-full items-center gap-3 border-b border-[#f3ecdf] px-4 py-3 text-left font-display text-[17px] font-semibold last:border-0 active:bg-cream">
                  <span aria-hidden>{a.emoji}</span> {label(a)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div ref={rail} className="no-scrollbar -mx-6 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6" aria-label="Popular workouts">
        {cards.map((a, i) => (
          <button
            key={a.key}
            onClick={() => pick(a)}
            className={`relative flex h-[218px] w-[300px] shrink-0 snap-center flex-col items-center justify-end overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#f5ece0,#efe2cf)] pb-3 shadow-card ${i === 0 ? "" : "opacity-80"}`}
            aria-pressed={i === 0}
          >
            <TwinArt twin={twin} pose={YOGA.has(a.key) ? "stretch" : WALKS.has(a.key) ? "walk" : "stage"} stage={me.current_stage} className="h-[160px] w-[220px]" />
            <span className="mt-1 font-display text-[18px] font-bold">{i === 0 ? `Interactive ${label(a)}` : label(a)}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
        {cards.map((a, i) => <span key={a.key} className={`h-1.5 rounded-full ${i === 0 ? "w-4 bg-ink" : "w-1.5 bg-[#d8cdb9]"}`} />)}
      </div>

      <div className="no-scrollbar -mx-6 mt-3 flex gap-2 overflow-x-auto px-6" role="group" aria-label="How long">
        {durations.map(([m, text]) => (
          <Chip key={text} tone="gold" selected={minutes === m} onClick={() => setMinutes(m)} className={minutes === m ? "" : "!border-transparent !bg-[#efe6d6]"}>
            {text}
          </Chip>
        ))}
      </div>

      <div className="mt-3 flex gap-2" role="group" aria-label="How hard">
        {(["easy", "moderate", "hard"] as Effort[]).map((e) => (
          <Chip
            key={e}
            selected={effort === e}
            tone={e === "hard" ? "rose" : "teal"}
            onClick={() => setEffort(e)}
            className={`flex-1 capitalize ${effort !== e ? (e === "hard" ? "!border-transparent !bg-[#f8dcdc] !text-[#8c2f2f]" : "!border-transparent !bg-[#ebe3d3]") : ""}`}
          >
            {e}
          </Chip>
        ))}
      </div>

      <div className="mt-4 rounded-[20px] bg-card px-4 py-3 shadow-card">
        <p className="font-display text-[19px] font-bold">Daily Energy &amp; Strength Reward</p>
        <p className="text-[15px] text-ink-soft">
          Est. Calories: <b className="text-ink">~{kcal} kcal</b> 🔥 | Strength <b className="text-ink">+{strengthPct}%</b>
        </p>
      </div>

      <div className="mt-auto pt-5">
        <Button onClick={add} disabled={saving || minutes <= 0}>
          <IconPlus size={22} strokeWidth={2.6} /> {saving ? "Adding…" : "Add to Today's Movement"}
        </Button>
      </div>
    </Screen>
  );
}
