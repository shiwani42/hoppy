import { z } from "zod";
import { spendAiCall } from "@/lib/ai/budget";
import { streamGlm, type ChatMessage } from "@/lib/ai/glm";
import { streamText } from "@/lib/ai/mock";
import { answerLocally } from "@/lib/chat/answer";
import { loadDaySummary } from "@/lib/chat/server";
import { HttpError, route, userFromRequest } from "@/lib/supabase/server";

const Body = z.object({
  question: z.string().trim().min(1).max(400),
  dayStart: z.iso.datetime({ offset: true }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const SYSTEM = `You are Hoppy, a warm, playful avatar of the user living in their calorie tracker for Indian food and yoga.
Answer in 1–3 short sentences using ONLY the numbers in the day summary. Be appreciative, never critical or preachy;
light Hinglish is welcome; at most one emoji. When suggesting food, pick Indian dishes that fit their diet type.
For medical questions (diabetes, BP, medicines, pregnancy, etc.) say kindly that you're not a doctor and suggest
sharing their Hoppy report with one.`;

/** POST /api/chat/ask — answers questions about today from the compact summary. spec.md > Chat */
export const POST = route(async (req) => {
  const { sb } = await userFromRequest(req);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, "Ask me something about your day");
  const { question, dayStart, date } = parsed.data;
  await spendAiCall(sb, "chat");

  const summary = await loadDaySummary(sb, new Date(dayStart), date);
  const local = answerLocally(question, summary);
  const { data: history } = await sb
    .from("chat_messages")
    .select("role, content")
    .eq("kind", "chat")
    .order("created_at", { ascending: false })
    .limit(6);
  await sb.from("chat_messages").insert({ role: "user", content: question });

  const messages: ChatMessage[] = [
    { role: "system", content: `${SYSTEM}\n\nDay summary (JSON): ${JSON.stringify(summary)}` },
    ...((history ?? []).reverse() as ChatMessage[]),
    { role: "user", content: question },
  ];
  let upstream: ReadableStream<Uint8Array> | null = null;
  try {
    upstream = await streamGlm(messages, 220);
  } catch (err) {
    console.error("GLM ask failed", err);
  }
  upstream ??= streamText(local.text);

  // Save the assistant's full answer once the stream finishes.
  let full = "";
  const dec = new TextDecoder();
  const saving = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      full += dec.decode(chunk, { stream: true });
      controller.enqueue(chunk);
    },
    async flush() {
      await sb.from("chat_messages").insert({ role: "assistant", content: full.trim() || local.text, stat: local.stat ?? null });
    },
  });

  return new Response(upstream.pipeThrough(saving), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Hoppy-Stat": local.stat ? encodeURIComponent(JSON.stringify(local.stat)) : "",
      "X-Hoppy-Suggests-Food": local.suggestsFood ? "1" : "0",
    },
  });
});
