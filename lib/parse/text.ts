import { itemFromFood } from "@/lib/meals/anchor";
import { findFood } from "@/lib/meals/foods";
import type { MealItem } from "@/lib/meals/types";
import { ACTIVITIES, MINUTES_PER_SURYA_ROUND, type Activity } from "@/lib/rules/activity";

/**
 * Free, instant parsing of typed or spoken logs in English, Hindi-in-Latin and
 * Hinglish ("2 roti, dal, thodi bhindi", "30 min brisk walk", "12 rounds surya
 * namaskar"). AI is only called when this returns `unknown` (token savings).
 */

export type ParsedActivity = { key: string; label: string; emoji: string; met: number; minutes: number | null };
/**
 * One log can carry several things ("25 min brisk walk aur do glass paani"):
 * the kind is the main one; `waterMl`, and food `items` beside an activity, ride along.
 */
export type Parsed =
  | { kind: "meal"; items: MealItem[]; unknown: string[]; waterMl?: number; activity?: ParsedActivity }
  | { kind: "activity"; activity: ParsedActivity; waterMl?: number; items?: MealItem[] }
  | { kind: "water"; waterMl: number }
  | { kind: "unknown" };

/** Spoken numbers before a unit ("pachis minute", "do glass") become digits. */
const COUNT_WORDS: Record<string, number> = {
  ek: 1, one: 1, do: 2, two: 2, teen: 3, three: 3, char: 4, chaar: 4, four: 4, paanch: 5, panch: 5, five: 5,
  chhe: 6, six: 6, saat: 7, seven: 7, aath: 8, eight: 8, nau: 9, nine: 9, das: 10, ten: 10, barah: 12, twelve: 12,
  pandrah: 15, fifteen: 15, bees: 20, twenty: 20, pachis: 25, pacchis: 25, twentyfive: 25, tees: 30, thirty: 30,
  chalis: 40, chaalis: 40, forty: 40, paintalis: 45, pachas: 50, pachaas: 50, fifty: 50,
};
const UNIT_AHEAD = "(?=\\s*(?:min|mins|minute|minutes|minat|ghanta|ghante|hour|hours|glass|glasses|gilaas|bottle|bottles|rounds?|litre|liter|l)\\b)";
const digitize = (t: string) =>
  t.replace(new RegExp(`\\b(${Object.keys(COUNT_WORDS).join("|")})\\b${UNIT_AHEAD}`, "g"), (w) => String(COUNT_WORDS[w]));

const WATER_WORD = /\b(paani|pani|water|jal|nimbu paani)\b/;

/** Millilitres of plain water in a chunk like "2 glass paani" or "500 ml water" (null if none). */
function waterIn(chunk: string): number | null {
  if (!WATER_WORD.test(chunk) || /\b(nariyal|coconut)\b/.test(chunk)) return null;
  const m = chunk.match(/(\d+(?:\.\d+)?)\s*(ml|l|litres?|liters?|glass(?:es)?|gilaas|bottles?)\b/);
  if (!m) return 250;
  const n = Number(m[1]);
  const unit = m[2];
  const ml = unit === "ml" ? n : /^(l|lit)/.test(unit) ? n * 1000 : /^bottle/.test(unit) ? n * 1000 : n * 250;
  return ml > 0 && ml <= 5000 ? Math.round(ml) : null;
}

const NUMBER_WORDS: Record<string, number> = {
  ek: 1, one: 1, a: 1, an: 1, do: 2, two: 2, teen: 3, three: 3, char: 4, chaar: 4, four: 4,
  paanch: 5, panch: 5, five: 5, chhe: 6, six: 6, half: 0.5, aadha: 0.5, adha: 0.5,
  dedh: 1.5, dhai: 2.5, thoda: 0.5, thodi: 0.5, little: 0.5, some: 1, bowl: 1, katori: 1, plate: 1,
};

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9.\s,;+&-]/g, " ").replace(/\s+/g, " ").trim();

