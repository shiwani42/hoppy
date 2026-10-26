import { findFood, FOODS, type Food } from "@/lib/meals/foods";
import type { DaySummary } from "./summary";

/**
 * Understands the common questions about the day without a model: which stat is
 * asked about (for the big-number card), whether Hoppy is suggesting food (to
 * trigger the diet-type drip question), and a warm answer from real numbers.
 * GLM writes richer answers when configured; this is the free path.
 */

export type Intent = "protein" | "fiber" | "calories" | "water" | "sleep" | "exercise" | "can_i_have" | "suggest" | "medical" | "other";
export type StatCard = { label: string; value: number; unit: string; target?: number | null };
export type Answer = { intent: Intent; text: string; stat?: StatCard; suggestsFood: boolean };

const r = Math.round;

export function detectIntent(q: string): Intent {
  const s = q.toLowerCase();
  if (/diabet|sugar level|blood sugar|\bbp\b|blood pressure|thyroid|pcos|kidney|pregnan|medicine|medication|tablet|cholesterol|heart (problem|disease)/.test(s)) return "medical";
  if (/what (should|can) i eat|suggest|idea|recommend|kya kha(u|oon|un)|next meal|snack/.test(s)) return "suggest";
  if (/(can|may|should) i (have|eat|drink)|kha sakt|kha lu|kha loon|allowed to eat|is .* ok to eat/.test(s)) return "can_i_have";
  if (/protein/.test(s)) return "protein";
  if (/fib(re|er)|digest/.test(s)) return "fiber";
  if (/water|pani|paani|hydrat/.test(s)) return "water";
  if (/sleep|neend|rest/.test(s)) return "sleep";
  if (/exercis|workout|burn|active|walk|yoga|strength|steps/.test(s)) return "exercise";
  if (/calor|kcal|budget|left today|remaining|energy/.test(s)) return "calories";
  return "other";
}

const MEAT = new Set(["chicken-biryani", "chicken-curry", "butter-chicken", "tandoori-chicken", "fish-curry", "mutton-curry"]);
const EGG = new Set(["egg-curry", "boiled-egg", "omelette"]);
const DAIRY = new Set(["curd", "raita", "milk", "lassi", "chaas", "kheer", "paneer-butter-masala", "paneer-tikka", "palak-paneer", "chai", "coffee"]);
const ROOT = new Set(["aloo-paratha", "aloo-sabzi", "aloo-gobi", "samosa", "pav-bhaji"]);

export function fitsDiet(f: Food, diet: DaySummary["diet"]) {
  if (!diet || diet === "non-veg") return true;
  if (MEAT.has(f.id)) return false;
  if (diet === "egg") return true;
  if (EGG.has(f.id)) return false;
  if (diet === "jain") return !ROOT.has(f.id);
  if (diet === "vegan") return !DAIRY.has(f.id);
  return true;
}

/**
 * Foods that close a protein or fibre gap for the fewest calories (the user is
 * usually trying to lose weight): ranked by nutrient per kcal, among portions
 * that deliver a meaningful amount. Until the user has told us how they eat,
 * suggestions stay vegetarian.
 */
export function suggestFoods(diet: DaySummary["diet"], nutrient: "protein_g" | "fiber_g", n = 3) {
  const minPerPortion = nutrient === "protein_g" ? 5 : 2.5;
  return FOODS.filter((f) => fitsDiet(f, diet ?? "veg") && (f.per100g[nutrient] * f.unitGrams) / 100 >= minPerPortion)
    .map((f) => ({ f, per: f.per100g[nutrient] / f.per100g.kcal }))
    .sort((a, b) => b.per - a.per)
    .slice(0, n)
    .map(({ f }) => f);
}

const list = (fs: Food[]) => fs.map((f) => `${f.sticker} ${f.name.toLowerCase()}`).join(", ");

