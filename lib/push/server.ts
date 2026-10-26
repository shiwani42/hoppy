import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:hoppy@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type SubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };

/**
 * Sends one notification; removes subscriptions the push service says are gone.
 * Returns the push service's HTTP status (201 = accepted).
 */
export async function sendPush(
  sb: SupabaseClient,
  sub: SubscriptionRow,
  payload: { title: string; body: string; url: string; tag?: string },
): Promise<number> {
  configure();
  try {
    const res = await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    );
    return res.statusCode;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status === 404 || status === 410) await sb.from("push_subscriptions").delete().eq("id", sub.id);
    else console.error("push failed", status, (err as Error).message);
    return status;
  }
}
