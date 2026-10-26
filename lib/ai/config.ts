import "server-only";

/**
 * Model routing (spec.md > Research and AI decisions / External Services).
 * Every model id is overridable from the environment because provider ids change
 * often; defaults are the ones listed in the spec, to verify against official docs.
 */
export const models = {
  mealVision: process.env.OPENAI_VISION_MODEL ?? "gpt-6.1-sol",
  voice: process.env.GEMINI_FLASH_MODEL ?? "gemini-3.8-flash",
  /** The twin: OpenAI images first (strong face likeness, transparent PNGs), Gemini image as backup. */
  twinImage: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5",
  twinQuality: (process.env.OPENAI_IMAGE_QUALITY ?? "medium") as "low" | "medium" | "high",
  avatar: process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image-preview",
  report: process.env.GEMINI_REPORT_MODEL ?? "gemini-4-argon",
  chat: process.env.GLM_CHAT_MODEL ?? "glm-4.7-flash",
};

/**
 * Hoppy runs end to end without keys: a provider with no key falls back to the
 * labeled mock responses in lib/ai/mock.ts (checklist.md > Revisions).
 */
export const hasKey = {
  openai: () => Boolean(process.env.OPENAI_API_KEY),
  gemini: () => Boolean(process.env.GEMINI_API_KEY),
  glm: () => Boolean(process.env.GLM_API_KEY),
};
