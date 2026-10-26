import { transcribeLog } from "@/lib/ai/gemini";
import { hasKey } from "@/lib/ai/config";
import { parseWithFallback } from "@/lib/parse/server";
import { HttpError, route, userFromRequest } from "@/lib/supabase/server";

/** POST /api/log/voice — multipart `audio` → Gemini transcript → same parsing as typed logs. */
export const POST = route(async (req) => {
  await userFromRequest(req);
  if (!hasKey.gemini()) {
    throw new HttpError(501, "Voice needs Gemini; using on-device speech instead");
  }
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) throw new HttpError(400, "No audio received");
  if (audio.size > 5 * 1024 * 1024) throw new HttpError(413, "That recording is too long");

  const transcript = await transcribeLog(Buffer.from(await audio.arrayBuffer()), audio.type || "audio/webm").catch((err) => {
    console.error("Gemini transcription failed", err);
    return null;
  });
  if (!transcript) throw new HttpError(503, "Couldn't hear that clearly. Try again, or type it.");
  return Response.json({ transcript, ...(await parseWithFallback(transcript)) });
});
