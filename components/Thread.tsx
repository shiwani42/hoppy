"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URLs */

import type { ReactNode } from "react";
import { FoodSticker } from "@/components/art";
import { StatIcon } from "@/components/icons";
import { mealArt } from "@/lib/art";
import type { StatCard } from "@/lib/chat/answer";
import type { SavedActivity } from "@/lib/logs/client";
import { mealTotals, type SavedMeal } from "@/lib/meals/client";
import type { StatKey } from "@/lib/rules/stats";

/**
 * The home chat (images/…q65k…png): what you logged in a teal bubble (with the
 * photo), Hoppy's answer in a white card with one big number.
 */

export function UserBubble({ children, photo }: { children: ReactNode; photo?: string }) {
  return (
    <div className="ml-8 flex min-h-[64px] items-center gap-3 self-end overflow-hidden rounded-[22px] rounded-br-[8px] bg-teal py-2 pr-2 pl-4 text-white shadow-[0_10px_24px_rgb(16_104_106/0.25)] animate-fade-up" data-role="user">
      <p className="flex-1 py-1 text-[17px] leading-snug">{children}</p>
      {photo && <img src={photo} alt="Your meal" className="h-[78px] w-[96px] shrink-0 rounded-[16px] object-cover" />}
    </div>
  );
}

export function ReplyCard({ children, big, unit, sub, actions, accent, art }: { children?: ReactNode; big?: string | number; unit?: string; sub?: ReactNode; actions?: ReactNode; accent?: StatKey; art?: ReactNode }) {
  return (
    <div className="mr-6 self-start rounded-[22px] rounded-tl-[8px] bg-card px-4 pt-3 pb-3 shadow-card animate-fade-up" data-role="assistant">
      {children && (
        <div className="flex gap-2">
          {accent && <span className="mt-0.5 shrink-0"><StatIcon k={accent} size={20} /></span>}
          <p className="text-[17px] leading-snug" aria-live="polite">{children}</p>
        </div>
      )}
      {big !== undefined && (
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="font-display text-[40px] leading-none font-extrabold tracking-[-0.01em]">
            {big}
            {unit && <span className="ml-1.5">{unit}</span>}
          </p>
          {art}
        </div>
      )}
      {(sub || actions) && (
        <div className="mt-1 flex items-center gap-2">
          {sub && <p className="flex-1 text-[14px] text-ink-soft">{sub}</p>}
          {actions && <div className="-my-1 ml-auto flex shrink-0 items-center gap-0.5 text-[13px]">{actions}</div>}
        </div>
      )}
    </div>
  );
}

/** A soft sand bubble: drip questions, reminders, invitations. Tapping it opens the thing. */
export function PromptBubble({ children, onClick, action, label }: { children: ReactNode; onClick?: () => void; action?: ReactNode; label?: string }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(e) => onClick && (e.key === "Enter" || e.key === " ") && onClick()}
      className={`mr-4 self-start rounded-[20px] bg-sand px-4 py-3 text-left shadow-[0_2px_10px_rgb(60_40_10/0.06)] animate-fade-up ${onClick ? "cursor-pointer active:scale-[.99]" : ""}`}
    >
      <p className="font-display text-[17px] leading-snug font-bold text-ink">
        {children} {action}
      </p>
    </div>
  );
}

const COUNT = new Set(["roti", "paratha", "naan", "puri", "piece", "dosa", "egg", "slice", "omelette"]);
const fmtQty = (q: number) => (Number.isInteger(q) ? String(q) : String(Math.round(q * 10) / 10));

/** "2 roti and dal" from the items, the way someone would say it. */
export function sayMeal(m: Pick<SavedMeal, "meal_items">) {
  const parts = m.meal_items.map((i) => {
    const n = i.name.split(" /")[0].toLowerCase();
    const q = Number(i.quantity);
    if (q === 1) return n;
    if (q === 0.5) return `half ${COUNT.has(i.unit) ? "a" : "a " + i.unit} ${n}`;
    return COUNT.has(i.unit) ? `${fmtQty(q)} ${n}` : `${fmtQty(q)} ${i.unit} ${n}`;
  });
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "a meal");
}

export function MealEntry({ meal, reply, onEdit, onDelete }: { meal: SavedMeal; reply?: string; onEdit?: () => void; onDelete?: () => void }) {
  const t = mealTotals(meal);
  const kcal = Math.round(t.kcal);
  const line = reply ?? meal.reply ?? `Shabaash! That's about ${kcal} kcal. Adding to your day! 💪`;
  const art = mealArt(meal.meal_items);
  return (
    <>
      <UserBubble photo={meal.photo_url}>
        just had {sayMeal(meal)}
      </UserBubble>
      <ReplyCard
        big={kcal}
        unit="kcal"
        art={!meal.photo_url && <FoodSticker src={art.src} emoji={art.emoji} size={44} />}
        sub={
          <>
            {Math.round(t.protein_g)}g protein | {Math.round(t.fiber_g)}g fiber{meal.is_demo ? " · demo AI" : ""}
          </>
        }
        actions={
          (onEdit || onDelete) && (
            <>
              {onEdit && <button onClick={onEdit} className="rounded-full px-2.5 py-1.5 font-semibold text-teal">Edit</button>}
              {onDelete && <button onClick={onDelete} className="rounded-full px-2.5 py-1.5 text-ink-faint">Remove</button>}
            </>
          )
        }
      >
        {line}
      </ReplyCard>
    </>
  );
}

export function ActivityEntry({ a, onDelete }: { a: SavedActivity; onDelete?: () => void }) {
  const kcal = Math.round(Number(a.kcal));
  return (
    <>
      <UserBubble>
        {a.label} · {Number(a.minutes)} min
      </UserBubble>
      <ReplyCard
        accent="strength"
        big={kcal}
        unit="kcal"
        sub={<>burned · +{Math.round(Number(a.active_minutes))} min Strength</>}
        actions={onDelete && <button onClick={onDelete} className="rounded-full px-2.5 py-1.5 text-ink-faint">Remove</button>}
      >
        Badhiya! Your muscles say thank you.
      </ReplyCard>
    </>
  );
}

export function AnswerCard({ content, stat, nudge }: { content: string; stat?: StatCard | null; nudge?: boolean }) {
  return (
    <ReplyCard
      accent={nudge ? "energy" : undefined}
      big={stat ? stat.value : undefined}
      unit={stat?.unit}
      sub={stat?.target ? `${stat.label} today · of ${stat.target} ${stat.unit}` : stat ? `${stat.label} today` : undefined}
    >
      {content || "…"}
    </ReplyCard>
  );
}
