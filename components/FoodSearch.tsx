"use client";

import { useState } from "react";
import { FoodSticker } from "@/components/art";
import { IconSearch } from "@/components/icons";
import { searchFoods, type Food } from "@/lib/meals/foods";

/** Manual fallback and "Add something else": search the Indian food table. */
export function FoodSearch({ onPick, autoFocus }: { onPick: (food: Food) => void; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const results = searchFoods(q, 6);
  return (
    <div>
      <label className="flex h-13 items-center gap-2 rounded-[14px] border border-[#e6dcc9] bg-card px-4 focus-within:border-teal">
        <IconSearch size={20} className="text-ink-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={autoFocus}
          placeholder="Search: dal, roti, poha…"
          aria-label="Search food"
          className="h-12 min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-ink-faint"
        />
      </label>
      <ul className="mt-2 overflow-hidden rounded-[16px] border border-[#f1e8d8] bg-card shadow-card">
        {results.map((f) => (
          <li key={f.id} className="border-b border-[#f3ecdf] last:border-0">
            <button onClick={() => onPick(f)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-teal-soft">
              <FoodSticker foodId={f.id} emoji={f.sticker} size={36} />
              <span className="flex-1 font-display text-[16px] font-semibold">{f.name}</span>
              <span className="text-[13px] text-ink-soft">{Math.round((f.per100g.kcal * f.unitGrams) / 100)} kcal / {f.unit}</span>
            </button>
          </li>
        ))}
        {!results.length && <li className="px-4 py-3 text-ink-soft">No match yet. Try a simpler name.</li>}
      </ul>
    </div>
  );
}
