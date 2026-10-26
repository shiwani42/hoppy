import "server-only";
import type { AiMealT } from "./schemas";

/**
 * Labeled demo responses used when a provider key is missing
 * (checklist.md > Revisions). They exercise every flow end to end;
 * the UI marks results from here as "demo".
 */

const SAMPLE_MEALS: AiMealT[] = [
  {
    is_food: true,
    items: [
      { name: "Dal tadka", quantity: 1, unit: "katori", grams: 150, kcal: 180, protein_g: 9.8, fiber_g: 5.3, carbs_g: 22, fat_g: 6, sodium_mg: 495, confidence: 0.82, alternatives: [] },
      { name: "Steamed rice", quantity: 1, unit: "katori", grams: 150, kcal: 195, protein_g: 4, fiber_g: 0.6, carbs_g: 42, fat_g: 0.5, sodium_mg: 2, confidence: 0.9, alternatives: [] },
      { name: "Bhindi sabzi", quantity: 1, unit: "katori", grams: 120, kcal: 114, protein_g: 2.8, fiber_g: 4.6, carbs_g: 9.6, fat_g: 7.2, sodium_mg: 336, confidence: 0.55, alternatives: ["Mixed veg curry", "Aloo sabzi"] },
    ],
  },
  {
    is_food: true,
    items: [
      { name: "Roti / chapati", quantity: 3, unit: "roti", grams: 120, kcal: 317, protein_g: 10.4, fiber_g: 5.3, carbs_g: 60, fat_g: 4.4, sodium_mg: 360, confidence: 0.88, alternatives: [] },
      { name: "Paneer butter masala", quantity: 1, unit: "katori", grams: 150, kcal: 375, protein_g: 13.5, fiber_g: 2.3, carbs_g: 13.5, fat_g: 30, sodium_mg: 630, confidence: 0.7, alternatives: ["Shahi paneer"] },
      { name: "Kachumber salad", quantity: 1, unit: "katori", grams: 100, kcal: 25, protein_g: 1, fiber_g: 1.8, carbs_g: 5, fat_g: 0.2, sodium_mg: 120, confidence: 0.75, alternatives: [] },
    ],
  },
  {
    is_food: true,
    items: [
      { name: "Idli", quantity: 3, unit: "piece", grams: 120, kcal: 162, protein_g: 5, fiber_g: 1.8, carbs_g: 33.6, fat_g: 0.7, sodium_mg: 324, confidence: 0.9, alternatives: [] },
      { name: "Sambar", quantity: 1, unit: "katori", grams: 150, kcal: 105, protein_g: 4.8, fiber_g: 3.8, carbs_g: 13.5, fat_g: 3.8, sodium_mg: 495, confidence: 0.85, alternatives: [] },
    ],
  },
  {
    is_food: true,
    items: [
      { name: "Poha", quantity: 1, unit: "plate", grams: 200, kcal: 260, protein_g: 5.2, fiber_g: 3, carbs_g: 44, fat_g: 7.6, sodium_mg: 560, confidence: 0.86, alternatives: ["Upma"] },
      { name: "Masala chai", quantity: 1, unit: "cup", grams: 150, kcal: 90, protein_g: 3, fiber_g: 0, carbs_g: 12, fat_g: 3, sodium_mg: 45, confidence: 0.8, alternatives: [] },
    ],
  },
];

/** Deterministic per photo, so the same picture gives the same demo meal. */
export function mockMeal(image: Buffer): AiMealT {
  let h = 0;
  for (let i = 0; i < image.length; i += 97) h = (h * 31 + image[i]) >>> 0;
  return SAMPLE_MEALS[h % SAMPLE_MEALS.length];
}

/** Streams a canned reply a few characters at a time, like a model would. */
export function streamText(text: string, delayMs = 18): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const chars = Array.from(text); // code points, so emoji aren't split
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i += 4) parts.push(chars.slice(i, i + 4).join(""));
  return new ReadableStream({
    async start(controller) {
      for (const p of parts) {
        controller.enqueue(enc.encode(p));
        await new Promise((r) => setTimeout(r, delayMs));
      }
      controller.close();
    },
  });
}
