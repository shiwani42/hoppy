"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Confetti, Medallion, ensureTwinArt, loadTwin, type Twin } from "@/components/art";
import { IconArrowUpRight, IconShare } from "@/components/icons";
import { ShareCard, type ShareCardData } from "@/components/ShareCard";
import { Button, ButtonLink, Card, Loading, Screen, TopBar } from "@/components/ui";
import { useMe } from "@/components/useMe";
import { STAGE_BODIES } from "@/lib/ai/prompts";
import { recordCard, renderCard, shareOrDownload } from "@/lib/share/client";
import { milestoneCard, todayCard } from "@/lib/share/data";
import { progressFor } from "@/lib/stages/client";
import { loadStreak } from "@/lib/stats/streak";
import { dateKey, loadToday } from "@/lib/stats/today";
import { supabase } from "@/lib/supabase/client";

type Week = { active: number; workouts: number; waterL: number };

/** The last 7 days for the badge's "sharing-ready preview". */
async function loadWeek(): Promise<Week> {
  const sb = supabase();
  const since = new Date(Date.now() - 6 * 864e5);
  since.setHours(0, 0, 0, 0);
  const [meals, acts, water] = await Promise.all([
    sb.from("meals").select("eaten_at").gte("eaten_at", since.toISOString()),
    sb.from("activities").select("id", { count: "exact", head: true }).gte("done_at", since.toISOString()),
    sb.from("water_logs").select("ml").gte("at", since.toISOString()),
  ]);
  return {
    active: new Set((meals.data ?? []).map((m) => dateKey(new Date(m.eaten_at)))).size,
    workouts: acts.count ?? 0,
    waterL: Math.round((water.data ?? []).reduce((s, w) => s + w.ml, 0) / 1000),
  };
}

const COPY = {
  streak: (v: number) => ({ title: `${v}-Day Streak!`, badge: `${v} DAYS ACTIVE`, heading: `Aapka ${v}-Day Consistency Badge! 🎉`, body: `Shabaash! You've logged every single day for ${v} days. Your twin is looking strong — and so are your habits!` }),
  stage: (v: number) => ({ title: `Stage ${v} Unlocked!`, badge: `STAGE ${v}`, heading: `Welcome to “${STAGE_BODIES[v].name}”! 🎉`, body: "Weeks of strong days, made visible. Your twin moves up a stage — and stages only ever go forward." }),
  weight: (v: number) => ({ title: `${v} kg Lighter!`, badge: `−${v} KG`, heading: "Steady, safe progress! 🎉", body: `That's ${v} kg down at a healthy pace. One plate, one walk, one glass at a time.` }),
} as const;

