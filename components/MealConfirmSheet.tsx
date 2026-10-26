"use client";

/* eslint-disable @next/next/no-img-element -- local preview */

import { useState } from "react";
import { FoodSearch } from "@/components/FoodSearch";
import { Sheet } from "@/components/Sheet";
import { itemFromFood, withQuantity } from "@/lib/meals/anchor";
import { sumNutrients } from "@/lib/meals/foods";
import { MEAL_TYPES, type MealItem, type MealType } from "@/lib/meals/types";

const COUNT_UNITS = new Set(["roti", "paratha", "naan", "puri", "piece", "dosa", "egg", "slice", "omelette"]);
const step = (unit: string) => (COUNT_UNITS.has(unit) ? 1 : 0.5);
const fmtQty = (q: number) => (Number.isInteger(q) ? String(q) : q.toFixed(1));

/**
 * One-tap portion and meal-type confirmation (prd.md > Meal Logging (Photo and Voice)).
 * Low-confidence items offer the model's alternatives as quick swaps.
 */
export function MealConfirmSheet({
  open,
  title = "Did I get this right?",
  initialItems,
  initialType,
  photoUrl,
  demo,
  transcript,
  busyLabel = "Log it",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  initialItems: MealItem[];
  initialType: MealType;
  photoUrl?: string;
  demo?: boolean;
  transcript?: string;
  busyLabel?: string;
  onConfirm: (items: MealItem[], type: MealType) => Promise<void> | void;
  onClose: () => void;
}) {
  const [items, setItems] = useState(initialItems);
  const [type, setType] = useState<MealType>(initialType);
  const [adding, setAdding] = useState(initialItems.length === 0);
  const [saving, setSaving] = useState(false);
  const totals = sumNutrients(items);

  const update = (i: number, next: MealItem | null) =>
    setItems((xs) => (next ? xs.map((x, j) => (j === i ? next : x)) : xs.filter((_, j) => j !== i)));

  async function confirm() {
    setSaving(true);
    try {
      await onConfirm(items, type);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {photoUrl && <img src={photoUrl} alt="Your meal" className="mb-4 h-40 w-full rounded-3xl object-cover" />}
      {transcript && <p className="mb-4 rounded-2xl bg-card px-4 py-3 text-ink-soft">“{transcript}”</p>}
      {demo && (
        <p className="mb-4 rounded-2xl bg-turmeric/15 px-4 py-3 text-sm">
          Demo AI: this is a sample meal, not your photo. Connect OpenAI to read real plates. Edit or swap items below.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((it, i) => (
          <li key={`${it.name}-${i}`} className="rounded-3xl bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>{it.sticker}</span>
              <div className="flex-1">
                <p className="font-display text-lg font-semibold leading-tight">{it.name}</p>
                <p className="text-sm text-ink-soft">{Math.round(it.kcal)} kcal · {Math.round(it.protein_g)} g protein</p>
              </div>
              <button aria-label={`Remove ${it.name}`} onClick={() => update(i, null)} className="h-10 w-10 rounded-full text-ink-soft active:bg-line">✕</button>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                aria-label={`Less ${it.name}`}
                disabled={it.quantity <= step(it.unit)}
                onClick={() => update(i, withQuantity(it, it.quantity - step(it.unit)))}
                className="h-12 w-12 rounded-full bg-teal-soft font-display text-2xl text-teal disabled:opacity-30"
              >−</button>
              <span className="min-w-24 text-center font-display text-lg font-semibold">
                {fmtQty(it.quantity)} {it.unit}
              </span>
              <button
                aria-label={`More ${it.name}`}
                onClick={() => update(i, withQuantity(it, it.quantity + step(it.unit)))}
                className="h-12 w-12 rounded-full bg-teal-soft font-display text-2xl text-teal"
              >+</button>
            </div>
            {it.confidence < 0.6 && it.alternatives.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-ink-soft">Not sure — is it one of these?</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {it.alternatives.map((alt) => {
                    const swap = itemFromFood(alt, 1);
                    return (
                      swap && (
                        <button key={alt} onClick={() => update(i, { ...swap, confidence: 1 })} className="rounded-full border border-line bg-cream px-3 py-1.5 text-sm">
                          {alt}
                        </button>
                      )
                    );
                  })}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4">
        {adding ? (
          <FoodSearch
            autoFocus={items.length > 0}
            onPick={(f) => {
              const it = itemFromFood(f.name);
              if (it) setItems((xs) => [...xs, it]);
              setAdding(false);
            }}
          />
        ) : (
          <button onClick={() => setAdding(true)} className="h-12 w-full rounded-full border border-dashed border-teal font-display font-semibold text-teal">
            + Something else
          </button>
        )}
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-ink-soft">Which meal?</legend>
        <div className="flex gap-2">
          {MEAL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`h-11 flex-1 rounded-full font-display font-semibold capitalize ${type === t ? "bg-teal text-white" : "bg-card text-ink"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        onClick={confirm}
        disabled={!items.length || saving}
        className="mt-6 h-14 w-full rounded-full bg-teal font-display text-lg font-semibold text-white shadow-md disabled:opacity-40"
      >
        {saving ? "Saving…" : `${busyLabel} · ${Math.round(totals.kcal)} kcal`}
      </button>
    </Sheet>
  );
}
