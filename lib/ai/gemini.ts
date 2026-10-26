import "server-only";
import { GoogleGenAI } from "@google/genai";
import { hasKey, models } from "./config";
import { avatarPrompt } from "./prompts";

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
