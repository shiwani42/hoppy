// DEV ONLY — turns one local user into "Suresh", 32 days into his Hoppy journey,
// with three friends, meds, meals and the twin art cut from the reference images
// (public/art/demo). Used to check every screen against images/*.png.
//
//   node scripts/seed-demo.mjs --user <uuid>
import { createClient } from "@supabase/supabase-js";
import { existsSync, readdirSync, readFileSync } from "node:fs";

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
const userId = args[args.indexOf("--user") + 1];
if (!args.includes("--user") || !userId) {
  console.error("Pass --user <uuid>");
  process.exit(1);
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = (r) => {
  if (r.error) throw r.error;
  return r.data;
};

const FOODS = Object.fromEntries(JSON.parse(readFileSync(new URL("../data/indian-foods.json", import.meta.url), "utf8")).foods.map((f) => [f.id, f]));
const item = (id, qty) => {
  const f = FOODS[id];
  const grams = f.unitGrams * qty;
  const n = (k) => Math.round(((f.per100g[k] * grams) / 100) * 10) / 10;
  return { name: f.name, quantity: qty, unit: f.unit, grams, kcal: n("kcal"), protein_g: n("protein_g"), fiber_g: n("fiber_g"), carbs_g: n("carbs_g"), fat_g: n("fat_g"), sodium_mg: n("sodium_mg"), sticker: f.sticker, food_id: f.id };
};
const biscuits = { name: "Marie biscuits", quantity: 2, unit: "piece", grams: 14, kcal: 60, protein_g: 1, fiber_g: 0.3, carbs_g: 10, fat_g: 1.8, sodium_mg: 50, sticker: "🍪", food_id: null };

const DAY = 864e5;
const at = (daysAgo, hh, mm) => {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hh, mm, 0, 0);
  return d;
};
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const iso = (d) => d.toISOString();

async function wipe(uid) {
  for (const t of ["meals", "activities", "water_logs", "sleep_logs", "weights", "daily_snapshots", "meds", "chat_messages", "avatar_stages", "avatar_poses", "cheers", "shared_cards"]) {
    const col = t === "cheers" ? "to_id" : "user_id";
    must(await sb.from(t).delete().eq(col, uid));
  }
}

async function snapshots(uid, days, strongEvery, startKg, nowKg) {
  const rows = [];
  for (let i = days; i >= 1; i--) {
    const d = new Date(Date.now() - i * DAY);
    const strong = strongEvery(i);
    const lvl = strong ? 80 + (i % 15) : 35 + (i % 25);
    rows.push({
      user_id: uid, date: key(d), strength: lvl, muscle: lvl - 5, digestion: lvl - 10, hydration: lvl, energy: Math.min(100, lvl + 5), rest: lvl,
      strong_day: strong, kcal_in: strong ? 1500 + (i % 7) * 30 : 1950, kcal_out: strong ? 2000 + (i % 4) * 40 : 1800,
      protein_g: strong ? 52 + (i % 6) : 30, fiber_g: strong ? 26 + (i % 5) : 12, water_ml: strong ? 2200 : 900,
      active_minutes: strong ? 35 + (i % 4) * 5 : 8, sleep_hours: strong ? 7.5 : 5.5,
      weight_kg: Math.round((startKg - ((days - i) / days) * (startKg - nowKg)) * 10) / 10,
    });
  }
  must(await sb.from("daily_snapshots").upsert(rows));
}

async function meal(uid, when, type, items, extra = {}) {
  const m = must(await sb.from("meals").insert({ user_id: uid, eaten_at: iso(when), meal_type: type, source: extra.photo_path ? "photo" : "manual", photo_path: extra.photo_path ?? null, reply: extra.reply ?? null }).select("id").single());
  must(await sb.from("meal_items").insert(items.map((it) => ({ ...it, meal_id: m.id, user_id: uid }))));
}

async function upload(path, file, type) {
  must(await sb.storage.from("avatars").upload(path, readFileSync(new URL(`../public/art/${file}`, import.meta.url)), { contentType: type, upsert: true }));
}

