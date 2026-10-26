"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URL */

import { mealTotals, type SavedMeal } from "@/lib/meals/client";

/** Zest-style card: one big number, the items, and the avatar's one-liner. */
export function MealCard({
  meal,
  reply,
  onEdit,
  onDelete,
}: {
  meal: SavedMeal;
  reply?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const t = mealTotals(meal);
  const names = meal.meal_items.map((i) => i.name).join(" · ");
  const line = reply ?? meal.reply;
  return (
    <article className="rounded-[1.75rem] bg-card p-4 shadow-sm animate-fade-up">
      <div className="flex gap-4">
        {meal.photo_url ? (
          <img src={meal.photo_url} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 flex-wrap items-center justify-center gap-0.5 rounded-2xl bg-cream text-2xl" aria-hidden>
            {meal.meal_items.slice(0, 4).map((i) => <span key={i.id}>{i.sticker}</span>)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink-soft capitalize">{meal.meal_type} · {names}</p>
          <p className="font-display text-5xl leading-none font-bold">{Math.round(t.kcal)}</p>
          <p className="text-xs text-ink-soft">kcal · estimated{meal.is_demo ? " · demo AI" : ""}</p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          ["Protein", t.protein_g, "text-muscle"],
          ["Fibre", t.fiber_g, "text-digestion"],
          ["Carbs", t.carbs_g, "text-ink"],
          ["Fat", t.fat_g, "text-ink"],
        ].map(([label, v, cls]) => (
          <div key={label as string} className="rounded-2xl bg-cream py-2">
            <dt className="text-xs text-ink-soft">{label}</dt>
            <dd className={`font-display text-lg font-semibold ${cls}`}>{Math.round(v as number)} g</dd>
          </div>
        ))}
      </dl>
      {line !== undefined && line !== null && (
        <p className="mt-3 min-h-6 font-display text-lg leading-snug" aria-live="polite">{line}</p>
      )}
      {(onEdit || onDelete) && (
        <div className="mt-2 flex justify-end gap-1 text-sm">
          {onEdit && <button onClick={onEdit} className="rounded-full px-3 py-2 text-teal">Edit</button>}
          {onDelete && <button onClick={onDelete} className="rounded-full px-3 py-2 text-ink-soft">Delete</button>}
        </div>
      )}
    </article>
  );
}
