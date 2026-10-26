/**
 * Daily targets — spec.md > Rules Engine (research-backed, no AI).
 *
 * Sources:
 * - BMR: Mifflin–St Jeor equation (Am J Clin Nutr 1990;51:241–7).
 * - Maintenance = BMR × 1.2 (sedentary baseline); logged exercise is added separately.
 * - Calorie target = maintenance − 500 kcal (~0.5 kg/week), floored at 1,200 (F) / 1,500 (M).
 * - Protein: ICMR-NIN Nutrient Requirements for Indians 2020 — RDA 0.83 g/kg/day; 1 g/kg/day for
 *   cereal-based diets with lower-quality protein (applied to veg, Jain and vegan diets).
 * - Fibre: ICMR-NIN 2020 — 40 g per 2,000 kcal of intake (applied to the day's calorie target).
 * - Activity: ICMR-NIN Dietary Guidelines 2024 — at least 30–45 min of moderate activity a day.
 * - Water: ~2.0 L (F) / 2.5 L (M) of fluids a day (EFSA adequate intake, drinks share).
 * - Sleep: 7–9 h for adults (AASM/SRS consensus).
 */

export type Sex = "female" | "male";
export type DietType = "veg" | "egg" | "non-veg" | "jain" | "vegan";

export type BodyInfo = {
  sex?: Sex | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  dietType?: DietType | null;
};

export type Targets = {
  /** null until sex, age, height and weight are known ("tell me more to unlock"). */
  calories: number | null;
  maintenance: number | null;
  /** null until weight is known. */
  proteinG: number | null;
  fiberG: number;
  waterMl: number;
  activeMinutes: number;
  sleepHours: { min: number; max: number };
};

export const REFERENCE_KCAL = 2000;
export const ACTIVE_MINUTES_TARGET = 30;

export function bmr({ sex, age, heightCm, weightKg }: Required<Omit<BodyInfo, "dietType">>) {
  const base = 10 * weightKg! + 6.25 * heightCm! - 5 * age!;
  return base + (sex === "male" ? 5 : -161);
}

export function computeTargets(body: BodyInfo): Targets {
  const { sex, age, heightCm, weightKg, dietType } = body;
  const complete = sex && age && heightCm && weightKg;

  let maintenance: number | null = null;
  let calories: number | null = null;
  if (complete) {
    maintenance = Math.round(bmr({ sex, age, heightCm, weightKg }) * 1.2);
    const floor = sex === "male" ? 1500 : 1200;
    calories = Math.max(floor, maintenance - 500);
  }

  const cerealBased = dietType === "veg" || dietType === "jain" || dietType === "vegan";
  const proteinG = weightKg ? Math.round(weightKg * (cerealBased ? 1 : 0.83)) : null;
  const fiberG = Math.round((40 * (calories ?? REFERENCE_KCAL)) / 2000);
  const waterMl = sex === "male" ? 2500 : sex === "female" ? 2000 : 2250;

  return {
    calories,
    maintenance,
    proteinG,
    fiberG,
    waterMl,
    activeMinutes: ACTIVE_MINUTES_TARGET,
    sleepHours: { min: 7, max: 9 },
  };
}

export function ageFromBirthYear(birthYear?: number | null, now = new Date()) {
  return birthYear ? now.getFullYear() - birthYear : null;
}