// ---- Suresh -------------------------------------------------------------
await wipe(userId);
const created = new Date(Date.now() - 31 * DAY);
must(
  await sb.from("profiles").upsert({
    user_id: userId, name: "Suresh", sex: "male", birth_year: 1973, height_cm: 172, weight_kg: 82, start_weight_kg: 83.8, goal_weight_kg: 78.8,
    diet_type: "veg", current_stage: 2, stage_changed_at: key(new Date(Date.now() - 18 * DAY)), created_at: iso(created),
    milestones: { stage: 2, streak: 7 }, asked: {}, timezone: "Asia/Kolkata",
  }),
);

// Twin art: the set made by scripts/make-demo-twins.mjs when present, else crops from the mockups.
async function uploadTwin(uid, person) {
  const dir = new URL(`../public/art/demo/${person}/`, import.meta.url);
  const made = existsSync(new URL("bust.webp", dir)) ? readdirSync(dir).filter((f) => f.endsWith(".webp")) : null;
  if (made) {
    for (const f of made) {
      const name = f.replace(".webp", "");
      const path = `${uid}/${name.startsWith("stage-") ? name : `pose-${name}`}.webp`;
      await upload(path, `demo/${person}/${f}`, "image/webp");
      if (name.startsWith("stage-")) must(await sb.from("avatar_stages").upsert({ user_id: uid, stage: Number(name.slice(6)), image_path: path, is_placeholder: false }));
      else must(await sb.from("avatar_poses").upsert({ user_id: uid, pose: name, image_path: path }));
    }
    return true;
  }
  return false;
}

// A selfie on file: Home and settings expect one (scripts/make-art.mjs demo makes it).
const selfie = new URL("./demo/selfie-suresh.jpg", import.meta.url);
if (existsSync(selfie)) {
  must(await sb.storage.from("selfies").upload(`${userId}/selfie.jpg`, readFileSync(selfie), { contentType: "image/jpeg", upsert: true }));
} else {
  must(await sb.storage.from("selfies").upload(`${userId}/selfie.jpg`, readFileSync(new URL("../public/art/demo/bust.png", import.meta.url)), { contentType: "image/png", upsert: true }));
}
must(await sb.from("profiles").update({ selfie_path: `${userId}/selfie.jpg` }).eq("user_id", userId));

if (!(await uploadTwin(userId, "suresh"))) {
  const stages = { 1: "demo/pose-reach.png", 2: "demo/pose-stand.png", 3: "demo/pose-namaste.png", 4: "demo/pose-namaste.png", 5: "demo/pose-reach.png" };
  for (const [n, file] of Object.entries(stages)) {
    await upload(`${userId}/stage-${n}.png`, file, "image/png");
    must(await sb.from("avatar_stages").upsert({ user_id: userId, stage: Number(n), image_path: `${userId}/stage-${n}.png`, is_placeholder: false }));
  }
  for (const pose of ["bust", "drink", "stretch", "wave"]) {
    await upload(`${userId}/pose-${pose}.png`, `demo/${pose}.png`, "image/png");
    must(await sb.from("avatar_poses").upsert({ user_id: userId, pose, image_path: `${userId}/pose-${pose}.png` }));
  }
}

// 31 past days: strong most days, 12 strong since the stage-up 18 days ago (60% to In Rhythm).
await snapshots(userId, 31, (i) => (i <= 18 ? [1, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17].includes(i) : i % 4 !== 0), 83.8, 82.1);
must(await sb.from("weights").upsert([31, 24, 17, 10, 3].map((i, k) => ({ user_id: userId, date: key(new Date(Date.now() - i * DAY)), kg: [83.8, 83.4, 82.9, 82.5, 82.1][k] }))));
must(await sb.from("weights").upsert({ user_id: userId, date: key(new Date()), kg: 82 }));

