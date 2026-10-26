"use client";

import { useState } from "react";
import { searchFoods, type Food } from "@/lib/meals/foods";

/** Manual fallback and "something else": search the Indian food table. */
export function FoodSearch({ onPick, autoFocus }: { onPick: (food: Food) => void; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const results = searchFoods(q, 8);
  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Search: dal, roti, poha…"
        aria-label="Search food"
        className="h-12 w-full rounded-2xl border border-line bg-card px-4 outline-none focus:border-teal"
      />
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-card">
        {results.map((f) => (
          <li key={f.id}>
            <button onClick={() => onPick(f)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-teal-soft">
              <span className="text-2xl" aria-hidden>{f.sticker}</span>
              <span className="flex-1">{f.name}</span>
              <span className="text-sm text-ink-soft">{Math.round((f.per100g.kcal * f.unitGrams) / 100)} kcal / {f.unit}</span>
            </button>
          </li>
        ))}
        {!results.length && <li className="px-4 py-3 text-ink-soft">No match yet. Try a simpler name.</li>}
      </ul>
    </div>
  );
}
