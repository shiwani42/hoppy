"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TwinArt, useTwin } from "@/components/art";
import { StatIcon } from "@/components/icons";
import { Ruler } from "@/components/QuestionScreen";
import { Sheet } from "@/components/Sheet";
import { Button, ButtonLink, Loading, ProgressBar, Screen, TopBar } from "@/components/ui";
import { useMe } from "@/components/useMe";
import { STAGE_BODIES } from "@/lib/ai/prompts";
import { saveSleep, saveWeight } from "@/lib/logs/client";
import { ENERGY_BAND, STAT_KEYS, STRONG_COUNT, STRONG_STAT, type Stat, type StatKey } from "@/lib/rules/stats";
import type { StageProgress } from "@/lib/rules/stages";
import { progressFor } from "@/lib/stages/client";
import { STAT_META } from "@/lib/stats/meta";
import { dateKey, loadToday, saveSnapshot, type Today } from "@/lib/stats/today";

const L = (ml: number) => (Math.round(ml / 100) / 10).toFixed(1);

/** "30 / 45 min" + a small line under it, per stat (images/…3rrn…png, left). */
function valueOf(s: Stat, t: Today): { now: string; of: string; note?: string } {
  switch (s.key) {
    case "strength":
      return { now: `${s.current}`, of: ` / ${s.target} min`, note: "moderate" };
    case "muscle":
      return { now: `${s.current}`, of: ` / ${s.target}g protein` };
    case "digestion":
      return { now: `${s.current}`, of: ` / ${s.target}g fiber` };
    case "hydration":
      return { now: L(s.current), of: ` / ${L(s.target ?? 0)}L water` };
    case "energy": {
      const left = (s.target ?? 0) - s.current;
      return {
        now: `${Math.round(t.totals.kcalIn)}`,
        of: ` in · ${Math.round(t.totals.kcalOut)} out`,
        note: Math.abs(left) <= ENERGY_BAND ? "(in target band)" : left > 0 ? `(${left} kcal left today)` : "(a little over — that's okay)",
      };
    }
    case "rest":
      return { now: `${s.current}`, of: ` / 8h sleep` };
  }
}

const TILE: Record<StatKey, string> = {
  strength: "bg-strength-soft",
  muscle: "bg-muscle-soft",
  digestion: "bg-digestion-soft",
  hydration: "bg-hydration-soft",
  energy: "bg-energy-soft",
  rest: "bg-rest-soft",
};

