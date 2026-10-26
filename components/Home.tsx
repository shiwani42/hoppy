"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { InputBar } from "@/components/InputBar";
import { MealCard } from "@/components/MealCard";
import { MealConfirmSheet } from "@/components/MealConfirmSheet";
import { loadAvatarStages, type AvatarStage } from "@/lib/avatar/client";
import { NOT_FOOD } from "@/lib/copy/voice";
import { greeting } from "@/lib/greeting";
import { resizeImage } from "@/lib/image";
import {
  deleteMeal, loadMeals, mealTotals, saveMeal, setMealReply, startOfDay, streamMealReply, toEditable, updateMeal,
  type SavedMeal,
} from "@/lib/meals/client";
import { mealTypeFor, type MealAnalysis, type MealItem, type MealType } from "@/lib/meals/types";
import { loadProfile, type Profile } from "@/lib/profile";
import { api, ensureSession } from "@/lib/supabase/client";

type Draft = {
  key: number;
  items: MealItem[];
  type: MealType;
  source: SavedMeal["source"];
  photo_path?: string;
  previewUrl?: string;
  demo?: boolean;
  editing?: SavedMeal;
};

/** prd.md > Screens and Layout — Home (chat) and the core journey steps 3–4. */
export function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatar, setAvatar] = useState<AvatarStage | null>(null);
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [reading, setReading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refreshMeals = useCallback(async () => setMeals(await loadMeals(startOfDay())), []);

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
      setAvatar(stages[p.current_stage] ?? stages[1]);
      await refreshMeals();
    })().catch(console.error);
  }, [router, refreshMeals]);

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
    if (!draft) return;
    if (draft.editing) {
      await updateMeal(draft.editing.id, type, items);
      setDraft(null);
      await refreshMeals();
      return;
    }
    const meal = await saveMeal({ meal_type: type, source: draft.source, photo_path: draft.photo_path, is_demo: draft.demo, items });
    if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    setDraft(null);
    await refreshMeals();
    const reply = await streamMealReply(
      items.map(({ name, quantity, unit }) => ({ name, quantity, unit })),
      mealTotals(meal),
      profile?.name ?? undefined,
      (soFar) => setReplies((r) => ({ ...r, [meal.id]: soFar })),
    );
    if (reply) await setMealReply(meal.id, reply);
  }

  if (!profile) {
    return <main className="flex flex-1 items-center justify-center font-display text-xl text-ink-soft">Hoppy…</main>;
  }

  return (
    <main className="flex flex-1 flex-col px-5 pt-8">
      <header className="flex flex-col items-center text-center">
        <h1 className="font-display text-3xl font-bold">
          {greeting()}, {profile.name}.
        </h1>
        <Avatar url={avatar?.url} isPlaceholder={avatar?.is_placeholder} size={meals.length ? 150 : 220} className="mt-4" />
      </header>

      <section className="mt-6 flex flex-col gap-4 pb-4" aria-label="Today">
        {meals.length === 0 && !reading && (
          <p className="rounded-3xl bg-card px-5 py-4 text-center font-display text-lg shadow-sm">
            What did you last eat? Snap it, or search for it. 🍽️
          </p>
        )}
        {meals.map((m) => (
          <MealCard
            key={m.id}
            meal={m}
            reply={replies[m.id]}
            onEdit={() => setDraft({ key: Date.now(), items: m.meal_items.map(toEditable), type: m.meal_type, source: m.source, editing: m })}
            onDelete={async () => {
              await deleteMeal(m.id);
              await refreshMeals();
            }}
          />
        ))}
        {reading && (
          <p className="rounded-3xl bg-card px-5 py-4 text-center font-display text-lg shadow-sm animate-pulse" aria-live="polite">
            Reading your plate…
          </p>
        )}
      </section>

      <InputBar onPhoto={onPhoto} onSearch={() => setDraft({ key: Date.now(), items: [], type: mealTypeFor(), source: "manual" })} />

      {toast && (
        <div role="status" className="fixed inset-x-5 top-5 z-50 mx-auto max-w-md rounded-2xl bg-ink px-4 py-3 text-center text-cream shadow-lg animate-fade-up">
          {toast}
        </div>
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
          busyLabel={draft.editing ? "Save" : "Log it"}
          onConfirm={confirm}
          onClose={() => setDraft(null)}
        />
      )}
    </main>
  );
}
