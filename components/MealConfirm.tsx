"use client";

/* eslint-disable @next/next/no-img-element -- local preview */

import { useState } from "react";
import { FoodSticker } from "@/components/art";
import { FoodSearch } from "@/components/FoodSearch";
import { IconMinus, IconPlus, IconTrash } from "@/components/icons";
import { Overlay } from "@/components/Overlay";
import { BackButton, Button, Chip, Title } from "@/components/ui";
import { itemFromFood, withQuantity } from "@/lib/meals/anchor";
import { sumNutrients } from "@/lib/meals/foods";
import { MEAL_TYPES, type MealItem, type MealType } from "@/lib/meals/types";

const COUNT_UNITS = new Set(["roti", "paratha", "naan", "puri", "piece", "dosa", "egg", "slice", "omelette"]);
const step = (unit: string) => (COUNT_UNITS.has(unit) ? 1 : 0.5);
const fmtQty = (q: number) => (Number.isInteger(q) ? String(q) : q.toFixed(1).replace(/\.0$/, ""));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "1 Katori (medium bowl)", "0.5 Katori (half bowl)", "2 Rotis". */
export function portionLabel(qty: number, unit: string): { main: string; sub?: string } {
  const plural = COUNT_UNITS.has(unit) && qty !== 1 ? (unit === "piece" ? "Pieces" : `${cap(unit)}s`) : cap(unit);
  const main = `${fmtQty(qty)} ${plural}`;
  const sub: Record<string, string> = { katori: qty <= 0.5 ? "half bowl" : qty < 1 ? "small bowl" : "medium bowl", plate: qty < 1 ? "half plate" : "full plate", cup: "150 ml", glass: "250 ml", handful: "small fistful" };
  return { main, sub: sub[unit] };
}

/**
 * "Confirm Lunch" (images/…5benes…png, left): the photo, what Hoppy recognised
 * with katori portions, a saffron calorie total, and the meal type.
 */
export function MealConfirm({
  initialItems,
  initialType,
  photoUrl,
  demo,
  transcript,
  editing,
  onConfirm,
  onClose,
}: {
  initialItems: MealItem[];
  initialType: MealType;
  photoUrl?: string;
  demo?: boolean;
  transcript?: string;
  editing?: boolean;
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
    <Overlay label={`Confirm ${type}`} onClose={onClose}>
      <div className="flex flex-1 flex-col px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6">
        <div className="flex items-center">
          <BackButton label="Cancel" />
        </div>
        <Title align="center" sub={editing ? "Change anything that's off" : "Double-check the details below"} className="-mt-2">
          {editing ? "Edit" : "Confirm"} {cap(type)}
        </Title>

        {photoUrl ? (
          <img src={photoUrl} alt="Your meal" className="mt-4 aspect-[2/1] w-full rounded-[18px] object-cover shadow-card" />
        ) : transcript ? (
          <p className="mt-4 rounded-[18px] border border-line bg-card px-4 py-3 text-center font-display text-[18px] italic">“{transcript}”</p>
        ) : null}
        {demo && (
          <p className="mt-3 rounded-[14px] bg-saffron-soft px-3 py-2 text-[13px] leading-snug">
            Demo AI: a sample reading, not your photo. Connect OpenAI to read real plates — edit anything below.
          </p>
        )}

        {items.length > 0 && <h2 className="mt-5 mb-2 font-display text-[18px] font-bold">Recognised items</h2>}
        <ul className="flex flex-col gap-2.5">
          {items.map((it, i) => {
            const p = portionLabel(it.quantity, it.unit);
            const atMin = it.quantity <= step(it.unit);
            return (
              <li key={`${it.name}-${i}`}>
                <div className="flex gap-2.5">
                  <div className="flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-[#e6dcc9] bg-card px-3">
                    <FoodSticker foodId={it.food_id} emoji={it.sticker} size={30} />
                    <span className="font-display text-[17px] leading-tight font-semibold">{it.name}</span>
                  </div>
                  <div className="flex h-14 w-[164px] shrink-0 items-stretch overflow-hidden rounded-[14px] border border-[#e6dcc9] bg-card">
                    <button
                      aria-label={atMin ? `Remove ${it.name}` : `Less ${it.name}`}
                      onClick={() => update(i, atMin ? null : withQuantity(it, it.quantity - step(it.unit)))}
                      className="flex w-10 items-center justify-center text-ink active:bg-cream"
                    >
                      {atMin ? <IconTrash size={18} /> : <IconMinus size={20} />}
                    </button>
                    <span className="flex flex-1 flex-col items-center justify-center border-x border-[#efe6d6] text-center leading-tight" aria-live="polite">
                      <span className="font-display text-[16px] font-semibold">{p.main}</span>
                      {p.sub && <span className="text-[11px] text-ink-soft">({p.sub})</span>}
                    </span>
                    <button aria-label={`More ${it.name}`} onClick={() => update(i, withQuantity(it, it.quantity + step(it.unit)))} className="flex w-10 items-center justify-center text-ink active:bg-cream">
                      <IconPlus size={20} />
                    </button>
                  </div>
                </div>
                {it.confidence < 0.6 && it.alternatives.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-1">
                    <span className="text-[13px] text-ink-soft">Not sure — is it</span>
                    {it.alternatives.map((alt) => {
                      const swap = itemFromFood(alt, 1);
                      return (
                        swap && (
                          <button key={alt} onClick={() => update(i, { ...swap, confidence: 1 })} className="rounded-full border border-[#e4d8c4] bg-card px-3 py-1 text-[13px]">
                            {alt}
                          </button>
                        )
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {adding && (
          <div className="mt-3">
            <FoodSearch
              autoFocus={items.length > 0}
              onPick={(f) => {
                const it = itemFromFood(f.name);
                if (it) setItems((xs) => [...xs, it]);
                setAdding(false);
              }}
            />
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-4 rounded-[16px] bg-turmeric px-4 py-3 text-center text-white shadow-[0_10px_22px_rgb(220_152_19/0.3)]" data-testid="meal-total">
            <p className="font-display text-[26px] leading-tight font-bold">Est. Calories: {Math.round(totals.kcal)} kcal</p>
            <p className="font-display text-[15px] font-semibold opacity-95">
              Protein: {Math.round(totals.protein_g)}g | Fiber: {Math.round(totals.fiber_g)}g
            </p>
          </div>
        )}

        <h2 className="mt-5 mb-2 font-display text-[18px] font-bold">Which meal?</h2>
        <div className="flex gap-2" role="group" aria-label="Meal type">
          {MEAL_TYPES.map((t) => (
            <Chip key={t} selected={type === t} onClick={() => setType(t)} className="min-w-0 flex-1 px-1 text-[15px]">
              {cap(t)}
            </Chip>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <Button onClick={confirm} disabled={!items.length || saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Looks good, add it!"}
          </Button>
          {!adding && (
            <button onClick={() => setAdding(true)} className="mt-3 h-11 w-full font-display text-[18px] font-semibold text-ink-faint">
              Add something else
            </button>
          )}
        </div>
      </div>
    </Overlay>
  );
}
