// Points Supabase pg_cron at the reminders route (every 5 minutes).
//   node scripts/setup-cron.mjs                                   # local: app on this machine, port 3000
//   node scripts/setup-cron.mjs https://hoppy.vercel.app          # cloud: your deployed URL
// Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and CRON_SECRET from .env.local.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
// The local database runs in Docker, so it reaches the host's dev server via host.docker.internal.
const base = process.argv[2] ?? "http://host.docker.internal:3000";
const url = `${base.replace(/\/$/, "")}/api/cron/reminders`;
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { error } = await sb.rpc("schedule_reminders", { url, secret: env.CRON_SECRET });
if (error) throw error;
console.log(`Reminders job scheduled every 5 minutes → ${url}`);