// The last week of meals (a 7-day streak) — the Food Sticker Timeline.
for (let d = 6; d >= 1; d--) {
  await meal(userId, at(d, 8, 30), "breakfast", [item("idli", 2), item("sambar", 1)]);
  await meal(userId, at(d, 13, 15), "lunch", [item("dal-tadka", 1), item("rice", 1), item("roti", 1)]);
  await meal(userId, at(d, 17, 30), "snack", [item("chai", 1), biscuits]);
  await meal(userId, at(d, 20, 45), "dinner", [item("khichdi", 1), item("kadhi", 0.5)]);
  must(await sb.from("water_logs").insert(Array.from({ length: 8 }, (_, i) => ({ user_id: userId, at: iso(at(d, 8 + i, 0)), ml: 250 }))));
  if (d % 2 === 0) must(await sb.from("activities").insert({ user_id: userId, done_at: iso(at(d, 7, 0)), activity_key: "walk-brisk", label: "Brisk walk", minutes: 35, met: 4.3, kcal: 205, active_minutes: 35, source: "voice" }));
}

// Today: breakfast, a photo lunch, a morning walk, 7 glasses, 6.5 h sleep.
must(await sb.storage.from("meals").upload(`${userId}/sample-lunch.jpg`, readFileSync(new URL("../public/art/sample-meal.jpg", import.meta.url)), { contentType: "image/jpeg", upsert: true }));
await meal(userId, at(0, 8, 40), "breakfast", [item("poha", 1), item("chai", 1)], { reply: "Poha and chai — a classic start! Light and steady. ☀️" });
await meal(userId, at(0, 13, 5), "lunch", [item("dal-tadka", 1), item("rice", 1), item("aloo-gobi", 0.5)], { photo_path: `${userId}/sample-lunch.jpg` });
must(await sb.from("activities").insert({ user_id: userId, done_at: iso(at(0, 7, 10)), activity_key: "walk-brisk", label: "Brisk walk", minutes: 25, met: 4.3, kcal: 148, active_minutes: 25, source: "voice" }));
must(await sb.from("water_logs").insert(Array.from({ length: 7 }, (_, i) => ({ user_id: userId, at: iso(at(0, 8 + i, 10)), ml: 250 }))));
must(await sb.from("sleep_logs").upsert({ user_id: userId, date: key(new Date()), hours: 6.5 }));

const meds = must(await sb.from("meds").insert([
  { user_id: userId, name: "Morning Multivitamin", kind: "supplement", times: ["07:00"] },
  { user_id: userId, name: "Evening Triphala", kind: "supplement", times: ["21:00"] },
  { user_id: userId, name: "Daily Fish Oil", kind: "supplement", dose: "1 capsule", times: ["21:00"] },
]).select("id, name"));
must(await sb.from("med_logs").insert({ user_id: userId, med_id: meds[0].id, date: key(new Date()), time: "07:00" }));

// ---- Friends --------------------------------------------------------------
const FRIENDS = [
  { name: "Priya Shah", stage: 2, strong: 7, streak: 14, sex: "female" },
  { name: "Amit Kumar", stage: 1, strong: 5, streak: 5, sex: "male" },
  { name: "Rajesh", stage: 1, strong: 4, streak: 3, sex: "male" },
];
for (const f of FRIENDS) {
  const email = `demo-${f.name.split(" ")[0].toLowerCase()}@hoppy.local`;
  const list = must(await sb.auth.admin.listUsers({ perPage: 200 }));
  let u = list.users.find((x) => x.email === email);
  if (!u) u = must(await sb.auth.admin.createUser({ email, password: crypto.randomUUID(), email_confirm: true })).user;
  must(await sb.from("profiles").upsert({ user_id: u.id, name: f.name, sex: f.sex, current_stage: f.stage }));
  await wipe(u.id);
  await uploadTwin(u.id, f.name.split(" ")[0].toLowerCase());
  await snapshots(u.id, 7, (i) => i <= f.strong, 75, 74);
  for (let d = f.streak - 1; d >= 0; d--) await meal(u.id, at(d, 13, 0), "lunch", [item("dal-tadka", 1), item("roti", 2)]);
  must(await sb.from("friendships").upsert([{ user_id: userId, friend_id: u.id }, { user_id: u.id, friend_id: userId }]));
  if (f.name === "Priya Shah") must(await sb.from("cheers").insert({ from_id: u.id, to_id: userId }));
}

// Suresh: 6 strong days this week.
must(await sb.from("daily_snapshots").update({ strong_day: false }).eq("user_id", userId).eq("date", key(new Date(Date.now() - 7 * DAY))));
console.log(`Seeded Suresh (${userId}) with ${FRIENDS.length} friends.`);
