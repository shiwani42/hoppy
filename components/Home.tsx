"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppMenu } from "@/components/AppMenu";
import { Confetti, Medallion, TwinArt, ensureTwinArt, loadTwin, type Twin } from "@/components/art";
import { ChatOverlay } from "@/components/ChatOverlay";
import { FoodSticker } from "@/components/art";
import { IconCalendar, IconCamera, IconChat, IconMic } from "@/components/icons";
import { MealConfirm } from "@/components/MealConfirm";
import { ASK, QuestionScreen, type DripAnswer } from "@/components/QuestionScreen";
import { Ring, Toast } from "@/components/ui";
import { VoiceLog, type VoiceResult } from "@/components/VoiceLog";
import { STAGE_BODIES } from "@/lib/ai/prompts";
import { askHoppy, loadChat, saveNudge, type ChatMsg } from "@/lib/chat/client";
import { acceptInvite, loadNewCheers, markCheersSeen, PENDING_INVITE, type Cheer } from "@/lib/community/client";
import { MEAL_REMINDERS, NOT_FOOD, NUDGES, nudgeKeyOf, pick } from "@/lib/copy/voice";
import { resizeImage } from "@/lib/image";
import { addWater, saveActivity, saveSleep, saveWeight } from "@/lib/logs/client";
import {
  deleteMeal, mealTotals, saveMeal, setMealReply, startOfDay, streamMealReply, toEditable, updateMeal,
  type SavedMeal,
} from "@/lib/meals/client";
import { mealTypeFor, type MealAnalysis, type MealItem, type MealType } from "@/lib/meals/types";
import { nextQuestion, type DripEvent, type Question } from "@/lib/onboarding/nextQuestion";
import { isQuestion, type Parsed } from "@/lib/parse/text";
import { loadProfile, saveProfile, type Profile } from "@/lib/profile";
import { hasPushSubscription } from "@/lib/push/client";
import { loadReminders, missedMeal } from "@/lib/reminders/client";
import { dueMilestone, type Milestone } from "@/lib/rules/milestones";
import { nudgeFor } from "@/lib/rules/nudges";
import { goalProgress } from "@/lib/share/data";
import { mealArt } from "@/lib/art";
import { activityByKey } from "@/lib/rules/activity";
import { progressFor, stageUp } from "@/lib/stages/client";
import { loadStreak } from "@/lib/stats/streak";
import { dateKey, loadToday, saveSnapshot, type Today } from "@/lib/stats/today";
import { api, apiJson, ensureSession, supabase } from "@/lib/supabase/client";

type Draft = {
  key: number;
  items: MealItem[];
  type: MealType;
  source: SavedMeal["source"];
  photo_path?: string;
  previewUrl?: string;
  demo?: boolean;
  transcript?: string;
  editing?: SavedMeal;
  /** Water and a workout spoken in the same breath, saved with the meal. */
  extra?: Pick<VoiceResult, "activity" | "waterMl">;
};

/**
 * Home (images/Gemini_Generated_Image_q65k…png): "Namaste, Suresh!", the twin
 * with today's stage, and the day as a chat — snap, speak or type to log.
 */
