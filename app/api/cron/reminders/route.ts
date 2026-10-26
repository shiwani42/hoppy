import { sendPush, type SubscriptionRow } from "@/lib/push/server";
import { duePushes, localClock, type MedRow, type ReminderRow, type SnoozeRow } from "@/lib/reminders/due";
import { route, serviceClient, HttpError } from "@/lib/supabase/server";

/**
 * POST /api/cron/reminders — called every 5 minutes by Supabase pg_cron
 * (spec.md > Reminders and Push). Protected by CRON_SECRET.
 */
export const POST = route(async (req) => {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    throw new HttpError(401, "Unauthorized");
  }
  // Tests may pin the clock outside production.
  const pinned = process.env.NODE_ENV !== "production" ? req.headers.get("x-hoppy-now") : null;
  const at = pinned ? new Date(pinned) : new Date();

  const sb = serviceClient();
  const { data: subs } = await sb.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth");
  const byUser = new Map<string, SubscriptionRow[]>();
  for (const s of (subs ?? []) as SubscriptionRow[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);

  let sent = 0;
  const results: { user: string; key: string; status: number }[] = [];
  for (const [userId, userSubs] of byUser) {
    const { data: profile } = await sb.from("profiles").select("timezone, water_reminders").eq("user_id", userId).single();
    const tz = profile?.timezone ?? "Asia/Kolkata";
    const { date, hm } = localClock(tz, at);
    const since = new Date(at.getTime() - 26 * 3600e3).toISOString();
    const [reminders, meds, logs, meals, sends, snoozes] = await Promise.all([
      sb.from("reminders").select("meal_type, time, enabled").eq("user_id", userId),
      sb.from("meds").select("id, name, dose, times").eq("user_id", userId),
      sb.from("med_logs").select("med_id, time").eq("user_id", userId).eq("date", date),
      sb.from("meals").select("meal_type, eaten_at").eq("user_id", userId).gte("eaten_at", since),
      sb.from("reminder_sends").select("key").eq("user_id", userId).eq("date", date),
      sb.from("snoozes").select("id, title, body, url, remind_at").eq("user_id", userId).eq("sent", false).lte("remind_at", at.toISOString()),
    ]);
    const due = duePushes({
      now: hm,
      reminders: (reminders.data ?? []) as ReminderRow[],
      meds: (meds.data ?? []) as MedRow[],
      takenDoses: new Set((logs.data ?? []).map((l) => `${l.med_id}@${l.time}`)),
      loggedMealTypes: new Set((meals.data ?? []).filter((m) => localClock(tz, new Date(m.eaten_at)).date === date).map((m) => m.meal_type)),
      sentKeys: new Set((sends.data ?? []).map((s) => s.key)),
      water: !!profile?.water_reminders,
      snoozes: (snoozes.data ?? []) as SnoozeRow[],
      at,
    });
    for (const push of due) {
      const statuses = await Promise.all(userSubs.map((s) => sendPush(sb, s, { ...push, tag: push.key })));
      results.push(...statuses.map((status) => ({ user: userId, key: push.key, status })));
      if (statuses.some((st) => st >= 200 && st < 300)) {
        sent++;
        if (push.key.startsWith("snooze:")) await sb.from("snoozes").update({ sent: true }).eq("id", push.key.slice(7));
        else await sb.from("reminder_sends").insert({ user_id: userId, key: push.key, date });
      }
    }
  }
  return Response.json({ sent, results });
});
