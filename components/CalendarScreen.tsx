"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FoodSticker } from "@/components/art";
import { IconCalendar, IconChevron, IconBack } from "@/components/icons";
import { Card, Loading, Screen, TopBar } from "@/components/ui";
import { useMe } from "@/components/useMe";
import { mealArt } from "@/lib/art";
import { loadActivities, type SavedActivity } from "@/lib/logs/client";
import { sumNutrients } from "@/lib/meals/foods";
import { loadMeals, type SavedMeal } from "@/lib/meals/client";
import { activityByKey } from "@/lib/rules/activity";
import { dateKey } from "@/lib/stats/today";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY = 864e5;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase();
const dish = (m: SavedMeal) => {
  const names = m.meal_items.map((i) => cap(i.name.split(" /")[0]));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}` : (names[0] ?? "Meal");
};
const fromKey = (k: string) => new Date(`${k}T12:00:00`);

type Row = { at: string; label: string; title: string; sub: string; art: { src: string | null; emoji: string } };

/** "Beeta Hua Kal" (images/…gz31…png, left): any past day as a food sticker timeline, plus the month. */
export function CalendarScreen() {
  const [me] = useMe();
  const [now, setNow] = useState<Date | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [view, setView] = useState<"day" | "month">("day");
  const [month, setMonth] = useState<Date | null>(null);
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [acts, setActs] = useState<SavedActivity[]>([]);
  const strip = useRef<HTMLDivElement>(null);

  // The current date is read after mount, never during prerender. "Beeta hua kal" opens on yesterday.
  useEffect(() => {
    if (!me) return;
    const t = setTimeout(() => {
      const d = new Date();
      setNow(d);
      setDay(dateKey(new Date(d.getTime() - DAY)));
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }, 0);
    return () => clearTimeout(t);
  }, [me]);

  // One load covers the strip (last 30 days) and the month on screen.
  useEffect(() => {
    if (!now || !month) return;
    (async () => {
      const from = new Date(Math.min(now.getTime() - 30 * DAY, month.getTime()));
      from.setHours(0, 0, 0, 0);
      const to = new Date(Math.max(now.getTime() + DAY, new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime()));
      const [m, a] = await Promise.all([loadMeals(from, to), loadActivities(from, to)]);
      setMeals(m);
      setActs(a);
    })().catch(console.error);
  }, [now, month]);

  useEffect(() => {
    strip.current?.scrollTo({ left: strip.current.scrollWidth });
  }, [now, view]);

  const byDay = useMemo(() => {
    const map = new Map<string, { meals: SavedMeal[]; acts: SavedActivity[] }>();
    const get = (k: string) => map.get(k) ?? (map.set(k, { meals: [], acts: [] }), map.get(k)!);
    for (const m of meals) get(dateKey(new Date(m.eaten_at))).meals.push(m);
    for (const a of acts) get(dateKey(new Date(a.done_at))).acts.push(a);
    return map;
  }, [meals, acts]);

  if (!me || !now || !day || !month) return <Loading />;

  const todayKey = dateKey(now);
  const stripDays = Array.from({ length: 30 }, (_, i) => new Date(now.getTime() - (29 - i) * DAY));
  const entry = byDay.get(day);
  const rows: Row[] = [
    ...(entry?.meals ?? []).map((m) => ({
      at: m.eaten_at,
      label: cap(m.meal_type),
      title: dish(m),
      sub: `(${Math.round(sumNutrients(m.meal_items).kcal)} kcal)`,
      art: mealArt(m.meal_items),
    })),
    ...(entry?.acts ?? []).map((a) => ({
      at: a.done_at,
      label: "Movement",
      title: `${a.label} (${Number(a.minutes)} min)`,
      sub: `(${Math.round(Number(a.kcal))} kcal burned)`,
      art: { src: null, emoji: activityByKey(a.activity_key)?.emoji ?? "🏃" },
    })),
  ].sort((x, y) => x.at.localeCompare(y.at));
  const totals = sumNutrients((entry?.meals ?? []).flatMap((m) => m.meal_items));
  const active = Math.round((entry?.acts ?? []).reduce((s, a) => s + Number(a.minutes), 0));
  const weekday = fromKey(day).toLocaleDateString("en-IN", { weekday: "long" });

  const lead = (month.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const isCurrentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();

  return (
    <Screen>
      <TopBar />
      <header className="-mt-5 text-center">
        <h1 className="font-display text-[32px] leading-tight font-extrabold">Beeta Hua Kal</h1>
        <p className="font-display text-[20px] font-bold">(History)</p>
      </header>

      {view === "day" ? (
        <>
          <div ref={strip} className="no-scrollbar -mx-6 mt-3 flex gap-1 overflow-x-auto border-b border-line px-6 pb-3" role="listbox" aria-label="Pick a day">
            {stripDays.map((d) => {
              const k = dateKey(d);
              const on = k === day;
              return (
                <button
                  key={k}
                  role="option"
                  aria-selected={on}
                  onClick={() => setDay(k)}
                  className={`flex h-[74px] w-[60px] shrink-0 flex-col items-center justify-center rounded-full leading-tight transition ${on ? "bg-teal text-white shadow-teal" : "text-ink"}`}
                >
                  <span className="text-[15px]">{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                  <span className="font-display text-[22px] font-bold">{d.getDate()}</span>
                  {k === todayKey && <span className={`text-[10px] ${on ? "text-white/80" : "text-ink-soft"}`}>(Today)</span>}
                  {k !== todayKey && byDay.has(k) && !on && <span className="mt-0.5 h-1 w-1 rounded-full bg-turmeric" aria-hidden />}
                </button>
              );
            })}
          </div>

          <h2 className="mt-4 text-center font-display text-[22px] leading-tight font-bold">Food Sticker Timeline</h2>
          <p className="text-center text-[15px] text-ink-soft">{fromKey(day).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</p>

          {rows.length ? (
            <ol className="mt-4 flex flex-col gap-4" data-testid="timeline">
              {rows.map((r, i) => (
                <li key={i} className="grid grid-cols-[76px_64px_1fr] items-center gap-3 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="text-right text-[14px] leading-tight">
                    {r.label}
                    <span className="block text-ink-soft">{time(r.at)}</span>
                  </span>
                  <FoodSticker src={r.art.src} emoji={r.art.emoji} size={64} />
                  <span className="leading-tight">
                    <span className="block text-[13px] text-ink-soft">{r.label}</span>
                    <span className="block font-display text-[18px] font-bold">{r.title}</span>
                    <span className="text-[14px] text-ink-soft">{r.sub}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-6 rounded-[18px] bg-card px-5 py-6 text-center font-display text-[18px] text-ink-soft shadow-card">Nothing logged this day — and that&apos;s okay. 🌿</p>
          )}

          {rows.length > 0 && (
            <Card className="mt-5 px-4 py-3" data-testid="day-totals">
              <p className="font-display text-[18px] font-bold">{weekday} Summary:</p>
              <p className="text-[15px]">
                {Math.round(totals.kcal).toLocaleString("en-IN")} kcal | Protein: {Math.round(totals.protein_g)}g{active > 0 ? ` | Active: ${active} min 💪` : ""}
              </p>
            </Card>
          )}

          <button onClick={() => setView("month")} className="mx-auto mt-4 flex items-center gap-2 py-2 font-display text-[17px] font-semibold text-teal">
            View Full Month Calendar <IconCalendar size={20} />
          </button>
        </>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between">
            <button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card"><IconBack size={18} /></button>
            <h2 className="font-display text-[22px] font-bold">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
            <button aria-label="Next month" disabled={isCurrentMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card disabled:opacity-30"><IconChevron size={18} /></button>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label="Days">
            {WEEKDAYS.map((w, i) => <div key={i} className="text-[12px] font-semibold text-ink-soft">{w}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = dateKey(d);
              const e = byDay.get(k);
              const art = e?.meals.length ? mealArt(e.meals.flatMap((m) => m.meal_items)) : null;
              const future = k > todayKey;
              return (
                <button
                  key={i}
                  disabled={future}
                  onClick={() => {
                    setDay(k);
                    setView("day");
                  }}
                  data-date={k}
                  aria-label={`${d.getDate()}${e ? ` — ${e.meals.length} meals logged` : ""}`}
                  className={`flex aspect-[3/4] flex-col items-center gap-0.5 rounded-[14px] pt-1 ${k === todayKey ? "bg-teal text-white" : e ? "bg-card shadow-card" : "bg-card/50"} disabled:opacity-30`}
                >
                  <span className="text-[13px] font-semibold">{d.getDate()}</span>
                  {art && <FoodSticker src={art.src} emoji={art.emoji} size={26} />}
                </button>
              );
            })}
          </div>
          <button onClick={() => setView("day")} className="mx-auto mt-5 py-2 font-display text-[17px] font-semibold text-teal">Back to the timeline</button>
        </>
      )}
    </Screen>
  );
}
