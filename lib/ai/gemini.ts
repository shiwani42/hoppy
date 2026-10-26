import "server-only";
import { GoogleGenAI } from "@google/genai";
import { hasKey, models } from "./config";
import { z } from "zod";
import { avatarPrompt } from "./prompts";
import { AiMeal, type AiMealT } from "./schemas";

let client: GoogleGenAI | null = null;
function gemini() {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return client;
}

/**
 * Generates one body-stage avatar from the selfie. Returns null when no key is
 * configured, so the caller can fall back to the placeholder avatar.
 */
export async function generateAvatarImage(
  selfie: { bytes: Buffer; mimeType: string },
  stage: number,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  if (!hasKey.gemini()) return null;
  const res = await gemini().models.generateContent({
    model: models.avatar,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: selfie.mimeType, data: selfie.bytes.toString("base64") } },
          { text: avatarPrompt(stage) },
        ],
      },
    ],
  });
  const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) throw new Error("Gemini returned no image");
  return {
    bytes: Buffer.from(part.inlineData.data, "base64"),
    mimeType: part.inlineData.mimeType ?? "image/png",
  };
}

/** Structured JSON from Gemini Flash for an inline file (photo or audio) plus a prompt. */
export async function geminiJson<T extends z.ZodType>(
  schema: T,
  file: { bytes: Buffer; mimeType: string },
  prompt: string,
): Promise<z.infer<T> | null> {
  if (!hasKey.gemini()) return null;
  const res = await gemini().models.generateContent({
    model: models.voice,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType: file.mimeType, data: file.bytes.toString("base64") } }, { text: prompt }],
      },
    ],
    config: { responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(schema) },
  });
  return schema.parse(JSON.parse(res.text ?? "null"));
}

/** Backup meal-photo reader when OpenAI fails or is rate-limited (spec.md > Important Failure Modes). */
export async function analyzeMealPhotoGemini(image: Buffer, mimeType: string, prompt: string): Promise<AiMealT | null> {
  return geminiJson(AiMeal, { bytes: image, mimeType }, prompt);
}

/** Hinglish-aware transcription of a short voice log (spec.md > Meal Logging — voice). */
export async function transcribeLog(audio: Buffer, mimeType: string): Promise<string | null> {
  if (!hasKey.gemini()) return null;
  const res = await gemini().models.generateContent({
    model: models.voice,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: audio.toString("base64") } },
          {
            text:
              "Transcribe this short food or exercise log from an Indian user. It may be English, Hindi or Hinglish. " +
              "Write Hindi words in Latin script (e.g. 'do roti, thodi bhindi'), numbers as digits, no commentary.",
          },
        ],
      },
    ],
  });
  return res.text?.trim() || null;
}

/** Plain text from the larger report model (spec.md > Reports — on demand, cached). */
export async function geminiReport(prompt: string): Promise<string | null> {
  if (!hasKey.gemini()) return null;
  const res = await gemini().models.generateContent({ model: models.report, contents: prompt });
  return res.text?.trim() || null;
}
