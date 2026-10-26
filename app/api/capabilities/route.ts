import { connection } from "next/server";
import { hasKey } from "@/lib/ai/config";

/** GET /api/capabilities — which AI providers are configured, so the UI can label demo mode. */
export async function GET() {
  await connection();
  return Response.json({ openai: hasKey.openai(), gemini: hasKey.gemini(), glm: hasKey.glm() });
}
