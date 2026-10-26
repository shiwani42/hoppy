# Hoppy

A supportive calorie tracker (calories in **and** out) for Indian adults. Your real meals, workouts, water and sleep power a stylized avatar of *you*, following research-backed rules from ICMR-NIN and WHO.

**Live:** https://hoppy-gamma.vercel.app (install it from Chrome on Android: ⋮ → Install app)

Built for Devpost's *Build With AI: Basics*. Plans live in [`devpost/`](devpost/).

## Run it locally

Requirements: Node 24+, Docker (for the local Supabase stack).

```bash
npm install
npm run db:start          # starts Supabase locally in Docker and applies migrations
cp .env.example .env.local
npx supabase status       # copy API URL, anon key and service role key into .env.local
npm run dev               # http://localhost:3000
```

> **Heads up:** variables exported by your shell (e.g. an `OPENAI_API_KEY` in `~/.bashrc`) take precedence over `.env.local`. Remove or update them, or start with `env -u OPENAI_API_KEY npm run dev`.

AI keys are optional. With `OPENAI_API_KEY`, `GEMINI_API_KEY` or `GLM_API_KEY` blank, that provider's features use clearly labeled demo responses, so every flow still works end to end.

### Try it on your phone (same Wi-Fi)

```bash
npm run dev:https         # self-signed HTTPS on all interfaces
```

Open `https://<your-laptop-ip>:3000` on the phone and accept the certificate warning. The camera, install and push notifications need HTTPS.

### Reminders (push notifications)

```bash
npm run cron:setup        # schedules the every-5-minutes reminder job in local Supabase
```

Then open Settings → Turn on reminders. In the cloud, run `node scripts/setup-cron.mjs https://<your-app>` once.

### Tests

```bash
npm test                  # research-backed rules engine (lib/rules)
npm run typecheck
```

## Deploy (when accounts are ready)

1. Create a free Supabase project, enable **Anonymous sign-ins** (Authentication → Sign In / Providers), and push the schema: `npx supabase link --project-ref <ref>` then `npx supabase db push`.
2. Push this repo to GitHub and import it in Vercel (Hobby plan).
3. In Vercel → Settings → Environment Variables, add everything from `.env.example` with the cloud Supabase values, your AI keys, and fresh VAPID keys (`npx web-push generate-vapid-keys`).
4. Deploy. Open the URL on Android Chrome and tap **Install**.
