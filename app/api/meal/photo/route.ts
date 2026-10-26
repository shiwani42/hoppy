import { spendAiCall } from "@/lib/ai/budget";
import { analyzePhoto } from "@/lib/meals/analyze";
import { HttpError, route, userFromRequest } from "@/lib/supabase/server";

const MAX_BYTES = 6 * 1024 * 1024;

/** POST /api/meal/photo — multipart `photo` → stored photo + anchored items. spec.md > Meal Logging */
export const POST = route(async (req) => {
  const { sb, user } = await userFromRequest(req);
  const form = await req.formData().catch(() => null);
  const photo = form?.get("photo");
  if (!(photo instanceof Blob) || photo.size === 0) throw new HttpError(400, "Attach a photo");
  if (photo.size > MAX_BYTES) throw new HttpError(413, "That photo is too large");
  await spendAiCall(sb, "meal_photo");

  const bytes = Buffer.from(await photo.arrayBuffer());
  const mimeType = photo.type || "image/jpeg";
  const photo_path = `${user.id}/${Date.now()}.jpg`;
  const up = await sb.storage.from("meals").upload(photo_path, bytes, { contentType: mimeType });
  if (up.error) throw up.error;

  try {
    // "Try a sample meal" sends the bundled photo (public/art/sample-meal.jpg).
    const analysis = await analyzePhoto(bytes, mimeType, form?.get("sample") === "1");
    return Response.json({ photo_path, ...analysis });
  } catch {
    throw new HttpError(503, "I'm a bit slow right now. Search for your dish instead?");
  }
});
