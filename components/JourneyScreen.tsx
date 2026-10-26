"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URLs */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Medallion, useTwin } from "@/components/art";
import { QuestionScreen } from "@/components/QuestionScreen";
import { Sheet } from "@/components/Sheet";
import { BackButton, Button, Loading, ProgressBar } from "@/components/ui";
import { useMe } from "@/components/useMe";
import { STAGE_BODIES } from "@/lib/ai/prompts";
import { nextQuestion } from "@/lib/onboarding/nextQuestion";
import { saveProfile } from "@/lib/profile";
import { STREAK_MILESTONES, WEIGHT_STEP_KG } from "@/lib/rules/milestones";
import { MAX_STAGE, type StageProgress } from "@/lib/rules/stages";
import { goalProgress } from "@/lib/share/data";
import { progressFor } from "@/lib/stages/client";
import { loadStreak } from "@/lib/stats/streak";
import { dateKey } from "@/lib/stats/today";

const daysSince = (d: string | null) => (d ? Math.max(0, Math.round((Date.now() - new Date(`${d}T12:00:00`).getTime()) / 864e5)) : null);

/** "Your Transformation Timeline" (images/…ac9n…png, centre): the five body stages and the way to the next. */
export function JourneyScreen() {
  const [me, setMe] = useMe();
  const [asked, setAsked] = useState(false);
  const twin = useTwin({ stages: [1, 2, 3, 4, 5], poses: ["cheer"] });
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState(false);

  useEffect(() => {
    if (!me) return;
    Promise.all([progressFor(me), loadStreak()]).then(([p, s]) => {
      setProgress(p);
      setStreak(s);
    });
  }, [me]);

  if (!me || !progress) return <Loading />;

  const stage = me.current_stage;
  const next = Math.min(MAX_STAGE, stage + 1);
  const pct = stage >= MAX_STAGE ? 100 : (progress.done / progress.needed) * 100;
  const left = Math.max(0, progress.needed - progress.done);
  const weeks = Math.max(1, Math.ceil(left / 5));
  const since = daysSince(me.stage_changed_at ?? me.created_at.slice(0, 10)) ?? 0;
  const goal = goalProgress(me);
  const gap = me.start_weight_kg && me.goal_weight_kg ? Math.round((me.start_weight_kg - me.goal_weight_kg) * 10) / 10 : null;
  const order = [stage - 2, stage - 1, stage, stage + 1, stage + 2];

  const earned = [
    ...STREAK_MILESTONES.map((v) => ({ label: `${v} DAYS`, title: `${v}-day streak`, href: `/share/milestone?type=streak&value=${v}&celebrate=1`, got: Math.max(streak, me.milestones?.streak ?? 0) >= v })),
    ...[2, 3, 4, 5].map((v) => ({ label: `STAGE ${v}`, title: STAGE_BODIES[v].name, href: `/share/milestone?type=stage&value=${v}&celebrate=1`, got: stage >= v })),
    ...[1, 2, 3].map((k) => ({ label: `−${k * WEIGHT_STEP_KG} KG`, title: `${k * WEIGHT_STEP_KG} kg lighter`, href: `/share/milestone?type=weight&value=${k * WEIGHT_STEP_KG}&celebrate=1`, got: (goal?.lost ?? 0) >= k * WEIGHT_STEP_KG })),
  ];

  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-night">
      <header className="relative px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10 text-center">
        <div className="absolute top-[max(1.25rem,env(safe-area-inset-top))] left-6">
          <BackButton dark />
        </div>
        <h1 className="mx-auto mt-11 max-w-[330px] font-display text-[30px] leading-[1.12] font-extrabold text-cream">Your Transformation Timeline</h1>
        <div className="mt-3 flex items-center justify-center gap-1" aria-label={`Stage ${stage} of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className="flex items-center gap-1">
              {n > 1 && <span className={`h-[2px] w-3 rounded ${n <= stage ? "bg-gold" : "bg-[#5a5140]"}`} />}
              <span className={`h-3 w-3 rounded-full ${n <= stage ? "bg-gold shadow-[0_0_8px_rgb(201_164_92/0.7)]" : "bg-[#5a5140]"}`} />
            </span>
          ))}
        </div>
      </header>

      <section className="-mt-4 flex flex-1 flex-col rounded-t-[30px] bg-cream px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="relative -mx-6 flex h-[200px] items-end justify-center overflow-hidden">
          {order.map((n, i) => {
            const img = n >= 1 && n <= 5 ? twin?.stages[n] : undefined;
            const centre = i === 2;
            if (centre) {
              return (
                <div key={i} className="relative mx-1 flex h-[190px] w-[190px] shrink-0 items-end justify-center rounded-full p-[5px] [background:conic-gradient(from_200deg,#1d8a8a,#26a3a3_40%,#e2b04a_60%,#c9a45c_80%,#1d8a8a)] shadow-[0_0_30px_rgb(29_138_138/0.35)]">
                  <div className="relative flex h-full w-full items-end justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_35%,#1f8b8b,#0c5e60)]">
                    {img && <img src={img.url} alt={`Stage ${n}: ${STAGE_BODIES[n].name}`} className="h-[88%] object-contain" />}
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className={`flex h-[150px] w-[64px] shrink-0 items-end justify-center ${i === 0 || i === 4 ? "w-[52px]" : ""}`}>
                {img ? (
                  <img src={img.url} alt={`Stage ${n}: ${STAGE_BODIES[n].name}${n > stage ? " (ahead)" : ""}`} className={`h-full object-contain ${n > stage ? "opacity-45 grayscale-[60%]" : ""}`} />
                ) : n >= 1 && n <= 5 ? (
                  <div className="h-[120px] w-[46px] rounded-full bg-[#e9dfcd]" aria-hidden />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-center">
          <h2 className="font-display text-[22px] font-bold">Stage {stage}: {STAGE_BODIES[stage].name}</h2>
          <p className="text-[15px] text-ink-soft">• {since >= 14 ? `Sustained ${Math.floor(since / 7)} weeks` : since > 0 ? `Reached ${since} day${since === 1 ? "" : "s"} ago` : "Reached today"}</p>
        </div>

        <div className="mt-4">
          <ProgressBar value={pct} color="linear-gradient(90deg,#0f5e60,#1d8a8a 70%,#6ab3ad)" track="#ebe3d4" height={12} knob label={`Progress to ${STAGE_BODIES[next].name}`} />
          <p className="mt-2 text-center text-[14px] text-ink-soft">
            {stage >= MAX_STAGE
              ? "You're at Thriving — the top stage. Stay strong!"
              : `About ${weeks} week${weeks === 1 ? "" : "s"} left to '${STAGE_BODIES[next].name}' stage (Stage ${next})`}
            {progress.kgToGo ? ` · ${progress.kgToGo} kg to go` : ""}
          </p>
        </div>

        <div className="mt-4 rounded-[18px] border-2 border-[#e6d4a8] bg-[#fffaf0] px-5 py-3.5 shadow-[0_6px_18px_rgb(150_110_40/0.1)]">
          <h3 className="text-center font-display text-[20px] font-bold">Today&apos;s Milestones</h3>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[15px]">
            <dt className="flex items-center gap-2 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-gold" />Goal Target:</dt>
            <dd className="font-semibold">{goal && gap ? `−${goal.lost} kg out of ${gap} kg lost` : <Link href="/" className="text-teal">Set a goal weight</Link>}</dd>
            <dt className="flex items-center gap-2 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-gold" />Streak:</dt>
            <dd className="font-semibold">{streak} Days Active 🔥</dd>
            <dt className="flex items-center gap-2 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-gold" />Strong days:</dt>
            <dd className="font-semibold">{progress.done} of {progress.needed} toward the next stage</dd>
          </dl>
        </div>

        <Button variant="gold" className="mt-4 rounded-full" onClick={() => setBadges(true)}>
          + View Badges &amp; Journey
        </Button>
        <Link href="/" className="mt-auto pt-4 text-center font-display text-[18px] leading-tight font-semibold">
          Aage Badhein
          <span className="block text-[14px] font-medium text-ink-soft">(Proceed)</span>
        </Link>
      </section>

      {/* Seeing the stages is when the goal weight matters (lib/onboarding/nextQuestion.ts). */}
      {!asked && nextQuestion(me, "stages_shown")?.id === "goal" && me.asked?.goal !== dateKey() && (
        <QuestionScreen
          q="goal"
          twin={twin}
          stage={stage}
          weightKg={me.weight_kg}
          onAnswer={async (a) => {
            setMe(await saveProfile({ goal_weight_kg: a.goal_weight_kg, ...(!me.start_weight_kg ? { start_weight_kg: me.weight_kg } : {}) }));
            setAsked(true);
          }}
          onLater={async () => {
            setMe(await saveProfile({ asked: { ...me.asked, goal: dateKey() } }));
            setAsked(true);
          }}
        />
      )}
      {badges && (
        <Sheet open onClose={() => setBadges(false)} title="Your badges">
          <ul className="grid grid-cols-3 gap-3">
            {earned.map((b) => (
              <li key={b.label} className="text-center">
                {b.got ? (
                  <Link href={b.href} className="block">
                    <Medallion label={b.label} imageUrl={twin?.poses.cheer?.url ?? twin?.poses.bust?.url} size={96} />
                    <p className="mt-1 font-display text-[14px] leading-tight font-semibold">{b.title}</p>
                  </Link>
                ) : (
                  <div className="opacity-40 grayscale">
                    <Medallion label={b.label} size={96} />
                    <p className="mt-1 font-display text-[14px] leading-tight font-semibold">{b.title}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-[14px] text-ink-soft">Earned badges open a card you can share.</p>
        </Sheet>
      )}
    </main>
  );
}
