/**
 * Every line the avatar says, in one place so the tone stays warm,
 * appreciative and lightly Hinglish (prd.md > Look and Feel — voice of the copy).
 */

export const pick = <T,>(xs: readonly T[], seed = Math.random()) => xs[Math.floor(seed * xs.length) % xs.length];

export const MEAL_REPLIES = {
  protein: ["Protein power! Good for your muscles 💪", "That's solid muscle fuel. Shabaash!", "Strong choice — protein well covered."],
  fiber: ["Fibre-rich — great for digestion 🌾", "Good fibre there, ji 🌾", "Sabzi for the win. Your gut will thank you."],
  light: ["Light and balanced. Nicely done.", "Simple ghar ka khana — the best kind.", "A balanced plate. Well done."],
  treat: ["A treat is part of the journey. Enjoy it! 😊", "All good — one treat doesn't change the week.", "Life needs a little mithas. All good."],
  default: ["Logged! Thanks for keeping track.", "Got it — that's in today's log.", "Noted. Shabaash for logging!"],
} as const;

export const NOT_FOOD = "That doesn't look like food 👀 Try again, or tell me what you ate.";
export const AI_SLOW = "I'm a bit slow right now — try again in a moment?";

/** Low-stat nudges, in character (prd.md > Daily Stats — "heyy my muscles are cramping"). */
export const NUDGES = {
  hydration: ["Heyy, my throat feels like a desert 🏜️ One glass of water?", "Paani break? Tap the tumbler for me 💧"],
  muscle: ["Heyy my muscles are cramping 🥲 protein please!", "My biceps are asking for dal, paneer or eggs 💪"],
  strength: ["I'm getting stiff sitting here… a 15-minute walk? 🚶", "Let's stretch our legs! Even 10 minutes counts."],
  digestion: ["My tummy wants some fibre — sabzi, fruit or sprouts? 🌾", "Gut check: a little salad would make me very happy 🥗"],
} as const;

/** Which stat a saved nudge line was about (nudges are stored as plain chat text). */
export function nudgeKeyOf(line: string): keyof typeof NUDGES | "" {
  return (Object.keys(NUDGES) as (keyof typeof NUDGES)[]).find((k) => (NUDGES[k] as readonly string[]).includes(line)) ?? "";
}

export const MEAL_REMINDERS = {
  breakfast: "Good morning! What's for nashta? Snap it 📸",
  lunch: "Lunch? Snap it, or just tell me 🍛",
  snack: "Snack time? Tell me what you had 🍌",
  dinner: "Dinner time! Snap your plate 🍽️",
} as const;
