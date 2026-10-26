"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActivityCard } from "@/components/ActivityCard";
import { AppMenu } from "@/components/AppMenu";
import { ActivityConfirmSheet } from "@/components/ActivityConfirmSheet";
import { Avatar } from "@/components/Avatar";
import { Celebration } from "@/components/Celebration";
import { ChatBubble } from "@/components/ChatBubble";
import { DripQuestion, type DripAnswer } from "@/components/DripQuestion";
import { StatSheet } from "@/components/StatSheet";
import { InputBar } from "@/components/InputBar";
import { MealCard } from "@/components/MealCard";
import { MealConfirmSheet } from "@/components/MealConfirmSheet";
import { QuickLog } from "@/components/QuickLog";
import { Tumbler } from "@/components/Tumbler";
import { loadAvatarStages, type AvatarStage } from "@/lib/avatar/client";
import { askHoppy, loadChat, saveNudge, type ChatMsg } from "@/lib/chat/client";
import { NOT_FOOD, NUDGES, nudgeKeyOf, pick } from "@/lib/copy/voice";
import { greeting } from "@/lib/greeting";
import { resizeImage } from "@/lib/image";
import { addWater, deleteActivity, saveActivity, saveSleep, saveWeight, undoLastWater, type SavedActivity } from "@/lib/logs/client";
import {
  deleteMeal, mealTotals, saveMeal, setMealReply, startOfDay, streamMealReply, toEditable, updateMeal,
  type SavedMeal,
} from "@/lib/meals/client";
import { mealTypeFor, type MealAnalysis, type MealItem, type MealType } from "@/lib/meals/types";
import { nextQuestion, type DripEvent, type Question } from "@/lib/onboarding/nextQuestion";
import { isQuestion, type Parsed, type ParsedActivity } from "@/lib/parse/text";
import { nudgeFor } from "@/lib/rules/nudges";
import type { StageProgress } from "@/lib/rules/stages";
import { progressFor, stageUp } from "@/lib/stages/client";
import { loadProfile, saveProfile, type Profile } from "@/lib/profile";
import { vitality } from "@/lib/rules/stats";
import { dateKey, loadToday, saveSnapshot, type Today } from "@/lib/stats/today";
import { api, apiJson, ensureSession } from "@/lib/supabase/client";

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
};

type ActivityDraft = { key: number; activity: ParsedActivity; source: "text" | "voice"; transcript?: string };

const GLASS_ML = 250;