function findActivity(text: string): Activity | undefined {
  let best: { a: Activity; len: number } | undefined;
  for (const a of ACTIVITIES) {
    for (const key of [a.label.toLowerCase().replace(/\s*\(.*\)/, ""), ...a.aliases]) {
      const k = key.toLowerCase();
      const re = new RegExp(`\\b${k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`);
      if (k.length >= 3 && re.test(text) && (!best || k.length > best.len)) best = { a, len: k.length };
    }
  }
  return best?.a;
}

function durationMinutes(text: string, activity: Activity): number | null {
  const rounds = text.match(/(\d+)\s*(rounds?|cycles?|sets?)\b/);
  if (rounds && activity.key === "surya-namaskar") return Math.round(Number(rounds[1]) * MINUTES_PER_SURYA_ROUND);
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|ghanta|ghante)\b/);
  const mins = text.match(/(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes|minat)\b/);
  const total = (hours ? Number(hours[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0);
  if (total) return total;
  if (/\bhalf an? hour\b|\baadha ghanta\b/.test(text)) return 30;
  if (/\ban? hour\b|\bek ghanta\b/.test(text)) return 60;
  return null;
}

function parseChunk(chunk: string): MealItem | null {
  const words = chunk.split(" ").filter(Boolean);
  let qty = 1;
  const first = words[0];
  if (first && /^\d+(\.\d+)?$/.test(first)) {
    qty = Number(first);
    words.shift();
  } else if (first && first in NUMBER_WORDS && words.length > 1) {
    qty = NUMBER_WORDS[first];
    words.shift();
  }
  const rest = words.join(" ").replace(/\b(pcs?|pieces?|nos?)\b/g, "").trim();
  if (!rest) return null;
  const food = findFood(rest);
  return food ? itemFromFood(food.name, qty > 0 && qty <= 20 ? qty : 1) : null;
}

export function parseLog(input: string): Parsed {
  // Filler words around the food ("maine … khaya", "I just had …") carry no meaning here.
  const text = digitize(norm(input))
    .replace(/\b(i|maine|mene|just|had|have|ate|eaten|eat|khaya|khayi|khaaya|liya|li|kiya|ki|drank|piya|pi|for|my|lunch|dinner|breakfast|nashta)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return { kind: "unknown" };

  // Water and a workout can sit beside food in one sentence; pull them out first.
  let waterMl = 0;
  let activity: ParsedActivity | undefined;
  const food: string[] = [];
  for (const part of text.split(/\s*(?:,|;|\band\b|\baur\b|\bthen\b|\bphir\b)\s*/).filter(Boolean)) {
    const ml = waterIn(part);
    if (ml) {
      waterMl += ml;
      continue;
    }
    const act = !activity ? findActivity(part) : undefined;
    if (act) {
      activity = { key: act.key, label: act.label, emoji: act.emoji, met: act.met, minutes: durationMinutes(part, act) };
      continue;
    }
    food.push(part);
  }
  const water = waterMl ? { waterMl } : {};
  const meal = food.length ? parseMeal(food.join(", ")) : null;

  if (activity) return { kind: "activity", activity, ...water, ...(meal?.items.length ? { items: meal.items } : {}) };
  if (meal && meal.items.length) return { kind: "meal", items: meal.items, unknown: meal.unknown, ...water };
  if (waterMl) return { kind: "water", waterMl };
  return { kind: "unknown" };
}

function parseMeal(text: string) {
  const chunks = text.split(/\s*(?:,|;|\+|&|\band\b|\baur\b|\bwith\b|\bke saath\b|\bsaath\b)\s*/).filter(Boolean);
  const items: MealItem[] = [];
  const unknown: string[] = [];
  for (const c of chunks) {
    const it = parseChunk(c);
    if (it) items.push(it);
    else unknown.push(c);
  }
  return { items, unknown };
}

/** Questions go straight to the chat instead of the log parser. */
export function isQuestion(text: string) {
  const s = text.trim().toLowerCase();
  return /\?$/.test(s) || /^(how|what|why|when|which|can|could|should|is|are|do|does|did|am|kya|kitna|kitni|kitne|kaise|kab|kyu|kyun|tell me|show me|suggest)\b/.test(s);
}
