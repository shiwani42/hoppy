/**
 * Drip onboarding (prd.md > Onboarding (Drip)): each question appears only at
 * the moment its answer is first needed, one at a time, in the avatar's voice.
 */

export type DripProfile = {
  height_cm: number | null;
  weight_kg: number | null;
  birth_year: number | null;
  sex: "female" | "male" | null;
  goal_weight_kg: number | null;
  diet_type: string | null;
  created_at: string;
};

export type DripEvent = "meal_logged" | "app_open" | "stages_shown" | "food_suggested" | "morning";

export type QuestionId = "body" | "age_sex" | "goal" | "diet" | "sleep";

export type Question = { id: QuestionId; prompt: string };

export const QUESTIONS: Record<QuestionId, Question> = {
  body: { id: "body", prompt: "Want to know if that fits your day? Tell me your height and weight." },
  age_sex: { id: "age_sex", prompt: "Two more things and I can set your daily calorie target 🎯" },
  goal: { id: "goal", prompt: "Where are we headed together? What's your goal weight?" },
  diet: { id: "diet", prompt: "Before I suggest food — how do you eat?" },
  sleep: { id: "sleep", prompt: "Good morning! How did you sleep last night? 😴" },
};

const isNextDayOrLater = (createdAt: string, now: Date) => {
  const c = new Date(createdAt);
  c.setHours(0, 0, 0, 0);
  const n = new Date(now);
  n.setHours(0, 0, 0, 0);
  return n.getTime() > c.getTime();
};

/**
 * Returns the single question to ask right now, or null.
 * `sleepLoggedToday` lets the morning question ask only once a day.
 */
export function nextQuestion(
  p: DripProfile,
  event: DripEvent,
  opts: { sleepLoggedToday?: boolean; now?: Date } = {},
): Question | null {
  const now = opts.now ?? new Date();
  const needsBody = !p.height_cm || !p.weight_kg;
  const needsAgeSex = !p.birth_year || !p.sex;

  switch (event) {
    case "meal_logged":
      if (needsBody) return QUESTIONS.body;
      if (needsAgeSex) return QUESTIONS.age_sex;
      return null;
    case "app_open":
      // Only continue a conversation the first meal already started.
      if (!needsBody && needsAgeSex) return QUESTIONS.age_sex;
      return null;
    case "stages_shown":
      return p.goal_weight_kg ? null : QUESTIONS.goal;
    case "food_suggested":
      return p.diet_type ? null : QUESTIONS.diet;
    case "morning": {
      const h = now.getHours();
      const secondMorningOrLater = isNextDayOrLater(p.created_at, now);
      return h >= 4 && h < 12 && secondMorningOrLater && !opts.sleepLoggedToday ? QUESTIONS.sleep : null;
    }
  }
}
