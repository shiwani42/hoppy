import manifest from "@/public/art/manifest.json";

/**
 * Which generated food stickers exist (public/art/manifest.json, written by
 * scripts/make-art.mjs). Food ids without their own art borrow a close dish.
 */
const BORROW: Record<string, string> = {
  roti: "dal-chawal-roti", paratha: "dal-chawal-roti", "aloo-paratha": "dal-chawal-roti", naan: "dal-chawal-roti", puri: "dal-chawal-roti",
  rice: "dal-chawal-roti", "brown-rice": "dal-chawal-roti", "jeera-rice": "dal-chawal-roti",
  "dal-tadka": "dal-chawal-roti", "dal-makhani": "dal-chawal-roti",
  idli: "idli-sambar", sambar: "idli-sambar",
  chai: "chai", coffee: "chai",
  khichdi: "khichdi", kadhi: "khichdi",
};

const have = new Set<string>(manifest.food);

export function foodArt(foodId: string | null | undefined): string | null {
  if (!foodId) return null;
  if (have.has(foodId)) return `/art/food/${foodId}.png`;
  const b = BORROW[foodId];
  return b && manifest.stickers.includes(b) ? `/art/stickers/${b}.png` : null;
}

/** The sticker for a whole meal: the first item that has art, else its emoji. */
export function mealArt(items: { food_id: string | null; sticker?: string | null }[]) {
  for (const it of items) {
    const a = foodArt(it.food_id);
    if (a) return { src: a, emoji: it.sticker ?? "🍽️" };
  }
  return { src: null, emoji: items[0]?.sticker ?? "🍽️" };
}

export function expertPhoto(path: string | null | undefined) {
  if (!path) return null;
  const file = path.split("/").pop()!.replace(/\.\w+$/, "");
  return manifest.experts.includes(file) ? path : null;
}
