// DEV ONLY — writes sample past days so stage-ups, streaks, reports and the
// leaderboard can be demoed without waiting weeks. Never run against production.
//
//   node scripts/seed-days.mjs --latest                 # newest user, 22 strong days of the last 28
//   node scripts/seed-days.mjs --user <uuid> --strong 10 --days 28
//   node scripts/seed-days.mjs --latest --bad-week      # last 7 days weak (stage must hold)
//   node scripts/seed-days.mjs --latest --kg-per-week 0.5
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
if (!/127\.0\.0\.1|localhost/.test(env.NEXT_PUBLIC_SUPABASE_URL)) {
  console.error("Refusing to seed a non-local Supabase project.");
  process.exit(1);
}
const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let userId = arg("--user");
if (args.includes("--latest")) {
  const { data } = await sb.from("profiles").select("user_id, name").not("name", "is", null).order("created_at", { ascending: false }).limit(1);
  userId = data?.[0]?.user_id;
  console.log(`Seeding ${data?.[0]?.name} (${userId})`);
}
if (!userId) {
  console.error("Pass --user <uuid> or --latest");
  process.exit(1);
}

const days = Number(arg("--days", 28));
const strong = Number(arg("--strong", 22));
const badWeek = args.includes("--bad-week");
const { data: profile } = await sb.from("profiles").select("weight_kg").eq("user_id", userId).single();
// Simulate steady loss at a safe pace (default 0.75 kg/week), ending at today's weight.
const kgPerWeek = Number(arg("--kg-per-week", 0.75));
const nowKg = Number(profile?.weight_kg ?? 75);
const startKg = Math.round((nowKg + (days / 7) * kgPerWeek) * 10) / 10;

// Spread the weak days evenly through the period; --bad-week makes the last 7 weak.
const weakEvery = strong >= days ? Infinity : days / (days - strong);
const isWeak = (i) => (badWeek && i <= 7) || Math.floor(i / weakEvery) !== Math.floor((i - 1) / weakEvery);

const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const rows = [];
const weights = [];
for (let i = days; i >= 1; i--) {
  const d = new Date(Date.now() - i * 864e5);
  const isStrong = !isWeak(i);
  const lvl = isStrong ? 80 + (i % 15) : 30 + (i % 25);
  rows.push({
    user_id: userId, date: key(d), strength: lvl, muscle: lvl - 5, digestion: lvl - 10, hydration: lvl, energy: lvl + 5 > 100 ? 100 : lvl + 5, rest: lvl,
    strong_day: isStrong, kcal_in: isStrong ? 1450 + (i % 7) * 30 : 1900 + (i % 5) * 60, kcal_out: isStrong ? 180 + (i % 4) * 40 : 40,
    protein_g: isStrong ? 55 + (i % 6) : 32, fiber_g: isStrong ? 26 + (i % 5) : 12, water_ml: isStrong ? 2000 : 900,
    active_minutes: isStrong ? 35 + (i % 4) * 5 : 8, sleep_hours: isStrong ? 7.5 : 5.5,
    weight_kg: Math.round((startKg - ((days - i) / days) * (startKg - nowKg)) * 10) / 10,
  });
  if (i % 3 === 0) weights.push({ user_id: userId, date: key(d), kg: rows.at(-1).weight_kg });
}
const s1 = await sb.from("daily_snapshots").upsert(rows);
const s2 = await sb.from("weights").upsert(weights);
const s3 = await sb.from("profiles").update({ start_weight_kg: startKg }).eq("user_id", userId);
if (s1.error || s2.error || s3.error) throw s1.error ?? s2.error ?? s3.error;
console.log(`${rows.length} days written (${rows.filter((r) => r.strong_day).length} strong), ${weights.length} weigh-ins.`);
