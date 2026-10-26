import "server-only";

/**
 * Model routing (spec.md > Research and AI decisions / External Services).
 * Every model id is overridable from the environment because provider ids change
 * often; defaults are the ones listed in the spec, to verify against official docs.
 */
type ImageQuality = "low" | "medium" | "high" | "xhigh" | "max";

export const models = {
  mealVision: process.env.OPENAI_VISION_MODEL ?? "gpt-6.1-sol",
  voice: process.env.GEMINI_FLASH_MODEL ?? "gemini-3.8-flash",
  /**
   * The twin: OpenAI images first, Gemini image as backup. Side by side on the same
   * selfie (2026-10-27), gpt-image-2.5-flare gave a properly stylised 3D twin that
   * keeps the likeness in ~23 s; sunburst stayed half-photographic and took ~39 s.
   * gpt-image-1.x retire on 2026-12-01. Pricing (Oct 2026, 1024², before input
   * images): low ≈ $0.006, medium ≈ $0.013, high ≈ $0.04–0.05, max ≈ $0.21.
   */
  twinImage: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-flare",
  /** The portrait carries the likeness and is made once: high. Poses and stages copy it: medium. */
  twinPortraitQuality: (process.env.OPENAI_PORTRAIT_QUALITY ?? "high") as ImageQuality,
  twinQuality: (process.env.OPENAI_IMAGE_QUALITY ?? "medium") as ImageQuality,
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
