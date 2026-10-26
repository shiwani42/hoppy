import "server-only";
import OpenAI from "openai";
import { hasKey, models } from "./config";

let client: OpenAI | null = null;
// Z.ai's API is OpenAI-compatible (spec.md > GLM (Z.ai)).
const glm = () =>
  (client ??= new OpenAI({ apiKey: process.env.GLM_API_KEY!, baseURL: "https://api.z.ai/api/paas/v4/" }));

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Streams a short chat completion as plain text chunks.
 * Returns null without a key so callers can stream the demo reply instead.
 */
export async function streamGlm(messages: ChatMessage[], maxTokens = 200): Promise<ReadableStream<Uint8Array> | null> {
  if (!hasKey.glm()) return null;
  const stream = await glm().chat.completions.create({
    model: models.chat,
    messages,
    stream: true,
    max_tokens: maxTokens,
    temperature: 0.8,
  });
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) controller.enqueue(enc.encode(text));
        }
      } catch (err) {
        console.error("GLM stream failed", err);
      }
      controller.close();
    },
  });
}

/** Non-streaming JSON-mode completion for small parsing jobs. */
export async function glmJson(messages: ChatMessage[]): Promise<unknown | null> {
  if (!hasKey.glm()) return null;
  const res = await glm().chat.completions.create({
    model: models.chat,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.2,
  });
  return JSON.parse(res.choices[0]?.message?.content ?? "null");
}
