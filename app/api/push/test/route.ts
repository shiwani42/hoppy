import { sendPush, type SubscriptionRow } from "@/lib/push/server";
import { route, serviceClient, userFromRequest } from "@/lib/supabase/server";

/** POST /api/push/test — "Send me a test notification" from Settings. */
export const POST = route(async (req) => {
  const { sb } = await userFromRequest(req);
  const [{ data }, { data: profile }] = await Promise.all([
    sb.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth"),
    sb.from("profiles").select("name").single(),
  ]);
  const body = `Hi ${profile?.name ?? "there"}! Reminders are on 🎉`;
  const statuses = await Promise.all(
    ((data ?? []) as SubscriptionRow[]).map((s) => sendPush(serviceClient(), s, { title: "Hoppy", body, url: "/" })),
  );
  return Response.json({ sent: statuses.filter((s) => s >= 200 && s < 300).length, statuses });
});
