/**
 * Every line the avatar says, in one place so the tone stays warm,
 * appreciative and lightly Hinglish (prd.md > Look and Feel — voice of the copy).
 */

export const pick = <T,>(xs: readonly T[], seed = Math.random()) => xs[Math.floor(seed * xs.length) % xs.length];

export const MEAL_REPLIES = {
  protein: ["Protein power! My muscles say shukriya 💪", "That's muscle fuel. Shabaash!", "Ooh, strong choice. I can feel it already."],
  fiber: ["Fibre-rich! My tummy is doing a happy dance.", "Digestion says thank you, ji 🌾", "Sabzi for the win. Gut feeling: great."],
  light: ["Light and lovely. Nicely done.", "Simple ghar ka khana — the best kind.", "Balanced plate, happy me."],
  treat: ["A treat is part of the journey. Enjoy it! 😊", "Plot twist accepted. We're still on track.", "Life needs a little mithas. All good."],
  default: ["Logged! Thanks for feeding me well.", "Got it — that's in the book.", "Yum. Noted with love."],
} as const;

export const NOT_FOOD = "That doesn't look like food 👀 Try again, or tell me what you ate.";
export const AI_SLOW = "I'm a bit slow right now — try again in a moment?";
