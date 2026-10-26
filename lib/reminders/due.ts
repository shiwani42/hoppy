import { MEAL_REMINDERS } from "@/lib/copy/voice";

/**
 * What to send right now (spec.md > Reminders and Push). The cron job runs every
 * 5 minutes; anything scheduled in the last 10 minutes is due unless it was
 * already sent today, the meal is already logged, or the dose already taken.
 */

export const WINDOW_MIN = 10;

export type ReminderRow = { meal_type: keyof typeof MEAL_REMINDERS; time: string; enabled: boolean };
export type MedRow = { id: string; name: string; dose: string | null; times: string[] };
export type Push = { key: string; title: string; body: string; url: string };
export type SnoozeRow = { id: string; title: string; body: string; url: string; remind_at: string };

/** Water nudges through the day when the user turns them on (Paani Ka Tumbler). */
export const WATER_TIMES = ["10:30", "12:30", "15:00", "17:30", "19:30"];
const WATER_LINES = [
  "Paani break! Your twin is a little thirsty 💧",
  "One glass now and your tumbler fills up a notch 💧",
  "Hydration check — a glass of water, Shabaash in advance 💧",
];

const minutes = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const inWindow = (time: string, now: string) => {
  const d = minutes(now) - minutes(time);
  return d >= 0 && d < WINDOW_MIN;
};

export function duePushes(i: {
  now: string;
  reminders: ReminderRow[];
  meds: MedRow[];
  takenDoses: Set<string>;
  loggedMealTypes: Set<string>;
  sentKeys: Set<string>;
  water?: boolean;
  snoozes?: SnoozeRow[];
  /** Current time, for snoozes (absolute timestamps). */
  at?: Date;
}): Push[] {
  const out: Push[] = [];
  for (const r of i.reminders) {
    const key = `meal:${r.meal_type}`;
    if (r.enabled && inWindow(r.time, i.now) && !i.loggedMealTypes.has(r.meal_type) && !i.sentKeys.has(key)) {
      out.push({ key, title: "Hoppy", body: MEAL_REMINDERS[r.meal_type], url: `/?log=${r.meal_type}` });
    }
  }
  for (const m of i.meds) {
    for (const t of m.times) {
      const key = `med:${m.id}@${t}`;
      if (inWindow(t, i.now) && !i.takenDoses.has(`${m.id}@${t}`) && !i.sentKeys.has(key)) {
        out.push({ key, title: "Hoppy", body: `💊 Time for ${m.name}${m.dose ? ` (${m.dose})` : ""}`, url: "/meds" });
      }
    }
  }
  if (i.water) {
    WATER_TIMES.forEach((t, n) => {
      const key = `water:${t}`;
      if (inWindow(t, i.now) && !i.sentKeys.has(key)) out.push({ key, title: "Hoppy", body: WATER_LINES[n % WATER_LINES.length], url: "/water" });
    });
  }
  for (const s of i.snoozes ?? []) {
    if (new Date(s.remind_at).getTime() <= (i.at ?? new Date()).getTime()) out.push({ key: `snooze:${s.id}`, title: s.title, body: s.body, url: s.url });
  }
  return out;
}

/** The user's local date and HH:MM in their IANA timezone. */
export function localClock(timeZone: string, at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hm: `${parts.hour}:${parts.minute}` };
}