export function answerLocally(question: string, d: DaySummary): Answer {
  const intent = detectIntent(question);
  const t = d.today;
  const g = d.targets;
  const net = r(t.kcal_in - t.kcal_out);
  switch (intent) {
    case "protein": {
      const left = g.protein_g ? g.protein_g - t.protein_g : null;
      const low = left !== null && left > 15;
      return {
        intent,
        stat: { label: "Protein", value: r(t.protein_g), unit: "g", target: g.protein_g },
        suggestsFood: low,
        text: g.protein_g
          ? `${r(t.protein_g)} g of your ${g.protein_g} g today.` +
            (low ? ` A little more would make my muscles happy — maybe ${list(suggestFoods(d.diet, "protein_g", 2))}? 💪` : " Shabaash, muscles are fed! 💪")
          : `${r(t.protein_g)} g so far. Tell me your weight and I'll set your protein target.`,
      };
    }
    case "fiber": {
      const low = g.fiber_g - t.fiber_g > 8;
      return {
        intent,
        stat: { label: "Fibre", value: r(t.fiber_g), unit: "g", target: g.fiber_g },
        suggestsFood: low,
        text: `${r(t.fiber_g)} g of ${g.fiber_g} g fibre.` + (low ? ` My tummy would love ${list(suggestFoods(d.diet, "fiber_g", 2))} 🌾` : " Digestion is smiling 🌾"),
      };
    }
    case "calories":
      return {
        intent,
        stat: { label: "Net calories", value: net, unit: "kcal", target: g.kcal },
        suggestsFood: false,
        text: g.kcal
          ? `${r(t.kcal_in)} in, ${r(t.kcal_out)} out — ${net} net of your ${g.kcal}. ` +
            (net < g.kcal - 150 ? `About ${g.kcal - net} left for today.` : net <= g.kcal + 150 ? "Right in your sweet spot ✨" : "A bit over, and that's okay — a walk later evens it out.")
          : `${r(t.kcal_in)} kcal in and ${r(t.kcal_out)} out so far. Tell me a little about you and I'll set your target.`,
      };
    case "water":
      return {
        intent,
        stat: { label: "Water", value: Math.round(t.water_ml / 100) / 10, unit: "L", target: g.water_ml / 1000 },
        suggestsFood: false,
        text: t.water_ml >= g.water_ml ? "Tumbler's full — beautifully hydrated 💧" : `${(t.water_ml / 1000).toFixed(1)} of ${(g.water_ml / 1000).toFixed(1)} L. A glass now? Tap the tumbler 💧`,
      };
    case "sleep":
      return {
        intent,
        stat: t.sleep_h != null ? { label: "Sleep", value: t.sleep_h, unit: "h", target: 7 } : undefined,
        suggestsFood: false,
        text: t.sleep_h == null ? "You haven't told me about last night yet — log it from my stat sheet 😴" : t.sleep_h >= 7 ? `${t.sleep_h} h — well rested!` : `${t.sleep_h} h. An early night would recharge us both 🌙`,
      };
    case "exercise":
      return {
        intent,
        stat: { label: "Active", value: r(t.active_min), unit: "min", target: g.active_min },
        suggestsFood: false,
        text: t.workouts.length
          ? `${t.workouts.join(", ")} — ${r(t.kcal_out)} kcal burned. ` + (t.active_min >= g.active_min ? "Strength bar is full! 💪" : "A short walk would top me up.")
          : "No workout yet today. Even 15 minutes of brisk walking counts — want to log one?",
      };
    case "can_i_have": {
      const food = findFood(question.replace(/.*(have|eat|drink|kha)\s+/i, "").replace(/\?.*/, "")) ?? findFood(question);
      if (!food) return { intent, suggestsFood: false, text: "Tell me the dish and I'll tell you how it fits today 🙂" };
      const kcal = r((food.per100g.kcal * food.unitGrams) / 100);
      const left = g.kcal ? g.kcal - net : null;
      return {
        intent,
        stat: { label: food.name, value: kcal, unit: `kcal / ${food.unit}` },
        suggestsFood: false,
        text:
          left === null
            ? `One ${food.unit} is about ${kcal} kcal. Enjoy it mindfully!`
            : kcal <= left
              ? `Yes! One ${food.unit} is about ${kcal} kcal and you have ~${left} left. Enjoy 😊`
              : `One ${food.unit} is about ${kcal} kcal — a bit more than today's ~${Math.max(0, left)} left. Have half, or add a walk later. Your call!`,
      };
    }
    case "suggest": {
      const needProtein = g.protein_g ? g.protein_g - t.protein_g : 0;
      const needFiber = g.fiber_g - t.fiber_g;
      const nutrient = needProtein >= needFiber ? "protein_g" : "fiber_g";
      return {
        intent,
        suggestsFood: true,
        text: `How about ${list(suggestFoods(d.diet, nutrient, 3))}? Good for your ${nutrient === "protein_g" ? "muscles" : "digestion"} today.`,
      };
    }
    case "medical":
      return {
        intent,
        suggestsFood: false,
        text: "That's a question for your doctor — I'm a wellness buddy, not medical advice. I can export your report from Reports for them 🩺",
      };
    default:
      return {
        intent,
        suggestsFood: false,
        text: "Ask me about today's protein, fibre, calories, water, sleep or workouts — or what to eat next 🙂",
      };
  }
}
