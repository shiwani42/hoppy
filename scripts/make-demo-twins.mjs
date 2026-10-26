// DEV ONLY — makes the demo people's twins through Hoppy's real pipeline (the local
// dev server + OpenAI), then saves them to public/art/demo/<person>/ for scripts/seed-demo.mjs.
// Needs `npm run dev` on :3000 and OPENAI_API_KEY in .env.local; selfies come from
// `node scripts/make-art.mjs demo`. Run: node scripts/make-demo-twins.mjs [person…]
import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const env = {};
for (const line of (await readFile(new URL("../.env.local", import.meta.url), "utf8")).split("\n")) {
  const i = line.indexOf("=");
  if (i > 0 && !line.startsWith("#")) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
if (!/127\.0\.0\.1|localhost/.test(env.NEXT_PUBLIC_SUPABASE_URL)) {
  console.error("Refusing to run against a non-local Supabase project.");
  process.exit(1);
}
const BASE = "http://localhost:3000";
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PEOPLE = {
  suresh: { name: "Suresh", poses: ["bust", "drink", "stretch", "walk", "wave", "cheer"], stages: [1, 2, 3, 4, 5] },
  priya: { name: "Priya Shah", poses: ["bust"], stages: [] },
  amit: { name: "Amit Kumar", poses: ["bust"], stages: [] },
  rajesh: { name: "Rajesh", poses: ["bust"], stages: [] },
};
const only = process.argv.slice(2);

async function api(token, body) {
  const res = await fetch(`${BASE}/api/avatar`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

for (const [key, p] of Object.entries(PEOPLE)) {
  if (only.length && !only.includes(key)) continue;
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: auth, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  const uid = auth.user.id;
  const token = auth.session.access_token;
  const selfie_path = `${uid}/selfie.jpg`;
  await sb.storage.from("selfies").upload(selfie_path, await readFile(new URL(`./demo/selfie-${key}.jpg`, import.meta.url)), { contentType: "image/jpeg", upsert: true });
  await sb.from("profiles").upsert({ user_id: uid, name: p.name, selfie_path });

  // The portrait first; everything after it is drawn to match it. Two images per call keeps rate limits happy.
  const jobs = [{ poses: ["bust"] }];
  const rest = [...p.poses.filter((x) => x !== "bust").map((x) => ({ poses: [x] })), ...p.stages.map((n) => ({ stages: [n] }))];
  for (let i = 0; i < rest.length; i += 2) jobs.push(rest.slice(i, i + 2).reduce((a, j) => ({ poses: [...(a.poses ?? []), ...(j.poses ?? [])], stages: [...(a.stages ?? []), ...(j.stages ?? [])] }), {}));
  for (const job of jobs) {
    const t = Date.now();
    const r = await api(token, job);
    console.log(key, JSON.stringify(job), `${Math.round((Date.now() - t) / 1000)}s`, r.poses.length + r.stages.length, "made");
  }

  // Save what was made, for the demo seed.
  const dir = new URL(`../public/art/demo/${key}/`, import.meta.url);
  await mkdir(dir, { recursive: true });
  const [{ data: poses }, { data: stages }] = await Promise.all([
    admin.from("avatar_poses").select("pose, image_path").eq("user_id", uid),
    admin.from("avatar_stages").select("stage, image_path, is_placeholder").eq("user_id", uid),
  ]);
  const files = [...(poses ?? []).map((r) => [r.pose, r.image_path]), ...(stages ?? []).filter((r) => !r.is_placeholder).map((r) => [`stage-${r.stage}`, r.image_path])];
  for (const [name, path] of files) {
    const { data } = await admin.storage.from("avatars").download(path);
    await writeFile(new URL(`${name}.webp`, dir), Buffer.from(await data.arrayBuffer()));
  }
  console.log(key, "saved", files.map(([n]) => n).join(", "));
  await admin.auth.admin.deleteUser(uid);
}
