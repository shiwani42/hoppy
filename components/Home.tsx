"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppMenu } from "@/components/AppMenu";
import { Confetti, Medallion, TwinArt, loadTwin, type Twin } from "@/components/art";
import { IconCamera, IconMic, IconSend } from "@/components/icons";
import { MealConfirm } from "@/components/MealConfirm";
import { ASK, QuestionScreen, type DripAnswer } from "@/components/QuestionScreen";
import { ActivityEntry, AnswerCard, MealEntry, PromptBubble, ReplyCard, UserBubble } from "@/components/Thread";
import { Toast } from "@/components/ui";
import { VoiceLog, type VoiceResult } from "@/components/VoiceLog";
import { STAGE_BODIES } from "@/lib/ai/prompts";
import { askHoppy, loadChat, saveNudge, type ChatMsg } from "@/lib/chat/client";
import { acceptInvite, loadNewCheers, markCheersSeen, PENDING_INVITE, type Cheer } from "@/lib/community/client";
import { MEAL_REMINDERS, NOT_FOOD, NUDGES, nudgeKeyOf, pick } from "@/lib/copy/voice";
import { resizeImage } from "@/lib/image";
import { addWater, deleteActivity, saveActivity, saveSleep, saveWeight, type SavedActivity } from "@/lib/logs/client";
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
  const [text, setText] = useState("");

  const nudging = useRef(false);
  const thread = useRef<HTMLDivElement>(null);
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
      if (!p?.name || (!tw.stages[1] && !tw.poses.bust)) {
        router.replace("/onboarding");
        return;
      }
      setProfile(p);
      setTwin(tw);
      const t = await refresh(p);
      await checkStage(p);
      // Stages and poses may still be generating in the background after onboarding.
      if (Object.keys(tw.stages).length < 5 || Object.keys(tw.poses).length < 6) {
        for (const ms of [15000, 45000, 90000]) setTimeout(async () => setTwin(await loadTwin(true)), ms);
      }
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

  // Keep the newest message in view, like a chat (instantly on open, smoothly after).
  const scrolled = useRef(false);
  useEffect(() => {
    const el = thread.current;
    if (!el || !today) return;
    el.scrollTo({ top: el.scrollHeight, behavior: scrolled.current ? "smooth" : "auto" });
    scrolled.current = true;
  }, [today, meals.length, chat.length, pending, reading, question, replies, cheers.length, milestone]);

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
  const empty = meals.length === 0 && !today?.activities.length && !reading && !chat.length;
  const waterPct = today ? Math.min(100, (today.totals.waterMl / (today.targets.waterMl || 2500)) * 100) : 0;

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden">
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden data-testid="meal-photo-input"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onPhoto(f); }} />
      <input ref={gallery} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onPhoto(f); }} />

      <header className="relative z-10 px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Link href="/water" aria-label={`Water: ${Math.round(waterPct)}% of today's target`} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card shadow-[0_1px_2px_rgb(60_40_10/0.06)] active:scale-95">
            <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden>
              <defs><clipPath id="mini-glass"><path d="M1.5 1h15l-1.8 19.2a1 1 0 0 1-1 .8H4.3a1 1 0 0 1-1-.8z" /></clipPath></defs>
              <rect x="0" y={22 - (waterPct / 100) * 21} width="18" height="22" fill="var(--color-hydration)" clipPath="url(#mini-glass)" className="transition-all duration-700" />
              <path d="M1.5 1h15l-1.8 19.2a1 1 0 0 1-1 .8H4.3a1 1 0 0 1-1-.8z" fill="none" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </Link>
          <AppMenu />
        </div>
        <h1 className="-mt-4 text-center font-display text-[30px] leading-tight font-extrabold tracking-[-0.01em]">Namaste, {firstName}!</h1>
      </header>

      <section className="relative z-0 mt-2 h-[236px] shrink-0" aria-label="Your twin">
        <Confetti burst={burst} still={!burst} count={burst ? 30 : 18} spread={burst ? 170 : 150} />
        <Link href="/today" aria-label="See today's stats" className={`absolute left-1/2 top-0 block -translate-x-1/2 ${burst ? "animate-pop" : ""}`} key={burst}>
          <TwinArt twin={twin} pose="bust" stage={stage} className="h-[236px] w-[224px]" float />
        </Link>
        {streakDays > 0 && (
          <Link href={`/share/milestone?type=streak&value=${streakDays}&celebrate=1`} className="absolute top-[118px] left-4 rounded-full bg-card px-3 py-1.5 font-display text-[15px] font-bold shadow-card" data-testid="streak">
            🔥 {streakDays}
          </Link>
        )}
        <Link href="/journey" className="absolute top-[118px] right-3 w-[84px] text-center font-display text-[15px] leading-tight font-semibold text-ink" aria-label={`${STAGE_BODIES[stage].name} stage — see your journey`}>
          <svg width="22" height="22" viewBox="0 0 22 22" className="mx-auto -mb-0.5" aria-hidden><path d="M4 18 C 6 10, 10 6, 16 4 M16 4 l-5 0 M16 4 l-1 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <span className="block rotate-[8deg]">{STAGE_BODIES[stage].name}<br />stage</span>
          <svg width="22" height="22" viewBox="0 0 22 22" className="mx-auto -mt-0.5" aria-hidden><path d="M16 4 C 14 12, 10 16, 5 18 M5 18 l5 1 M5 18 l1 -5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </Link>
      </section>

      <div
        ref={thread}
        className="relative z-10 -mt-8 flex flex-1 flex-col gap-3 overflow-y-auto px-5 pt-8 pb-4 no-scrollbar [mask-image:linear-gradient(to_bottom,transparent,black_28px)] [&>*]:shrink-0"
        aria-label="Today"
      >
        <div className="mt-auto" />
        {empty && <ReplyCard>What did you last eat, {firstName}? Snap it or tell me. 🍽️</ReplyCard>}
        {cheers.map((c) => (
          <ReplyCard key={c.id}>👏 <strong>{c.name ?? "A friend"}</strong> sent you a Shabaash! Keep going.</ReplyCard>
        ))}
        {timeline(meals, today?.activities ?? [], chat).map((entry) =>
          entry.kind === "chat" ? (
            entry.c.role === "user" ? <UserBubble key={entry.c.id}>{entry.c.content}</UserBubble> : <AnswerCard key={entry.c.id} content={entry.c.content} stat={entry.c.stat} nudge={entry.c.kind === "nudge"} />
          ) : entry.kind === "activity" ? (
            <ActivityEntry key={entry.a.id} a={entry.a} onDelete={async () => { await deleteActivity(entry.a.id); await refresh(profile); }} />
          ) : (
            <MealEntry
              key={entry.m.id}
              meal={entry.m}
              reply={replies[entry.m.id]}
              onEdit={() => setDraft({ key: Date.now(), items: entry.m.meal_items.map(toEditable), type: entry.m.meal_type, source: entry.m.source, editing: entry.m, previewUrl: entry.m.photo_url })}
              onDelete={async () => { await deleteMeal(entry.m.id); await refresh(profile); }}
            />
          ),
        )}
        {pending && (
          <>
            <UserBubble>{pending.q}</UserBubble>
            <AnswerCard content={pending.a} />
          </>
        )}
        {reading && (
          <ReplyCard>
            <span className="inline-block animate-pulse">Reading your plate…</span>
          </ReplyCard>
        )}
        {reminder && !meals.some((m) => m.meal_type === reminder) && (
          <PromptBubble
            label="Reminder"
            action={<button onClick={dismissReminder} className="font-normal text-ink-soft">(Dismiss)</button>}
          >
            <span data-testid="reminder">{MEAL_REMINDERS[reminder]}</span>
          </PromptBubble>
        )}
        {snoozed.map((s) => (
          <PromptBubble key={s.id} label="Reminder" onClick={() => router.push(s.url)} action={<span className="font-normal text-teal">(Open)</span>}>
            {s.body}
          </PromptBubble>
        ))}
        {milestone && (
          <div className="mr-4 flex items-center gap-3 self-start rounded-[22px] bg-card p-3 pr-4 shadow-card animate-pop" role="status" data-testid="milestone">
            <Medallion label={milestone.type === "streak" ? `${milestone.value} DAYS` : milestone.type === "weight" ? `−${milestone.value} KG` : `STAGE ${milestone.value}`} size={72} />
            <div className="flex-1">
              <p className="font-display text-[19px] leading-tight font-bold">
                {milestone.type === "streak" ? `${milestone.value}-day streak!` : milestone.type === "weight" ? `${milestone.value} kg lighter!` : `Stage ${milestone.value}!`}
              </p>
              <p className="text-[14px] text-ink-soft">That&apos;s worth showing off.</p>
              <div className="mt-1.5 flex gap-3 font-display text-[15px] font-bold">
                <Link href={`/share/milestone?type=${milestone.type}&value=${milestone.value}&celebrate=1`} onClick={() => markMilestone(milestone)} className="text-teal">See badge ↗</Link>
                <button onClick={() => markMilestone(milestone)} className="text-ink-faint">Not now</button>
              </div>
            </div>
          </div>
        )}
        {question && (
          <PromptBubble
            label="A question from your twin"
            onClick={() => setAsking(true)}
            action={
              <button onClick={(e) => { e.stopPropagation(); skipQuestion(); }} className="font-normal text-ink-soft">
                (Skip)
              </button>
            }
          >
            {ASK[question.id].short}
          </PromptBubble>
        )}
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t) return;
          setText("");
          await onText(t);
        }}
        className="relative z-20 flex items-center gap-1.5 bg-cream px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <button type="button" onClick={() => setCamMenu((v) => !v)} aria-label="Snap a meal" aria-expanded={camMenu} className="flex h-11 w-10 shrink-0 items-center justify-center text-ink active:scale-95">
          <IconCamera size={26} />
        </button>
        <button type="button" onClick={() => setVoice(true)} aria-label="Speak a log" className="flex h-11 w-9 shrink-0 items-center justify-center text-ink active:scale-95">
          <IconMic size={25} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Log a meal or ask…"
          aria-label="Log or ask"
          enterKeyHint="send"
          className="h-12 min-w-0 flex-1 rounded-full bg-[#ebe6dc] px-4 text-[16px] outline-none placeholder:text-[#a59d90] focus:bg-[#e6e0d4]"
        />
        {text.trim() ? (
          <button aria-label="Send" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal text-white active:scale-95">
            <IconSend size={22} />
          </button>
        ) : (
          <Link href="/today" className="flex h-12 shrink-0 items-center rounded-full bg-[#efe3cf] px-4 font-display text-[17px] font-bold text-ink active:scale-95">
            Today
          </Link>
        )}

        {camMenu && (
          <div className="absolute bottom-[calc(100%+4px)] left-4 w-[230px] overflow-hidden rounded-[18px] bg-card shadow-lift animate-fade-up" role="menu">
            {[
              ["Take a photo", () => camera.current?.click()],
              ["Choose from gallery", () => gallery.current?.click()],
              ["Search for a dish", () => setDraft({ key: Date.now(), items: [], type: mealTypeFor(), source: "manual" })],
              ["Try a sample meal", sampleMeal],
            ].map(([label, fn]) => (
              <button
                key={label as string}
                type="button"
                role="menuitem"
                onClick={() => { setCamMenu(false); (fn as () => void)(); }}
                className="block w-full border-b border-[#f3ecdf] px-4 py-3.5 text-left font-display text-[17px] font-semibold last:border-0 active:bg-cream"
              >
                {label as string}
              </button>
            ))}
          </div>
        )}
      </form>

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
      {question && asking && (
        <QuestionScreen key={question.id} q={question.id} twin={twin} stage={stage} weightKg={profile.weight_kg} onAnswer={answerQuestion} onLater={skipQuestion} />
      )}
    </main>
  );
}

type Entry =
  | { kind: "meal"; at: string; m: SavedMeal }
  | { kind: "activity"; at: string; a: SavedActivity }
  | { kind: "chat"; at: string; c: ChatMsg };

/** Meals, workouts and chat interleaved by time. */
function timeline(meals: SavedMeal[], activities: SavedActivity[], chat: ChatMsg[]): Entry[] {
  return [
    ...meals.map((m) => ({ kind: "meal" as const, at: m.eaten_at, m })),
    ...activities.map((a) => ({ kind: "activity" as const, at: a.done_at, a })),
    ...chat.map((c) => ({ kind: "chat" as const, at: c.created_at, c })),
  ].sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime());
}