export function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [twin, setTwin] = useState<Twin | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [reminder, setReminder] = useState<keyof typeof MEAL_REMINDERS | null>(null);
  const [snoozed, setSnoozed] = useState<{ id: string; body: string; url: string }[]>([]);
  const [today, setToday] = useState<Today | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [asking, setAsking] = useState(false);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [voice, setVoice] = useState(false);
  const [serverVoice, setServerVoice] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [cheers, setCheers] = useState<Cheer[]>([]);
  const [pending, setPending] = useState<{ q: string; a: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [camMenu, setCamMenu] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  const nudging = useRef(false);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const meals = today?.meals ?? [];

  /** Recomputes today's stats from the logs and stores the day's snapshot. */
  const refresh = useCallback(async (p: Profile) => {
    const t = await loadToday(p);
    setToday(t);
    await saveSnapshot(t, p.weight_kg);
    const from = startOfDay();
    const to = new Date(from.getTime() + 864e5);
    let msgs = await loadChat(from, to);
    // The twin speaks up when a stat is low (lib/rules/nudges.ts). Overlapping
    // refreshes take turns and re-check fresh history first. On the signup day,
    // stay quiet until the first log: the empty state already invites one.
    const firstDay = dateKey(new Date(p.created_at)) === t.date;
    const anyLog = t.meals.length + t.activities.length > 0 || t.totals.waterMl > 0;
    if (!nudging.current && (!firstDay || anyLog)) {
      nudging.current = true;
      try {
        msgs = await loadChat(from, to);
        const past = msgs.filter((m) => m.kind === "nudge").map((m) => ({ at: new Date(m.created_at), key: nudgeKeyOf(m.content) }));
        const due = nudgeFor(t.stats, new Date(), past);
        if (due) {
          await saveNudge(pick(NUDGES[due]));
          msgs = await loadChat(from, to);
        }
      } finally {
        nudging.current = false;
      }
    }
    setChat(msgs);
    return t;
  }, []);

  const maybeAsk = useCallback((p: Profile, event: DripEvent, t?: Today) => {
    const q = nextQuestion(p, event, { sleepLoggedToday: t ? t.totals.sleepHours != null : undefined });
    if (q && p.asked?.[q.id] !== dateKey()) setQuestion(q);
    return !!q;
  }, []);

  const react = () => setBurst(Date.now());

  /** After each log: stage-up check, then the streak and any milestone worth a card. */
  const checkStage = useCallback(
    async (p: Profile) => {
      const prog = await progressFor(p);
      const days = await loadStreak();
      setStreakDays(days);
      if (prog.canStageUp) {
        const up = await stageUp(p);
        // The celebration screen offers the stage card, so mark it as offered.
        const marked = await saveProfile({ milestones: { ...up.milestones, stage: up.current_stage } });
        setProfile(marked);
        router.push(`/share/milestone?type=stage&value=${marked.current_stage}&celebrate=1`);
        return marked;
      }
      setMilestone(dueMilestone({ stage: p.current_stage, kgLost: goalProgress(p)?.lost ?? null, streak: days }, p.milestones ?? {}));
      return p;
    },
    [router],
  );

  /** In-app reminder: from a tapped notification (/?log=lunch), or a passed reminder when push is off. */
  async function showReminder(t: Today) {
    const logged = new Set(t.meals.map((m) => m.meal_type));
    const fromLink = new URLSearchParams(window.location.search).get("log");
    if (fromLink && fromLink in MEAL_REMINDERS && !logged.has(fromLink as MealType)) {
      setReminder(fromLink as keyof typeof MEAL_REMINDERS);
      window.history.replaceState(null, "", "/");
      return;
    }
    if (await hasPushSubscription()) return;
    // "Remind me in 15 min" without push: show it here once it's due.
    const { data: due } = await supabase().from("snoozes").select("id, body, url").eq("sent", false).lte("remind_at", new Date().toISOString());
    if (due?.length) {
      setSnoozed(due);
      await supabase().from("snoozes").update({ sent: true }).in("id", due.map((d) => d.id));
    }
    const now = new Date();
    const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const missed = missedMeal(await loadReminders(), hm, logged);
    let dismissed = false;
    try {
      dismissed = !!missed && sessionStorage.getItem(`hoppy:dismissed:${t.date}:${missed.meal_type}`) === "1";
    } catch {}
    if (missed && !dismissed) setReminder(missed.meal_type);
  }

  function dismissReminder() {
    if (reminder && today) {
      try {
        sessionStorage.setItem(`hoppy:dismissed:${today.date}:${reminder}`, "1");
      } catch {}
    }
    setReminder(null);
  }

  async function markMilestone(m: Milestone) {
    if (!profile) return;
    setProfile(await saveProfile({ milestones: { ...profile.milestones, [m.type]: m.value } }));
    setMilestone(null);
  }

  useEffect(() => {
    (async () => {
      await ensureSession();
      const p = await loadProfile();
      const tw = await loadTwin();
      if (!p?.name || !p.selfie_path) {
        router.replace("/onboarding");
        return;
      }
      setProfile(p);
      setTwin(tw);
      // Right after onboarding the twin is still being made in the background: show the
      // selfie meanwhile, check every few seconds, and celebrate when it arrives.
      if (!tw.poses.bust && !tw.stages[1]) {
        const { data } = await supabase().storage.from("selfies").createSignedUrl(p.selfie_path, 3600);
        setSelfieUrl(data?.signedUrl ?? null);
        let tries = 0;
        const poll = setInterval(async () => {
          const fresh = await loadTwin(true);
          if (fresh.poses.bust || fresh.stages[1] || ++tries > 40) {
            clearInterval(poll);
            setTwin(fresh);
            if (fresh.poses.bust || fresh.stages[1]) setBurst(Date.now());
          }
        }, 5000);
      } else if (!tw.stages[1]) setTimeout(async () => setTwin(await loadTwin(true)), 30000);
      const t = await refresh(p);
      await checkStage(p);
      if (!maybeAsk(p, "app_open")) maybeAsk(p, "morning", t);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && p.timezone !== tz) setProfile(await saveProfile({ timezone: tz }));
      await showReminder(t);
      loadNewCheers().then(setCheers).catch(() => {});
      // An invite link opened before onboarding is accepted now (prd.md > Community).
      let invite: string | null = null;
      try {
        invite = localStorage.getItem(PENDING_INVITE);
        if (invite) localStorage.removeItem(PENDING_INVITE);
      } catch {}
      if (invite) {
        acceptInvite(invite)
          .then((name) => setToast(`You and ${name ?? "your friend"} are now Hoppy friends 🤝`))
          .catch((err: Error) => setToast(err.message));
      }
      fetch("/api/capabilities").then((r) => r.json()).then((c) => setServerVoice(!!c.gemini)).catch(() => {});
    })().catch(console.error);
  }, [router, refresh, maybeAsk, checkStage]);

  // Cheers show once: mark them seen a moment after they appear.
  useEffect(() => {
    if (!cheers.length) return;
    const t = setTimeout(() => markCheersSeen(cheers.map((c) => c.id)), 4000);
    return () => clearTimeout(t);
  }, [cheers]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);


  async function onPhoto(file: File | Blob, sample = false) {
    setReading(true);
    try {
      const small = await resizeImage(file as File);
      const form = new FormData();
      form.append("photo", small, "meal.jpg");
      if (sample) form.append("sample", "1");
      const res = await api("/api/meal/photo", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setToast(json.error ?? "That didn't work.");
        setDraft({ key: Date.now(), items: [], type: mealTypeFor(), source: "manual" });
        return;
      }
      const analysis = json as MealAnalysis & { photo_path: string };
      if (!analysis.is_food) {
        setToast(NOT_FOOD);
        return;
      }
      setDraft({
        key: Date.now(),
        items: analysis.items,
        type: mealTypeFor(),
        source: "photo",
        photo_path: analysis.photo_path,
        previewUrl: URL.createObjectURL(small),
        demo: analysis.demo,
      });
    } catch (err) {
      console.error(err);
      setToast("Couldn't read that photo. Try again or search for your dish.");
    } finally {
      setReading(false);
    }
  }

  async function sampleMeal() {
    setCamMenu(false);
    const blob = await (await fetch("/art/sample-meal.jpg")).blob();
    await onPhoto(new File([blob], "sample-meal.jpg", { type: "image/jpeg" }), true);
  }

  async function saveExtras(extra?: Draft["extra"], source: "text" | "voice" = "voice") {
    if (!profile || !extra) return;
    if (extra.activity) await saveActivity(extra.activity, profile.weight_kg, source);
    if (extra.waterMl) await addWater(extra.waterMl);
  }

  async function confirm(items: MealItem[], type: MealType) {
    if (!draft || !profile) return;
    if (draft.editing) {
      await updateMeal(draft.editing.id, type, items);
      setDraft(null);
      await refresh(profile);
      react();
      return;
    }
    const meal = await saveMeal({ meal_type: type, source: draft.source, photo_path: draft.photo_path, is_demo: draft.demo, items });
    await saveExtras(draft.extra);
    if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    setDraft(null);
    await afterMeal(meal, items);
  }

  async function afterMeal(meal: SavedMeal, items: MealItem[]) {
    if (!profile) return;
    await refresh(profile);
    await checkStage(profile);
    react();
    maybeAsk(profile, "meal_logged");
    const reply = await streamMealReply(
      items.map(({ name, quantity, unit }) => ({ name, quantity, unit })),
      mealTotals(meal),
      profile?.name ?? undefined,
      (soFar) => setReplies((r) => ({ ...r, [meal.id]: soFar })),
    );
    if (reply) await setMealReply(meal.id, reply);
  }

  async function answerQuestion(a: DripAnswer) {
    if (!profile) return;
    const { sleep_hours, ...fields } = a;
    if (sleep_hours != null) await saveSleep(dateKey(), sleep_hours);
    let p = profile;
    if (fields.weight_kg) p = await saveWeight(dateKey(), fields.weight_kg);
    // The weight when the goal is set is where the journey starts.
    if (fields.goal_weight_kg && !p.start_weight_kg) Object.assign(fields, { start_weight_kg: p.weight_kg });
    if (Object.keys(fields).length) p = await saveProfile(fields);
    setProfile(p);
    setQuestion(null);
    setAsking(false);
    await refresh(p);
    await checkStage(p);
    react();
  }

  async function skipQuestion() {
    if (!profile || !question) return;
    setProfile(await saveProfile({ asked: { ...profile.asked, [question.id]: dateKey() } }));
    setQuestion(null);
    setAsking(false);
  }

  async function ask(q: string) {
    if (!profile) return;
    setPending({ q, a: "" });
    try {
      const res = await askHoppy(q, startOfDay(), dateKey(), (a) => setPending({ q, a }));
      const from = startOfDay();
      setChat(await loadChat(from, new Date(from.getTime() + 864e5)));
      if (res.suggestsFood) maybeAsk(profile, "food_suggested");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setPending(null);
    }
  }

  /** Typed logs: meals confirm first; water is saved at once; workouts open the exercise screen. */
  async function onText(t: string) {
    if (!profile) return;
    try {
      if (isQuestion(t)) return await ask(t);
      const r = await apiJson<Parsed>("/api/log/text", { text: t });
      if (r.kind === "unknown") return await ask(t);
      if (r.kind === "water") {
        await addWater(r.waterMl);
        await refresh(profile);
        react();
        setToast(`💧 ${r.waterMl} ml added — your tumbler is filling up`);
        return;
      }
      if (r.kind === "activity" && !r.items?.length) {
        if (r.waterMl) await addWater(r.waterMl);
        const q = new URLSearchParams({ a: r.activity.key, ...(r.activity.minutes ? { m: String(r.activity.minutes) } : {}) });
        router.push(`/move?${q}`);
        return;
      }
      const items = r.kind === "meal" ? r.items : (r.items ?? []);
      const activity = r.kind === "activity" ? { ...r.activity, minutes: r.activity.minutes ?? 30 } : null;
      setDraft({ key: Date.now(), items, type: mealTypeFor(), source: "manual", transcript: t, extra: { activity, waterMl: r.waterMl ?? 0 } });
      if (r.kind === "meal" && r.unknown.length) setToast(`I couldn't place "${r.unknown.join(", ")}" — add it with “Add something else”.`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "That didn't work.");
    }
  }

  async function onVoiceConfirm(r: VoiceResult) {
    if (!profile) return;
    await saveExtras({ activity: r.activity, waterMl: r.waterMl });
    setVoice(false);
    if (r.items.length) {
      const meal = await saveMeal({ meal_type: mealTypeFor(), source: "voice", items: r.items });
      await afterMeal(meal, r.items);
    } else {
      await refresh(profile);
      await checkStage(profile);
      react();
    }
  }

  if (!profile) {
    return <main className="flex flex-1 items-center justify-center font-display text-xl text-ink-soft">Hoppy…</main>;
  }

  const stage = profile.current_stage;
  const firstName = profile.name?.split(" ")[0] ?? "";
  const waterMl = today?.totals.waterMl ?? 0;
  const waterTarget = today?.targets.waterMl || 2500;
  const waterPct = Math.min(100, (waterMl / waterTarget) * 100);
  const lastMeal = meals.at(-1);
  const nudge = [...chat].reverse().find((c) => c.kind === "nudge");
  const openReminder = reminder && !meals.some((m) => m.meal_type === reminder) ? reminder : null;

  // The twin says one thing at a time, most timely first.
  const line: { text: React.ReactNode; onClick?: () => void; action?: React.ReactNode; testid?: string } | null = reading
    ? { text: <span className="animate-pulse">Reading your plate…</span> }
    : lastMeal && replies[lastMeal.id]
      ? { text: replies[lastMeal.id] }
      : openReminder
          ? { text: MEAL_REMINDERS[openReminder], testid: "reminder", action: <button onClick={dismissReminder} className="font-normal text-ink-soft">(Dismiss)</button> }
          : snoozed[0]
            ? { text: snoozed[0].body, onClick: () => router.push(snoozed[0].url), action: <span className="font-normal text-teal">(Open)</span> }
            : cheers[0]
              ? { text: <>👏 <b>{cheers[0].name ?? "A friend"}</b> sent you a Shabaash! Keep going.</> }
              : nudge
                ? { text: nudge.content }
                : lastMeal?.reply
                  ? { text: lastMeal.reply }
                  : meals.length === 0
                    ? { text: `What did you last eat, ${firstName}? Snap it or tell me 🍽️` }
                    : null;

  const kcalTarget = today?.targets.calories ?? null;
  const proteinTarget = today?.targets.proteinG ?? null;
  const kcalIn = Math.round(today?.totals.kcalIn ?? 0);
  const protein = Math.round(today?.totals.proteinG ?? 0);

  return (
    <main className="relative flex min-h-dvh flex-col pb-[150px]">
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden data-testid="meal-photo-input"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onPhoto(f); }} />
      <input ref={gallery} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onPhoto(f); }} />

      <header className="relative z-10 px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Link href="/calendar" aria-label="History" className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-ink shadow-[0_1px_2px_rgb(60_40_10/0.06)] active:scale-95">
            <IconCalendar size={20} />
          </Link>
          <AppMenu />
        </div>
        <h1 className="-mt-4 text-center font-display text-[30px] leading-tight font-extrabold tracking-[-0.01em]">Namaste, {firstName}!</h1>
      </header>

      {/* The twin is the hero: big, floating, with confetti; tap for today's stats. */}
      <section className="relative z-0 mt-1 h-[236px] shrink-0" aria-label="Your twin">
        <div aria-hidden className="absolute top-8 left-1/2 h-[220px] w-[220px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgb(247_226_195/0.9),rgb(247_226_195/0)_70%)]" />
        <Confetti burst={burst} still={!burst} count={burst ? 30 : 18} spread={burst ? 170 : 150} />
        {twin && !twin.poses.bust && !twin.stages[1] ? (
          <div className="absolute top-1 left-1/2 flex -translate-x-1/2 flex-col items-center" aria-live="polite">
            <div className="relative h-40 w-40">
              <div className="absolute inset-0 animate-spin rounded-full [animation-duration:2.4s] [background:conic-gradient(from_0deg,#10686a,#e2b04a,#10686a00_70%)]" />
              <div className="absolute inset-[6px] rounded-full bg-cream" />
              {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL */}
              {selfieUrl && <img src={selfieUrl} alt="" className="absolute inset-3 h-[136px] w-[136px] rounded-full object-cover" />}
            </div>
            <p className="mt-1.5 rounded-full bg-card px-3 py-1 font-display text-[15px] font-bold shadow-card">Making your 3D twin…</p>
          </div>
        ) : (
          <Link href="/today" aria-label="See today's stats" className={`absolute left-1/2 top-0 block -translate-x-1/2 ${burst ? "animate-pop" : ""}`} key={burst}>
            <TwinArt twin={twin} pose="bust" stage={stage} className="h-[236px] w-[224px]" float />
          </Link>
        )}
        {streakDays > 0 && (
          <Link href={`/share/milestone?type=streak&value=${streakDays}&celebrate=1`} className="absolute top-[112px] left-4 flex flex-col items-center rounded-[18px] bg-card px-3 py-2 shadow-card" data-testid="streak">
            <span className="text-[22px] leading-none" aria-hidden>🔥</span>
            <span className="font-display text-[18px] leading-tight font-extrabold">{streakDays}</span>
            <span className="text-[11px] leading-none text-ink-soft">day streak</span>
          </Link>
        )}
        <Link href="/journey" className="absolute top-[104px] right-3 w-[84px] text-center font-display text-[15px] leading-tight font-semibold text-ink" aria-label={`${STAGE_BODIES[stage].name} stage — see your journey`}>
          <svg width="22" height="22" viewBox="0 0 22 22" className="mx-auto -mb-0.5" aria-hidden><path d="M4 18 C 6 10, 10 6, 16 4 M16 4 l-5 0 M16 4 l-1 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <span className="block rotate-[8deg]">{STAGE_BODIES[stage].name}<br />stage</span>
          <svg width="22" height="22" viewBox="0 0 22 22" className="mx-auto -mt-0.5" aria-hidden><path d="M16 4 C 14 12, 10 16, 5 18 M5 18 l5 1 M5 18 l1 -5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </Link>
      </section>

      <div className="relative z-10 -mt-6 flex flex-col gap-4 px-5">
        {line && (
          <div
            role={line.onClick ? "button" : "status"}
            tabIndex={line.onClick ? 0 : undefined}
            onClick={line.onClick}
            onKeyDown={(e) => line.onClick && (e.key === "Enter" || e.key === " ") && line.onClick()}
            data-testid={line.testid}
            aria-label={line.onClick ? "A note from your twin" : undefined}
            className={`relative mx-auto max-w-[340px] rounded-[22px] bg-card px-5 py-2.5 text-center shadow-card animate-fade-up ${line.onClick ? "cursor-pointer active:scale-[.99]" : ""}`}
          >
            <svg aria-hidden width="24" height="14" viewBox="0 0 24 14" className="absolute -top-3 left-1/2 -translate-x-1/2"><path d="M0 14 C8 10 10 4 12 0 C14 4 16 10 24 14 Z" fill="#fff" /></svg>
            <p className="font-display text-[17px] leading-snug font-semibold">{line.text} {line.action}</p>
          </div>
        )}

        {question && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setAsking(true)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setAsking(true)}
            aria-label="A question from your twin"
            className="-mt-2 mx-auto flex max-w-[340px] cursor-pointer items-center gap-2 rounded-full bg-sand px-4 py-2 font-display text-[15px] font-bold animate-fade-up active:scale-[.99]"
          >
            <span>{ASK[question.id].short}</span>
            <button onClick={(e) => { e.stopPropagation(); skipQuestion(); }} className="shrink-0 font-normal text-ink-soft">Skip</button>
          </div>
        )}

        {/* Today at a glance: three big rings, no small print. */}
        <div className="grid grid-cols-3 gap-2" aria-label="Today">
          <Link href="/today" className="flex flex-col items-center gap-1 rounded-[22px] bg-energy-soft py-2.5 active:scale-[.98]">
            <Ring value={kcalTarget ? (kcalIn / kcalTarget) * 100 : 0} color="var(--color-energy)" track="rgb(255 255 255 / 0.7)" label="Calories eaten" size={78} stroke={8}>
              <span className="font-display text-[19px] leading-none font-extrabold">{kcalIn}</span>
              <span className="text-[11px] text-ink-soft">kcal</span>
            </Ring>
            <span className="font-display text-[15px] font-bold">Calories</span>
          </Link>
          <Link href="/today" className="flex flex-col items-center gap-1 rounded-[22px] bg-muscle-soft py-2.5 active:scale-[.98]">
            <Ring value={proteinTarget ? (protein / proteinTarget) * 100 : 0} color="var(--color-muscle)" track="rgb(255 255 255 / 0.7)" label="Protein" size={78} stroke={8}>
              <span className="font-display text-[19px] leading-none font-extrabold">{protein}g</span>
              <span className="text-[11px] text-ink-soft">{proteinTarget ? `of ${proteinTarget}` : "protein"}</span>
            </Ring>
            <span className="font-display text-[15px] font-bold">Protein</span>
          </Link>
          <button onClick={async () => { await addWater(250); await refresh(profile); react(); }} aria-label={`Add a glass of water — ${(waterMl / 1000).toFixed(1)} of ${(waterTarget / 1000).toFixed(1)} litres today`}
            className="flex flex-col items-center gap-1 rounded-[22px] bg-hydration-soft py-2.5 active:scale-[.98]">
            <Ring value={waterPct} color="var(--color-hydration)" track="rgb(255 255 255 / 0.7)" label="Water" size={78} stroke={8}>
              <span className="font-display text-[19px] leading-none font-extrabold">{(waterMl / 1000).toFixed(1)}L</span>
              <span className="text-[11px] text-ink-soft">of {(waterTarget / 1000).toFixed(1)}</span>
            </Ring>
            <span className="font-display text-[15px] font-bold">+ 1 glass</span>
          </button>
        </div>

        {milestone && (
          <div className="flex items-center gap-3 rounded-[22px] bg-card p-3 pr-4 shadow-card animate-pop" role="status" data-testid="milestone">
            <Medallion label={milestone.type === "streak" ? `${milestone.value} DAYS` : milestone.type === "weight" ? `−${milestone.value} KG` : `STAGE ${milestone.value}`} size={72} />
            <div className="flex-1">
              <p className="font-display text-[19px] leading-tight font-bold">
                {milestone.type === "streak" ? `${milestone.value}-day streak!` : milestone.type === "weight" ? `${milestone.value} kg lighter!` : `Stage ${milestone.value}!`}
              </p>
              <div className="mt-1.5 flex gap-3 font-display text-[15px] font-bold">
                <Link href={`/share/milestone?type=${milestone.type}&value=${milestone.value}&celebrate=1`} onClick={() => markMilestone(milestone)} className="text-teal">See badge ↗</Link>
                <button onClick={() => markMilestone(milestone)} className="text-ink-faint">Not now</button>
              </div>
            </div>
          </div>
        )}

        {/* Your plate today: the day as big food stickers. */}
        <section aria-label="Your plate today">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[20px] font-bold">Your plate today</h2>
            <Link href="/move" className="font-display text-[15px] font-bold text-strength">+ Exercise</Link>
          </div>
          {meals.length || today?.activities.length ? (
            <div className="no-scrollbar -mx-5 mt-2 flex gap-4 overflow-x-auto px-5 pb-2">
              {meals.map((m) => {
                const art = mealArt(m.meal_items);
                return (
                  <button key={m.id} data-testid="meal-card"
                    onClick={() => setDraft({ key: Date.now(), items: m.meal_items.map(toEditable), type: m.meal_type, source: m.source, editing: m, previewUrl: m.photo_url })}
                    className="flex w-[86px] shrink-0 flex-col items-center text-center active:scale-[.97]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL */}
                    {m.photo_url ? <img src={m.photo_url} alt="" className="h-[76px] w-[76px] rounded-full border-[4px] border-white object-cover shadow-[0_6px_14px_rgb(60_40_10/0.18)]" /> : <FoodSticker src={art.src} emoji={art.emoji} size={76} />}
                    <span className="mt-1.5 font-display text-[15px] leading-tight font-bold capitalize">{m.meal_type}</span>
                    <span className="text-[13px] text-ink-soft">{Math.round(mealTotals(m).kcal)} kcal</span>
                  </button>
                );
              })}
              {today?.activities.map((a) => (
                <Link key={a.id} href="/move" className="flex w-[86px] shrink-0 flex-col items-center text-center">
                  <span className="relative flex h-[76px] w-[76px] items-end justify-center overflow-hidden rounded-full border-[4px] border-white bg-strength-soft shadow-[0_6px_14px_rgb(60_40_10/0.14)]" aria-hidden>
                    {twin?.poses.walk || twin?.poses.stretch ? (
                      <TwinArt twin={twin} pose={/yoga|surya|stretch|pranayama/.test(a.activity_key) ? "stretch" : "walk"} stage={stage} className="h-[64px] w-[64px]" />
                    ) : (
                      <span className="mb-3 text-[34px]">{activityByKey(a.activity_key)?.emoji ?? "🏃"}</span>
                    )}
                  </span>
                  <span className="mt-1.5 line-clamp-1 font-display text-[15px] leading-tight font-bold">{a.label.split(" (")[0]}</span>
                  <span className="text-[13px] text-ink-soft">{Number(a.minutes)} min</span>
                </Link>
              ))}
            </div>
          ) : (
            <button onClick={() => setCamMenu(true)} className="mt-2 flex w-full items-center gap-4 rounded-[22px] border-2 border-dashed border-[#e2d5bd] px-4 py-4 text-left active:scale-[.99]">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-card text-[28px] shadow-card" aria-hidden>🍽️</span>
              <span className="font-display text-[17px] leading-snug font-semibold text-ink-soft">Your first meal of the day goes here</span>
            </button>
          )}
        </section>
      </div>

      {/* The dock: speak, snap (the main action), and chat as a button. */}
      <nav aria-label="Log" className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md bg-[linear-gradient(to_top,var(--color-cream)_60%,rgb(251_245_233/0))] px-6 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="relative flex items-end justify-center gap-8">
          <button onClick={() => { setVoice(true); if (twin) ensureTwinArt(twin, { poses: ["wave"] }).then((t) => t && setTwin(t)).catch(() => {}); }} aria-label="Speak a log" className="flex flex-col items-center gap-1 active:scale-95">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-card shadow-card"><IconMic size={24} /></span>
            <span className="font-display text-[13px] font-semibold">Say it</span>
          </button>
          <button onClick={() => setCamMenu((v) => !v)} aria-label="Snap a meal" aria-expanded={camMenu} className="flex flex-col items-center gap-1 active:scale-95">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-teal text-white shadow-[0_0_0_6px_rgb(16_104_106/0.12),0_14px_28px_rgb(16_104_106/0.35)]"><IconCamera size={30} /></span>
            <span className="font-display text-[13px] font-bold">Snap a meal</span>
          </button>
          <button onClick={() => setChatOpen(true)} aria-label="Ask Hoppy" className="flex flex-col items-center gap-1 active:scale-95">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-card shadow-card"><IconChat size={24} /></span>
            <span className="font-display text-[13px] font-semibold">Ask Hoppy</span>
          </button>
          {camMenu && (
            <div className="absolute bottom-[calc(100%+10px)] left-1/2 w-[240px] -translate-x-1/2 overflow-hidden rounded-[18px] bg-card shadow-lift animate-fade-up" role="menu">
              {[
                ["Take a photo", () => camera.current?.click()],
                ["Choose from gallery", () => gallery.current?.click()],
                ["Search for a dish", () => setDraft({ key: Date.now(), items: [], type: mealTypeFor(), source: "manual" })],
                ["Try a sample meal", sampleMeal],
              ].map(([label, fn]) => (
                <button key={label as string} type="button" role="menuitem" onClick={() => { setCamMenu(false); (fn as () => void)(); }}
                  className="block w-full border-b border-[#f3ecdf] px-4 py-3.5 text-center font-display text-[17px] font-semibold last:border-0 active:bg-cream">
                  {label as string}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {toast && <Toast>{toast}</Toast>}

      {draft && (
        <MealConfirm
          key={draft.key}
          initialItems={draft.items}
          initialType={draft.type}
          photoUrl={draft.previewUrl}
          demo={draft.demo}
          transcript={draft.photo_path ? undefined : draft.transcript}
          editing={!!draft.editing}
          onDelete={draft.editing ? async () => { await deleteMeal(draft.editing!.id); setDraft(null); await refresh(profile); } : undefined}
          onConfirm={confirm}
          onClose={() => setDraft(null)}
        />
      )}
      {voice && (
        <VoiceLog
          twin={twin}
          stage={stage}
          name={profile.name ?? ""}
          weightKg={profile.weight_kg}
          serverVoice={serverVoice}
          onConfirm={onVoiceConfirm}
          onEditMeal={(r) => {
            setVoice(false);
            setDraft({ key: Date.now(), items: r.items, type: mealTypeFor(), source: "voice", transcript: r.transcript, extra: { activity: r.activity, waterMl: r.waterMl } });
          }}
          onAsk={(t) => ask(t)}
          onClose={() => setVoice(false)}
        />
      )}
      {chatOpen && (
        <ChatOverlay
          name={firstName}
          twin={twin}
          stage={stage}
          chat={chat.filter((c) => c.kind !== "nudge")}
          pending={pending}
          onSend={onText}
          onClose={() => setChatOpen(false)}
        />
      )}
      {question && asking && (
        <QuestionScreen key={question.id} q={question.id} twin={twin} stage={stage} weightKg={profile.weight_kg} onAnswer={answerQuestion} onLater={skipQuestion} />
      )}
    </main>
  );
}
