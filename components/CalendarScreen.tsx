"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityCard } from "@/components/ActivityCard";
import { MealCard } from "@/components/MealCard";
import { PageHeader } from "@/components/PageHeader";
import { Sheet } from "@/components/Sheet";
import { loadActivities, type SavedActivity } from "@/lib/logs/client";
import { sumNutrients } from "@/lib/meals/foods";
import { loadMeals, type SavedMeal } from "@/lib/meals/client";
import { loadProfile } from "@/lib/profile";
import { dateKey } from "@/lib/stats/today";
import { ensureSession } from "@/lib/supabase/client";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** prd.md > Diet Calendar and History — month grid with food stickers per day. */
export function CalendarScreen() {
  const router = useRouter();
  // The current date is read after mount, never during prerender.
  const [now, setNow] = useState<Date | null>(null);
  const [month, setMonth] = useState<Date | null>(null);
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [acts, setActs] = useState<SavedActivity[]>([]);
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await ensureSession();
      if (!(await loadProfile())?.name) return router.replace("/onboarding");
      const d = new Date();
      setNow(d);
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    })().catch(console.error);
  }, [router]);

  useEffect(() => {
    if (!month) return;
    (async () => {
      const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      const [m, a] = await Promise.all([loadMeals(month, next), loadActivities(month, next)]);
      setMeals(m);
      setActs(a);
    })().catch(console.error);
  }, [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, { meals: SavedMeal[]; acts: SavedActivity[] }>();
    const get = (k: string) => map.get(k) ?? (map.set(k, { meals: [], acts: [] }), map.get(k)!);
    for (const m of meals) get(dateKey(new Date(m.eaten_at))).meals.push(m);
    for (const a of acts) get(dateKey(new Date(a.done_at))).acts.push(a);
    return map;
  }, [meals, acts]);

  const cells = useMemo(() => {
    if (!month) return [];
    const lead = (month.getDay() + 6) % 7; // Monday-first
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  }, [month]);

  if (!month || !now) {
    return <main className="flex flex-1 items-center justify-center font-display text-xl text-ink-soft">Calendar…</main>;
  }
  const todayKey = dateKey(now);
  const selected = day ? byDay.get(day) : undefined;
  const totals = selected ? sumNutrients(selected.meals.flatMap((m) => m.meal_items)) : null;
  const burned = selected ? selected.acts.reduce((a, x) => a + Number(x.kcal), 0) : 0;
  const isCurrentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();

  return (
    <main className="flex flex-1 flex-col px-5 pt-6 pb-8">
      <PageHeader title="Calendar" />
      <div className="mt-4 flex items-center justify-between">
        <button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="h-11 w-11 rounded-full bg-card text-xl shadow-sm">‹</button>
        <h2 className="font-display text-2xl font-bold">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
        <button aria-label="Next month" disabled={isCurrentMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="h-11 w-11 rounded-full bg-card text-xl shadow-sm disabled:opacity-30">›</button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label="Days">
        {WEEKDAYS.map((w, i) => <div key={i} className="text-xs font-semibold text-ink-soft">{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = dateKey(d);
          const entry = byDay.get(k);
          const stickers = [...new Set(entry?.meals.flatMap((m) => m.meal_items.map((it) => it.sticker ?? "🍽️")) ?? [])].slice(0, 3);
          const future = k > todayKey;
          return (
            <button
              key={i}
              disabled={future}
              onClick={() => setDay(k)}
              aria-label={`${d.getDate()} ${entry ? `— ${entry.meals.length} meals logged` : ""}`}
              data-date={k}
              className={`flex aspect-[3/4] flex-col items-center rounded-2xl pt-1 ${k === todayKey ? "bg-teal-soft ring-2 ring-teal" : entry ? "bg-card shadow-sm" : "bg-card/40"} disabled:opacity-30`}
            >
              <span className="text-sm font-semibold">{d.getDate()}</span>
              <span className="flex flex-wrap justify-center text-sm leading-tight" aria-hidden>{stickers.join("")}{entry?.acts.length ? "💪" : ""}</span>
            </button>
          );
        })}
      </div>

      {day && (
        <Sheet open onClose={() => setDay(null)} title={new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}>
          {totals && (selected!.meals.length > 0 || selected!.acts.length > 0) ? (
            <>
              <div className="grid grid-cols-3 gap-2 text-center" data-testid="day-totals">
                <div className="rounded-2xl bg-card py-2"><p className="text-xs text-ink-soft">Eaten</p><p className="font-display text-2xl font-bold">{Math.round(totals.kcal)}</p><p className="text-xs text-ink-soft">kcal</p></div>
                <div className="rounded-2xl bg-card py-2"><p className="text-xs text-ink-soft">Burned</p><p className="font-display text-2xl font-bold text-strength">{Math.round(burned)}</p><p className="text-xs text-ink-soft">kcal</p></div>
                <div className="rounded-2xl bg-card py-2"><p className="text-xs text-ink-soft">Protein</p><p className="font-display text-2xl font-bold text-muscle">{Math.round(totals.protein_g)}</p><p className="text-xs text-ink-soft">g</p></div>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {selected!.meals.map((m) => <MealCard key={m.id} meal={m} />)}
                {selected!.acts.map((a) => <ActivityCard key={a.id} a={a} />)}
              </div>
            </>
          ) : (
            <p className="text-ink-soft">Nothing logged this day.</p>
          )}
        </Sheet>
      )}
    </main>
  );
}