/** prd.md > Screens and Layout — Home (chat) and the core journey steps 3–4. */
export function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stages, setStages] = useState<Record<number, AvatarStage>>({});
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const avatar = profile ? (stages[profile.current_stage] ?? stages[1] ?? null) : null;
  const [today, setToday] = useState<Today | null>(null);
  const meals = today?.meals ?? [];
  const [statsOpen, setStatsOpen] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [activityDraft, setActivityDraft] = useState<ActivityDraft | null>(null);
  const [serverVoice, setServerVoice] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [pending, setPending] = useState<{ q: string; a: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const nudging = useRef(false);

  /** Recomputes today's stats from the logs and stores the day's snapshot. */
  const refresh = useCallback(async (p: Profile) => {
    const t = await loadToday(p);
    setToday(t);
    await saveSnapshot(t, p.weight_kg);
    const from = startOfDay();
    const to = new Date(from.getTime() + 864e5);
    let msgs = await loadChat(from, to);
    // The avatar speaks up when a stat is low (lib/rules/nudges.ts). Overlapping
    // refreshes (app open + a log) take turns and re-check fresh history first.
    // On the signup day, stay quiet until the first log: the empty state already invites one.
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

  function react() {
    setReacting(true);
    setTimeout(() => setReacting(false), 700);
  }

  /** Stage-up check after the day's snapshot is saved (lib/rules/stages.ts). */
  const checkStage = useCallback(async (p: Profile) => {
    const prog = await progressFor(p);
    if (prog.canStageUp) {
      const up = await stageUp(p);
      setProfile(up);
      setProgress(await progressFor(up));
      setStages(await loadAvatarStages());
      setCelebrate(up.current_stage);
      return up;
    }
    setProgress(prog);
    return p;
  }, []);

  useEffect(() => {
    (async () => {
      await ensureSession();
      const p = await loadProfile();
      const stages = await loadAvatarStages();
      if (!p?.name || !stages[1]) {
        router.replace("/onboarding");
        return;
      }
      setProfile(p);
      setStages(stages);
      const t = await refresh(p);
      await checkStage(p);
      // Stages 2–5 may still be generating in the background after onboarding.
      if (Object.keys(stages).length < 5) setTimeout(async () => setStages(await loadAvatarStages()), 8000);
      if (!maybeAsk(p, "app_open")) maybeAsk(p, "morning", t);
      fetch("/api/capabilities").then((r) => r.json()).then((c) => setServerVoice(!!c.gemini)).catch(() => {});
    })().catch(console.error);
  }, [router, refresh, maybeAsk, checkStage]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function onPhoto(file: File) {
    setReading(true);
    try {
      const small = await resizeImage(file);
      const form = new FormData();
      form.append("photo", small, "meal.jpg");
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
    if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    setDraft(null);
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
    await refresh(p);
    await checkStage(p);
    react();
  }

  /** Routes a parsed typed/spoken log to the right confirm sheet. */
  function openParsed(r: Parsed & { transcript?: string }, source: "text" | "voice") {
    if (r.kind === "meal") {
      setDraft({ key: Date.now(), items: r.items, type: mealTypeFor(), source: source === "voice" ? "voice" : "manual", transcript: r.transcript });
      if (r.unknown.length) setToast(`I couldn't place "${r.unknown.join(", ")}" — add it with Something else.`);
    } else if (r.kind === "activity") {
      setActivityDraft({ key: Date.now(), activity: r.activity, source, transcript: r.transcript });
    } else {
      setToast("I didn't catch a food or workout in that. Try “2 roti, dal” or “30 min walk”.");
    }
  }

  async function ask(question: string) {
    if (!profile) return;
    setPending({ q: question, a: "" });
    try {
      const res = await askHoppy(question, startOfDay(), dateKey(), (a) => setPending({ q: question, a }));
      const from = startOfDay();
      setChat(await loadChat(from, new Date(from.getTime() + 864e5)));
      if (res.suggestsFood) maybeAsk(profile, "food_suggested");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setPending(null);
    }
  }

  async function onText(text: string) {
    try {
      if (isQuestion(text)) return await ask(text);
      const r = await apiJson<Parsed>("/api/log/text", { text });
      if (r.kind === "unknown") return await ask(text);
      openParsed(r, "text");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "That didn't work.");
    }
  }

  async function onVoice({ audio, transcript }: { audio?: Blob; transcript?: string }) {
    try {
      if (audio) {
        const form = new FormData();
        form.append("audio", audio, "voice.webm");
        const res = await api("/api/log/voice", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        openParsed(json, "voice");
      } else if (transcript) {
        const r = await apiJson<Parsed>("/api/log/text", { text: transcript });
        openParsed({ ...r, transcript }, "voice");
      } else {
        setToast("I didn't hear anything. Try again?");
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Couldn't hear that clearly.");
    }
  }

  async function confirmActivity(a: ParsedActivity & { minutes: number }) {
    if (!profile || !activityDraft) return;
    await saveActivity(a, profile.weight_kg, activityDraft.source);
    setActivityDraft(null);
    await refresh(profile);
    await checkStage(profile);
    react();
  }

  async function water(delta: 1 | -1) {
    if (!profile) return;
    if (delta > 0) await addWater(GLASS_ML);
    else await undoLastWater(startOfDay());
    await refresh(profile);
    if (delta > 0) react();
  }

  if (!profile) {
    return <main className="flex flex-1 items-center justify-center font-display text-xl text-ink-soft">Hoppy…</main>;
  }

  return (
    <main className="flex flex-1 flex-col px-5 pt-8">
      <header className="relative flex flex-col items-center text-center">
        <div className="mb-2 flex w-full items-center justify-between">
          <Link href="/calendar" aria-label="Calendar" className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-xl shadow-sm">📅</Link>
          <AppMenu />
        </div>
        <h1 className="font-display text-3xl font-bold">
          {greeting()}, {profile.name}.
        </h1>
        {today && (
          <div className="absolute right-0 top-32 z-10">
            <Tumbler ml={today.totals.waterMl} target={today.targets.waterMl} glassMl={GLASS_ML} onAdd={() => water(1)} onUndo={() => water(-1)} />
          </div>
        )}
        <Avatar
          url={avatar?.url}
          isPlaceholder={avatar?.is_placeholder}
          size={meals.length ? 150 : 220}
          className="mt-4"
          vitality={today ? vitality(today.stats) : undefined}
          reacting={reacting}
          onClick={() => {
            setStatsOpen(true);
            maybeAsk(profile, "stages_shown");
          }}
        />
        {(meals.length > 0 || (today?.activities.length ?? 0) > 0) && (
          <Link href="/share/today" className="mt-3 rounded-full bg-card px-4 py-2 font-display font-semibold text-teal shadow-sm">
            Share my day ↗
          </Link>
        )}
      </header>

      <section className="mt-6 flex flex-col gap-4 pb-4" aria-label="Today">
        {meals.length === 0 && !today?.activities.length && !reading && (
          <p className="rounded-3xl bg-card px-5 py-4 text-center font-display text-lg shadow-sm">
            What did you last eat? Snap it or tell me. 🍽️
          </p>
        )}
        {timeline(meals, today?.activities ?? [], chat).map((entry) =>
          entry.kind === "chat" ? (
            <ChatBubble key={entry.c.id} role={entry.c.role} content={entry.c.content} stat={entry.c.stat} nudge={entry.c.kind === "nudge"} />
          ) : entry.kind === "activity" ? (
            <ActivityCard
              key={entry.a.id}
              a={entry.a}
              onDelete={async () => {
                await deleteActivity(entry.a.id);
                await refresh(profile);
              }}
            />
          ) : (
            <MealCard
              key={entry.m.id}
              meal={entry.m}
              reply={replies[entry.m.id]}
              onEdit={() => setDraft({ key: Date.now(), items: entry.m.meal_items.map(toEditable), type: entry.m.meal_type, source: entry.m.source, editing: entry.m })}
              onDelete={async () => {
                await deleteMeal(entry.m.id);
                await refresh(profile);
              }}
            />
          ),
        )}
        {pending && (
          <>
            <ChatBubble role="user" content={pending.q} />
            <ChatBubble role="assistant" content={pending.a || "…"} />
          </>
        )}
        {question && (
          <DripQuestion
            key={question.id}
            q={question}
            onAnswer={answerQuestion}
            onLater={async () => {
              const p = await saveProfile({ asked: { ...profile.asked, [question.id]: dateKey() } });
              setProfile(p);
              setQuestion(null);
            }}
          />
        )}
        {reading && (
          <p className="rounded-3xl bg-card px-5 py-4 text-center font-display text-lg shadow-sm animate-pulse" aria-live="polite">
            Reading your plate…
          </p>
        )}
      </section>

      <InputBar
        onPhoto={onPhoto}
        onSearch={() => setDraft({ key: Date.now(), items: [], type: mealTypeFor(), source: "manual" })}
        onText={onText}
        onVoice={onVoice}
        serverVoice={serverVoice}
      />

      {toast && (
        <div role="status" className="fixed inset-x-5 top-5 z-50 mx-auto max-w-md rounded-2xl bg-ink px-4 py-3 text-center text-cream shadow-lg animate-fade-up">
          {toast}
        </div>
      )}

      {today && (
        <StatSheet
          open={statsOpen}
          onClose={() => setStatsOpen(false)}
          stats={today.stats}
          stage={profile.current_stage}
          stageProgress={progress}
          stages={stages}
          footer={
            <QuickLog
              sleepHours={today.totals.sleepHours}
              weightKg={profile.weight_kg}
              onSleep={async (h) => {
                await saveSleep(dateKey(), h);
                await refresh(profile);
              }}
              onWeight={async (kg) => {
                const p = await saveWeight(dateKey(), kg);
                setProfile(p);
                await refresh(p);
              }}
            />
          }
        />
      )}

      {draft && (
        <MealConfirmSheet
          key={draft.key}
          open
          title={draft.editing ? "Edit meal" : draft.items.length ? "Did I get this right?" : "What did you eat?"}
          initialItems={draft.items}
          initialType={draft.type}
          photoUrl={draft.previewUrl}
          demo={draft.demo}
          transcript={draft.transcript}
          busyLabel={draft.editing ? "Save" : "Log it"}
          onConfirm={confirm}
          onClose={() => setDraft(null)}
        />
      )}
      {celebrate && (
        <Celebration stage={celebrate} url={stages[celebrate]?.url} onClose={() => setCelebrate(null)} />
      )}

      {activityDraft && (
        <ActivityConfirmSheet
          key={activityDraft.key}
          initial={activityDraft.activity}
          weightKg={profile.weight_kg}
          transcript={activityDraft.transcript}
          onConfirm={confirmActivity}
          onClose={() => setActivityDraft(null)}
        />
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