/** "Your Daily Stats": the twin, the way to the next stage, and six coloured tiles. */
export function TodayScreen() {
  const [me, setMe] = useMe();
  const twin = useTwin();
  const [today, setToday] = useState<Today | null>(null);
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [open, setOpen] = useState<StatKey | null>(null);
  const [sleep, setSleep] = useState(7);
  const [weight, setWeight] = useState(70);

  const fetchDay = useCallback(async () => {
    if (!me) return null;
    const t = await loadToday(me);
    await saveSnapshot(t, me.weight_kg);
    return { t, p: await progressFor(me) };
  }, [me]);
  const reload = useCallback(
    () =>
      fetchDay().then((r) => {
        if (!r) return;
        setToday(r.t);
        setProgress(r.p);
      }),
    [fetchDay],
  );

  useEffect(() => {
    fetchDay()
      .then((r) => {
        if (!r) return;
        setToday(r.t);
        setProgress(r.p);
      })
      .catch(console.error);
  }, [fetchDay]);

  if (!me || !today) return <Loading />;

  const stage = me.current_stage;
  const next = STAGE_BODIES[Math.min(5, stage + 1)].name;
  const pct = progress && stage < 5 ? Math.round((progress.done / progress.needed) * 100) : 100;
  const strongNow = STAT_KEYS.filter((k) => (today.stats[k].value ?? 0) >= STRONG_STAT).length;
  const s = open ? today.stats[open] : null;

  return (
    <Screen>
      <TopBar />
      <h1 className="mt-3 font-display text-[34px] leading-[1.05] font-extrabold">Your Daily Stats</h1>

      <div className="relative mx-auto mt-4 h-[200px] w-[200px]">
        <div className="absolute inset-0 rounded-full bg-peach" />
        <TwinArt twin={twin} pose="bust" stage={stage} className="absolute inset-x-1 bottom-0 h-[208px] w-[192px] [clip-path:circle(50%_at_50%_45%)]" />
      </div>

      <div className="mt-4">
        <ProgressBar value={pct} color="var(--color-ink)" track="#ebe2d1" height={12} label={`Progress to ${next}`} />
        <p className="mt-1.5 text-[15px] text-ink-soft">
          {stage >= 5 ? "You've reached Thriving — now we stay here together 🌟" : `On your way to stage “${next}” (${pct}% there!)`}
        </p>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3">
        {STAT_KEYS.map((k) => {
          const st = today.stats[k];
          const m = STAT_META[k];
          const locked = st.value === null;
          const v = valueOf(st, today);
          return (
            <li key={k}>
              <button onClick={() => setOpen(k)} className={`flex h-full w-full flex-col rounded-[18px] px-3.5 pt-3 pb-3 text-left transition active:scale-[.98] ${TILE[k]}`} data-stat={k}>
                <span className="flex items-center gap-1.5">
                  <StatIcon k={k} size={24} />
                  <span className="font-display text-[20px] font-bold">{m.label}</span>
                </span>
                <span className="mt-2 block w-full">
                  <ProgressBar value={st.value ?? 0} color={m.color} track="rgb(255 255 255 / 0.55)" height={11} label={m.label} />
                </span>
                {locked ? (
                  <span className="mt-2 text-[14px] leading-snug text-ink-soft">🔒 {m.unlock}</span>
                ) : (
                  <span className="mt-2 font-display text-[17px] leading-tight">
                    <b className="font-bold">{v.now}</b>
                    <span className="font-medium">{v.of}</span>
                    {v.note && <span className="block text-[13px] font-medium text-ink-soft">{v.note}</span>}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-center text-[14px] text-ink-soft">
        {today.strong ? "Strong day ✨ " : `${strongNow} of 6 bars at 70%+ — ${STRONG_COUNT} make a strong day. `}
        <Link href="/journey" className="font-semibold text-teal">See your journey →</Link>
      </p>

      {open && s && (
        <Sheet open onClose={() => setOpen(null)} title={STAT_META[open].label}>
          <p className="text-[16px] text-ink-soft">
            Fills from <b className="text-ink">{STAT_META[open].fills}</b>.{" "}
            {s.value === null ? STAT_META[open].unlock : `Today it's at ${s.value}%.`}
          </p>
          <div className="mt-4">
            {open === "strength" && <ButtonLink href="/move">Log exercise or yoga</ButtonLink>}
            {open === "hydration" && <ButtonLink href="/water">Open the tumbler</ButtonLink>}
            {(open === "muscle" || open === "digestion") && (
              <>
                <div className="rounded-[18px] bg-card p-4 shadow-card">
                  <p className="font-display text-[16px] font-bold">Today&apos;s weight</p>
                  <Ruler label="Today's weight" value={weight} min={35} max={160} step={0.5} format={(v) => `${v}`} onChange={setWeight} />
                </div>
                <Button
                  className="mt-3"
                  variant="soft"
                  onClick={async () => {
                    const p = await saveWeight(dateKey(), weight);
                    setMe(p);
                    setOpen(null);
                  }}
                >
                  Save weight ({weight} kg)
                </Button>
              </>
            )}
            {open === "energy" && (
              <p className="rounded-[18px] bg-card p-4 font-display text-[18px] shadow-card">
                {Math.round(today.totals.kcalIn)} kcal in · {Math.round(today.totals.kcalOut)} kcal out
                {today.targets.calories ? ` · target ${today.targets.calories} net` : ""}
              </p>
            )}
            {open === "rest" && (
              <>
                <div className="rounded-[18px] bg-card p-4 shadow-card">
                  <p className="font-display text-[16px] font-bold">Hours slept last night</p>
                  <Ruler label="Hours slept" value={sleep} min={3} max={12} step={0.5} format={(v) => `${v} h`} onChange={setSleep} />
                </div>
                <Button
                  className="mt-3"
                  onClick={async () => {
                    await saveSleep(dateKey(), sleep);
                    setOpen(null);
                    await reload();
                  }}
                >
                  Save {sleep} h sleep
                </Button>
              </>
            )}
          </div>
        </Sheet>
      )}
    </Screen>
  );
}