/** Milestone celebration (images/…5ben…png, right) and the share card (images/…3rrn…png, right). */
export function ShareScreen({ kind }: { kind: "today" | "milestone" }) {
  const search = useSearchParams();
  const mType = search.get("type");
  const mValue = Number(search.get("value"));
  const valid = kind === "milestone" && (mType === "stage" || mType === "weight" || mType === "streak") && mValue > 0;
  const [me] = useMe();
  const card = useRef<HTMLDivElement>(null);
  const [twin, setTwin] = useState<Twin | null>(null);
  const [data, setData] = useState<ShareCardData | null>(null);
  const [week, setWeek] = useState<Week | null>(null);
  const [view, setView] = useState<"celebrate" | "card">(valid && search.get("celebrate") ? "celebrate" : "card");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me) return;
    (async () => {
      const [t, tw, prog, days, wk] = await Promise.all([loadToday(me), loadTwin(), progressFor(me), loadStreak(), loadWeek()]);
      setTwin(tw);
      setWeek(wk);
      // The card shows Day 1 and today's stage; the badge shows the cheering pose.
      ensureTwinArt(tw, { stages: [1, me.current_stage], poses: ["cheer"] })
        .then((fresh) => {
          if (!fresh) return;
          setTwin(fresh);
          setData(valid ? milestoneCard(me, fresh.stages, mType as "stage", mValue, days) : todayCard(me, t, fresh.stages, prog, days));
        })
        .catch(console.error);
      setData(valid ? milestoneCard(me, tw.stages, mType as "stage", mValue, days) : todayCard(me, t, tw.stages, prog, days));
    })().catch(console.error);
  }, [me, valid, mType, mValue]);

  if (!me || !data || !week) return <Loading label="Drawing your card…" />;

  async function go() {
    if (!card.current || !data) return;
    setBusy(true);
    setStatus(null);
    try {
      const blob = await renderCard(card.current);
      await recordCard(blob, kind, data.subtitle);
      const how = await shareOrDownload(blob, `hoppy-${kind}.png`, `${data.subtitle} on Hoppy 💪`);
      setStatus(how === "shared" ? "Shared! 🎉" : how === "downloaded" ? "Saved to your downloads" : null);
    } catch (err) {
      console.error(err);
      setStatus("Couldn't make the image. Try again?");
    } finally {
      setBusy(false);
    }
  }

  if (view === "celebrate" && valid) {
    const c = COPY[mType as keyof typeof COPY](mValue);
    const img = twin?.poses.cheer?.url ?? twin?.poses.bust?.url ?? twin?.stages[me.current_stage]?.url;
    return (
      <Screen className="relative overflow-hidden">
        <Confetti burst={1} count={40} spread={220} />
        <Confetti still count={22} spread={190} />
        <TopBar backHref="/" />
        <h1 className="relative -mt-3 text-center font-display text-[36px] leading-tight font-extrabold">{c.title}</h1>
        <Card className="relative mt-5 flex flex-1 flex-col items-center px-5 pt-5 pb-5 text-center">
          <h2 className="font-display text-[24px] leading-tight font-bold">{c.heading}</h2>
          <div className="relative mt-3 animate-pop">
            <span aria-hidden className="absolute top-1/2 -left-9 text-[28px] text-[#e7b84f]">✣</span>
            <span aria-hidden className="absolute top-1/2 -right-9 text-[28px] text-[#e7b84f]">✣</span>
            <Medallion label={c.badge} imageUrl={img} crop={!twin?.poses.cheer && !twin?.poses.bust} size={230} />
          </div>
          <p className="mt-3 text-[16px] leading-snug">{c.body}</p>
          <div className="mt-4 w-full rounded-[16px] border border-[#efe6d6] bg-card px-3 py-3 shadow-card">
            <p className="text-left font-display text-[17px] font-bold">Sharing-ready preview</p>
            <dl className="mt-2 grid grid-cols-3 divide-x divide-[#efe6d6] text-center">
              <div><dt className="text-[13px] text-ink-soft">Days Active</dt><dd className="font-display text-[17px] font-bold">{week.active} / 7</dd></div>
              <div><dt className="text-[13px] text-ink-soft">Workouts</dt><dd className="font-display text-[17px] font-bold">{week.workouts} Completed</dd></div>
              <div><dt className="text-[13px] text-ink-soft">Total Water</dt><dd className="font-display text-[17px] font-bold">{week.waterL} Liters</dd></div>
            </dl>
          </div>
        </Card>
        <div className="relative mt-4">
          <Button onClick={() => setView("card")}>
            Show off on Share Screen <IconArrowUpRight size={22} />
          </Button>
          <ButtonLink href="/" variant="ghost" className="mt-1">Back to Home</ButtonLink>
        </div>
      </Screen>
    );
  }

  return (
    <Screen className="items-center">
      <div className="w-full"><TopBar /></div>
      <div className="mt-2 overflow-hidden rounded-[26px] shadow-lift" style={{ width: 324, height: 576 }}>
        <div style={{ transform: "scale(0.9)", transformOrigin: "top left" }}>
          <ShareCard ref={card} d={data} />
        </div>
      </div>
      {status && <p role="status" className="mt-3 text-ink-soft">{status}</p>}
      <div className="w-full pt-6">
        <Button variant="aqua" className="rounded-[18px]" onClick={go} disabled={busy}>
          {busy ? "Drawing…" : "Share to Friends"} <IconShare size={22} />
        </Button>
        <p className="mt-2 text-center text-[13px] text-ink-soft">Instagram Stories, WhatsApp, X — or save the image.</p>
      </div>
    </Screen>
  );
}
