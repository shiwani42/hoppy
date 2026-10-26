import type { StatKey } from "@/lib/rules/stats";

/** Display names, colours and unlock hints for the six stats (prd.md > Daily Stats). */
export const STAT_META: Record<StatKey, { label: string; emoji: string; color: string; fills: string; unlock?: string }> = {
  strength: { label: "Strength", emoji: "💪", color: "var(--color-strength)", fills: "exercise & yoga" },
  muscle: { label: "Muscle", emoji: "🥚", color: "var(--color-muscle)", fills: "protein", unlock: "Tell me your weight to unlock" },
  digestion: { label: "Digestion", emoji: "🌾", color: "var(--color-digestion)", fills: "fibre" },
  hydration: { label: "Hydration", emoji: "💧", color: "var(--color-hydration)", fills: "water" },
  energy: { label: "Energy", emoji: "⚡", color: "var(--color-energy)", fills: "calories in vs out", unlock: "Tell me a bit more about you to unlock" },
  rest: { label: "Rest", emoji: "😴", color: "var(--color-rest)", fills: "sleep", unlock: "I'll ask how you slept tomorrow morning" },
};
