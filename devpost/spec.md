---
doc: spec
status: approved
---

# Hoppy — Technical Spec

## How This Works, In Plain Language

Hoppy is a **PWA**: a website built mobile-first that installs to the phone's home screen and behaves like an app. It has three parts:

1. **The app** (Next.js, hosted free on Vercel) is everything the user sees: the chat home, the avatar, the stat sheet, the tumbler, the calendar, and so on. It also contains small **server routes** that run on Vercel, not on the phone. Every AI call goes through these routes, so API keys never reach the phone.
2. **The database** (Supabase, free tier) remembers everything: profile, meals, workouts, water, sleep, weight, meds, avatar images, friends, and push subscriptions. Supabase also gives each user an **anonymous login** the moment they open the app, so there's no signup screen, which matches drip onboarding. Supabase's **scheduled jobs** send reminders.
3. **AI providers** each do the job they're best at:
   - **OpenAI** reads meal photos.
   - **Gemini** listens to voice logs and draws the avatar.
   - **GLM** writes the quick chat replies.
   - A bigger model writes the occasional deep report.

**The game rules themselves are plain code, not AI.** Stats, targets, calories burned, and stage-ups are deterministic functions in one folder (`lib/rules/`), each citing its research source. That keeps the game fair, explainable, and free to run. The AI only *perceives* (what dish, how much, what did they say) and *talks* (warm replies). It never decides the score.

Why this shape: one codebase deploys to one free URL and becomes an iPhone app later (Capacitor wraps the same code on a Mac). Supabase's free tier covers database, auth, storage, and scheduling in one service instead of four.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **First open:** the app loads from Vercel and Supabase signs the user in anonymously. With no `profiles` row yet, the app shows the selfie screen.
2. **Selfie → avatar:** the photo is resized on the phone (1024px), uploaded to Supabase Storage, then `POST /api/avatar` runs. The server sends the selfie to Gemini's image model once per body stage, with one shared style prompt, and stores the 5 PNGs in Storage plus a row in `avatar_stages`. While this runs, the phone shows the "becoming you" animation; stage 1 is shown as soon as it's ready, and stages 2–5 finish in the background.
3. **First meal:** the user snaps a photo, which is resized and sent to `POST /api/meal/photo`. OpenAI vision returns structured JSON (dish items, guessed portion, confidence, nutrients per item). The server sanity-checks each item against `data/indian-foods.json` where the dish exists there. The phone shows the portion and meal-type confirm sheet; on confirm, rows are saved to `meals` and `meal_items`.
4. **Warm reply:** after saving, `POST /api/chat/reply` streams a one-liner from GLM, given the meal and today's totals. The meal card renders the big kcal number at once (the numbers come from the save, not from the stream).
5. **Stats update:** the phone recomputes today's stats with `lib/rules/*` from today's rows. The avatar's expression and glow update. Tapping the avatar opens the stat sheet.
6. **Drip question:** `lib/onboarding/nextQuestion.ts` checks which profile fields are missing and which moment just happened (e.g., first meal saved), then asks one question in the chat.
7. **Through the day:** voice logs go to `POST /api/log/voice`, where Gemini turns audio into structured meal or activity items, then the same confirm-and-save flow runs. Exercise text goes to `POST /api/log/activity`. Water taps write directly to Supabase. Questions go to `POST /api/chat/ask`, which sends a compact JSON summary of today (not raw history) to GLM.
8. **Share card:** `/share/today` renders the card in HTML, `html-to-image` turns it into a PNG, and the Web Share API opens Android's share sheet (or downloads the image as a fallback).
9. **Over weeks:** each time the app opens, `lib/rules/stages.ts` checks the last 28 days plus weight trend. A stage-up updates `profiles.current_stage`, plays the celebration, and offers a milestone card. Stages never decrease.

## Stack

| Piece | Choice | Version | Docs |
|---|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript | next 16.4.x, react 19.3.x | https://nextjs.org/docs |
| Styling | Tailwind CSS | 4.3.x | https://tailwindcss.com/docs |
| PWA (offline shell, install, push) | Next.js `app/manifest.ts` + hand-written `public/sw.js` | — | https://nextjs.org/docs/app/guides/progressive-web-apps |
| DB / Auth / Storage / Cron | Supabase (local via Supabase CLI + Docker) | supabase-js 2.118.x | https://supabase.com/docs |
| OpenAI + GLM client | `openai` SDK (GLM is OpenAI-compatible via `baseURL`) | 7.43.x | https://platform.openai.com/docs · https://docs.z.ai |
| Gemini | `@google/genai` | 2.31.x | https://ai.google.dev/gemini-api/docs |
| Web push | `web-push` (VAPID, free) | 3.6.x | https://github.com/web-push-libs/web-push |
| Share card image | `html-to-image` | 1.11.x | https://github.com/bubkoo/html-to-image |
| PDF reports | Browser print-to-PDF with a print stylesheet | — | — |
| Validation | `zod` for AI JSON outputs | 4.6.x | https://zod.dev |

Rationale (learner choices in bold):
- **PWA only**, Android first, iPhone later via Capacitor.
- **Free infrastructure:** Vercel Hobby plus the Supabase free tier. Paid AI keys are fine.
- **Models routed by strength and cost** (learner asked for token optimization).
- Next.js was recommended (not chosen by the learner) because one codebase gives the UI, secure server routes, and the deploy target.

**To verify early in the build:** exact current model IDs and prices on the official pages; Supabase free-tier limits; the Vercel Hobby function timeout (official docs say 300s).

## Where It Runs and How Someone Tries It

- **Runtime:** a browser (Chrome on Android; installable as a PWA). Server routes run on Vercel.
- **Requirements:** Node 24 (installed), a Supabase project, and API keys in `.env.local` (never committed; `.env.example` lists the names):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GLM_API_KEY`
  - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`
- **Local:** `npm install` → `npm run dev` → open `http://localhost:3000`. To test on the Android phone over the same Wi-Fi, use the LAN URL; camera and push require HTTPS, so use the Vercel preview URL for those.
- **Live URL (learner wants one):** deploy on Vercel Hobby (free) from the GitHub repo, adding the env vars in Vercel. Every push to `main` redeploys.
- **Demo recording (after all features are finished):** the live URL on the Android phone, installed to the home screen, screen-recorded. Show selfie → avatar → photo of dal-chawal → card → stat sheet → voice log → share card.
- **iPhone later:** first, Safari → Add to Home Screen works now (web push needs iOS 16.4+ with the app installed). Second, for a native app, `npx cap add ios` on a Mac with Xcode.

## Look and Feel
Implements `prd.md > Look and Feel`. Since the redesign, the visual reference is the learner's Gemini mockups in `images/` (14 screens); each screen component names the image it copies.

- **Tailwind theme tokens** (sampled from the mockups, `app/globals.css`):
  - `cream #FBF5E9` (page), `card #FFFFFF`, `ink #231F1B`, `teal #10686A` (primary buttons), `turmeric #DC9813` (calorie totals), `aqua #00B2BC` (share), `peach #F7E2C3` (twin circles), `night #1E1A17` (journey header), `gold #C9A45C`
  - Stat colour + soft tile pairs: strength `#D24848/#F8D7D5`, muscle `#F1A858/#FEE5C9`, digestion `#4D9831/#D8E8CC`, hydration `#428ED8/#D5E7F5`, energy `#E49C16/#FEE7BE`, rest `#484A98/#DAD7EA`
- **Fonts:** **Baloo 2** (titles 30–34px extra-bold, buttons, big numbers) and **Inter** (body), with **Mukta** as the Devanagari fallback, via `next/font/google`. Base size 16px.
- **Shared kit:** `components/ui.tsx` (Screen, TopBar, Title, Card, Button, Chip, Bubble, ProgressBar, Toggle, Segmented, Tabs), `components/icons.tsx` (line icons and the six filled stat icons), `components/art.tsx` (twin images, food stickers, confetti, the streak medallion, the kolam frame).
- **Twin art:** made with OpenAI images (`gpt-image-2.5-sunburst`, OpenAI's pick for precise edits; `gpt-image-1.x` retire on 2026-12-01), transparent PNG, with Gemini image as the backup. Cost: the portrait is made once at `high` (≈ $0.05); every other pose and stage at `medium` (≈ $0.013 plus two input images), and only the first time a screen shows it (`ensureTwinArt`), capped at 16 twin images per user per day. A user who opens every screen costs roughly $0.25–0.35 in total, once. Stickers and expert photos use `gpt-image-2.5-flare` at `medium`, generated once. Every request sends the selfie (the only source of identity), one style reference (`lib/avatar/style-ref.ts`, the Suresh twin cropped from the mockups — style only, never his face), and, once it exists, the user's own twin portrait so later poses stay the same character. The prompt (`lib/ai/prompts.ts > twinPrompt`) spells out what identity to keep, the exact 3D style, and the dignified-for-40+ tone. Each user gets five full-body stages plus poses (`bust`, `drink`, `stretch`, `walk`, `wave`, `cheer`; table `avatar_poses`), with backgrounds cut out (`lib/avatar/cutout.ts`). Screens fall back to the stage image when a pose is missing.
- **Food stickers:** one 3D sticker per dish in `public/art/food/<food id>.png`, generated by `scripts/make-art.mjs` (needs `OPENAI_API_KEY` or `GEMINI_API_KEY`). Until then, four stickers cut from the mockups (`public/art/stickers/`) cover close dishes, and the rest show their emoji on a sticker disc. `public/art/manifest.json` lists what exists.
- **Interactive pieces:** the tumbler's water rises, waves and bubbles; confetti on logs and milestones; a live voice waveform; a saffron ruler slider for drip answers; the swipeable workout carousel.
- **Copy voice:** warm Hinglish touches from the mockups ("Paani Ka Tumbler", "Aapka Vyayaam", "Beeta Hua Kal", "Haan, le liya!"). Avatar lines live in `lib/copy/voice.ts`. No red "over budget" states.

## Components

### Auth and Session
Supabase anonymous sign-in on first load (`lib/supabase/client.ts`; the session lives in localStorage). API routes act as the user via the `Authorization: Bearer` access token (`lib/supabase/server.ts`). An optional "Save my progress with Google" option links the anonymous account. It's offered when the user joins Community or opens settings.
PRD ref: `prd.md > Onboarding (Drip)`, `prd.md > Community`.

### Onboarding Flow
- `app/onboarding/page.tsx`: selfie capture (`<input type="file" accept="image/*" capture="user">` + preview), then the reveal animation, then name.
- `lib/onboarding/nextQuestion.ts`: a pure function, `(profile, event) → question | null`, implementing the drip order.
- Questions render as chat bubbles with inline inputs.
PRD ref: `prd.md > Onboarding (Drip)`.

### Avatar Service
- `POST /api/avatar` generates 5 stage images with Gemini image (Nano Banana family) from the selfie plus the stage prompt, and uploads them to Storage `avatars/{user_id}/stage-{n}.png`.
- Retries once on failure; until stage 1 exists, a placeholder silhouette is shown.
- `components/Avatar.tsx` shows the current stage image with an expression and glow overlay (CSS filters, aura ring, and a small emoji/expression badge driven by today's stats).
PRD ref: `prd.md > The Avatar and Body Stages`.

### Rules Engine (research-backed, no AI)
All in `lib/rules/`, pure TypeScript with unit tests. Each file cites its source in a header comment.
- `targets.ts`:
  - BMR via Mifflin-St Jeor; maintenance = BMR × 1.2 (sedentary baseline; exercise is added separately).
  - Calorie target = maintenance − 500, with a floor of 1,200 (F) / 1,500 (M).
  - Protein 0.83 g/kg; fiber 15 g per 1,000 kcal (verify both against the ICMR-NIN 2024 document); water 2,000 ml (F) / 2,500 ml (M); activity 30 min moderate; sleep 7–9 h.
- `activity.ts`: kcal burned = MET × weight kg × hours, using a table of about 40 Indian-relevant activities (brisk walk, surya namaskar, hatha yoga, cricket, badminton, cycling, household chores, …) from the Compendium of Physical Activities.
- `stats.ts`: `(todayLogs, targets) → { strength, muscle, digestion, hydration, energy, rest }`, each 0–100. Energy is 100 inside the target band ±150 kcal and tapers gently outside it.
- `stages.ts`: a strong day is 4 or more of the 6 stats at 70+. Stage-up requires 20+ strong days in the last 28, plus weight progress of at least 25% of the remaining gap per stage (or weight not logged, in which case consistency alone counts). Never decreases.
- `nudges.ts`: `(stats, timeOfDay, lastNudgeAt) → avatar line | null`. Maximum 3 per day.
PRD ref: `prd.md > Daily Stats`, `prd.md > The Avatar and Body Stages`.

### Meal Logging
- **Photo:** `POST /api/meal/photo`, using the OpenAI vision model with a zod-validated JSON schema `{ items: [{ name, name_hi?, portion_guess, unit, grams_est, kcal, protein_g, fiber_g, carbs_g, fat_g, sodium_mg, confidence }], is_food }`. The prompt includes Indian portion vocabulary (katori, roti count, plate). Items found in `data/indian-foods.json` are blended toward table values per 100 g.
- **Voice:** `POST /api/log/voice` sends an audio blob (MediaRecorder, webm/opus) to Gemini Flash with a prompt to transcribe Hinglish and return the same schema (or an activity schema). It returns the transcript too, so the user can confirm it.
- **Confirm sheet:** `components/MealConfirmSheet.tsx` offers portion steppers per item, meal-type chips (pre-selected by clock), edit/delete, and a "something else" text field.
- **Manual fallback:** a searchable list from `data/indian-foods.json` when AI fails.
PRD ref: `prd.md > Meal Logging (Photo and Voice)`.

### Exercise and Yoga Logging
`POST /api/log/activity` sends free text ("12 rounds surya namaskar") to GLM Flash, which maps it to `{activity_key, minutes, intensity}` from the MET table. Calories are computed by `lib/rules/activity.ts`, not the model.
PRD ref: `prd.md > Exercise and Yoga Logging`.

### Chat
- `app/page.tsx` (home) shows the greeting, avatar, a thread of `chat_messages`, and the input bar (camera, mic, text, Today chip).
- `POST /api/chat/ask` sends today's compact summary JSON (about 300 tokens) plus the last 6 messages to GLM Flash. Responses are streamed. The system prompt sets the persona, the not-medical-advice rule, and the salt/fat tip rules.
- `POST /api/chat/reply` streams the post-log one-liner (GLM Flash).
PRD ref: `prd.md > Ask About Your Day (Chat)`.

### Water Tumbler
`components/Tumbler.tsx` is an SVG glass whose fill height equals today's ml divided by the target. Each tap inserts a `water_logs` row (250 ml default, adjustable).
PRD ref: `prd.md > Water Tumbler`.

### Stat Sheet
`components/StatSheet.tsx` is a bottom sheet with 6 colored bars ("42 / 55 g"), the current stage, and progress to the next stage.
PRD ref: `prd.md > Daily Stats`.

### Share Cards
`app/share/[kind]/page.tsx` (kind = `today` | `milestone`) is a 1080×1920 layout: avatar start-stage vs. current stage, highlights, streak, goal progress, and kolam border. `html-to-image` produces a PNG, which goes to `navigator.share({files})`, with a download fallback. Shared cards are recorded in `shared_cards` for the Community feed.
PRD ref: `prd.md > Daily Share Card`, `prd.md > Milestone Share Cards`.

### Calendar
`app/calendar/page.tsx` shows a month grid; each day shows up to 3 food stickers from `meal_items`. Tapping a day opens a day sheet with totals and meals.
PRD ref: `prd.md > Diet Calendar and History`.

### Medicines and Supplements
`app/meds/page.tsx` lets the user add an item (name, dose, times[]) and shows today's due list with check-offs. Times feed the reminder scheduler.
PRD ref: `prd.md > Medicines and Supplements`.

### Streaks
`lib/rules/streak.ts` counts consecutive days with at least 1 meal, computed from `meals`. It's shown on home and the cards.
PRD ref: `prd.md > Streaks`.

### Reminders and Push
- **Subscription:** the service worker subscribes to push (VAPID) and stores it in `push_subscriptions`.
- **Scheduler:** Supabase `pg_cron` runs every 5 minutes and calls `POST /api/cron/reminders` (protected by `CRON_SECRET`). The route finds users with due meal or med reminders and sends pushes with `web-push`, using lines from `lib/copy/voice.ts`.
- Tapping a notification deep-links to logging or a med check-off.
PRD ref: `prd.md > Reminders`.

### Reports
- `app/reports/page.tsx` offers a period picker (7/30/90 days), a chart per stat (lightweight SVG charts, no library), calories in vs. out, a weight trend line, and adherence %.
- "Write my summary" calls `POST /api/report/summary`, which sends aggregated numbers (not raw logs) to the larger reasoning model (Gemini Pro-class or an OpenAI mid/large model) and caches the result in `reports`.
- "Export PDF" uses `window.print()` with a print stylesheet formatted for a doctor (header with name, age, period, and a disclaimer).
PRD ref: `prd.md > Reports`.

### Community
- `app/community/page.tsx`: adding a friend works through an invite link/code (`/invite/[code]`). The feed shows friends' `shared_cards` (newest first).
- The weekly leaderboard counts strong days this week (from a Postgres view over the daily stats snapshot).
- Supabase Row Level Security limits visibility to self and friends.
PRD ref: `prd.md > Community`.

### Specialists
`app/specialists/page.tsx` shows a directory read from the `specialists` table, seeded with **clearly labeled sample profiles**. "Request consult" inserts into `consult_requests` with an attached report snapshot; the user sees "Request sent."
PRD ref: `prd.md > Specialists`.

### Settings
`app/settings/page.tsx` lets the user edit drip-collected fields, set reminder times, link a Google account, and regenerate the avatar.
PRD ref: `prd.md > Onboarding (Drip)`.

## Data Model
All in Supabase Postgres, with Row Level Security (`user_id = auth.uid()`, plus friend-read on `shared_cards` and `daily_snapshots`). Data persists across sessions and devices once a Google account is linked; anonymous users keep it on that browser.

| Table | Key columns | Written when |
|---|---|---|
| `profiles` | user_id, name, sex, birth_year, height_cm, weight_kg, goal_weight_kg, diet_type, current_stage (1–5), stage_progress, created_at | onboarding and drip answers, stage-ups |
| `avatar_stages` | user_id, stage, image_path | avatar generation |
| `meals` | id, user_id, eaten_at, meal_type, source (photo/voice/manual), photo_path | meal confirm |
| `meal_items` | meal_id, name, grams, kcal, protein_g, fiber_g, carbs_g, fat_g, sodium_mg, sticker | meal confirm, edits |
| `activities` | id, user_id, done_at, activity_key, minutes, intensity, kcal | activity log |
| `water_logs` | user_id, at, ml | tumbler tap |
| `sleep_logs` | user_id, date, hours | morning question |
| `weights` | user_id, date, kg | drip question or settings |
| `meds` | id, user_id, name, dose, times[] | meds page |
| `med_logs` | med_id, date, time, taken_at | check-off |
| `daily_snapshots` | user_id, date, six stats, strong_day bool | upserted on each log (feeds stages, streaks, leaderboard, reports) |
| `chat_messages` | user_id, role, content, created_at | chat |
| `shared_cards` | user_id, kind, image_path, created_at | share |
| `friendships` | user_id, friend_id | invite accept |
| `push_subscriptions` | user_id, endpoint, keys | push opt-in |
| `reminders` | user_id, kind (meal/med), time, payload | settings, meds |
| `reports` | user_id, period, summary, created_at | report summary |
| `specialists` | id, name, role, city, bio (sample) | seed |
| `consult_requests` | user_id, specialist_id, report_id, note | request consult |

Storage buckets: `selfies` (private), `avatars` (private, signed URLs), `meals` (private), `cards` (friend-readable).

## File Structure

```
hoppy/
├── app/
│   ├── layout.tsx              # fonts, theme, PWA meta, auth bootstrap
│   ├── page.tsx                # Home: greeting, avatar, chat, input bar
│   ├── onboarding/page.tsx     # selfie → reveal → name
│   ├── calendar/page.tsx
│   ├── reports/page.tsx        # charts, AI summary, print-to-PDF
│   ├── meds/page.tsx
│   ├── community/page.tsx
│   ├── invite/[code]/page.tsx
│   ├── specialists/page.tsx
│   ├── settings/page.tsx
│   ├── share/[kind]/page.tsx   # share card render + share
│   └── api/
│       ├── avatar/route.ts         # Gemini image ×5 stages
│       ├── meal/photo/route.ts     # OpenAI vision → items JSON
│       ├── log/voice/route.ts      # Gemini audio → items JSON
│       ├── log/activity/route.ts   # GLM → activity JSON
│       ├── chat/ask/route.ts       # GLM streaming answers
│       ├── chat/reply/route.ts     # GLM streaming one-liners
│       ├── report/summary/route.ts # larger model, cached
│       └── cron/reminders/route.ts # web-push sender (pg_cron calls it)
├── components/                 # Avatar, StatSheet, Tumbler, MealCard,
│                               # MealConfirmSheet, ChatThread, InputBar,
│                               # ShareCard, KolamBorder, Confetti, charts/
├── lib/
│   ├── rules/                  # targets, activity (MET), stats, stages,
│   │                           # streak, nudges — pure + unit-tested
│   ├── ai/                     # openai.ts, gemini.ts, glm.ts, prompts.ts,
│   │                           # schemas.ts (zod)
│   ├── onboarding/nextQuestion.ts
│   ├── copy/voice.ts           # all avatar lines (Hinglish, warm)
│   ├── supabase/               # client.ts, server.ts, types.ts
│   └── image.ts                # client-side resize/compress
├── data/
│   ├── indian-foods.json       # ~60 common dishes, per-100g nutrients + source
│   └── met-activities.json     # ~40 activities with MET values + source
├── public/
│   ├── manifest.webmanifest
│   ├── icons/                  # app icons
│   └── stickers/               # Indian food stickers
├── supabase/
│   ├── migrations/             # tables, RLS, views, pg_cron job
│   └── seed.sql                # sample specialists (labeled sample)
├── tests/rules/                # unit tests for lib/rules
├── public/sw.js                # service worker: offline shell + push
├── .env.example
├── devpost/                    # Devpost learning workspace
└── README.md
```

## External Services and Dependencies

Prices are approximate and come from third-party trackers, October 2026. Verify on the official pages at the start of the build.

### OpenAI: meal photo understanding
- `client.responses.create({ model: <mid-tier vision model, e.g. GPT-6.1 "Sol" class>, input: [system prompt, user: [image (base64, ≤1024px), text]], text: { format: json_schema } })` → parsed by zod.
- Cost: about $2 / $10 per 1M tokens in/out; roughly $0.003–0.006 per photo.
- Docs: https://platform.openai.com/docs/guides/images-vision · structured outputs: https://platform.openai.com/docs/guides/structured-outputs

### Gemini: voice logs, avatar images, reports
- **Voice:** `ai.models.generateContent({ model: <Flash model, e.g. Gemini 3.8 Flash>, contents: [audio inlineData (webm), prompt], config: { responseMimeType: 'application/json', responseSchema } })`. Cost: about $0.75 / $3.75 per 1M tokens.
- **Avatar:** `ai.models.generateContent({ model: <Nano Banana image model, e.g. gemini-3.1-flash-image-preview>, contents: [selfie inlineData, stage prompt] })` → image part (base64 PNG). About $0.04 per image, 5 per user.
- **Reports:** a Pro-class model, on demand only, with output cached.
- Docs: https://ai.google.dev/gemini-api/docs · image generation: https://ai.google.dev/gemini-api/docs/image-generation · audio: https://ai.google.dev/gemini-api/docs/audio

### GLM (Z.ai): chat, one-liners, activity parsing
- OpenAI-compatible: `new OpenAI({ baseURL: 'https://api.z.ai/api/paas/v4/', apiKey: GLM_API_KEY })` → `chat.completions.create({ model: <GLM Flash, e.g. glm-4.7-flash or glm-5.3-flash>, stream: true, messages })`.
- Cost: Flash models are free or near-free.
- Docs: https://docs.z.ai

### Supabase (free tier)
- Postgres, Auth (anonymous + Google), Storage, pg_cron + pg_net.
- Limits: 500 MB DB, 1 GB storage, 50k MAU, pauses after 7 days idle.
- Docs: https://supabase.com/docs/guides/auth/auth-anonymous · https://supabase.com/docs/guides/cron

### Vercel (Hobby, free)
- Hosting and server routes; non-commercial use only. Function limit 300s (official docs).
- Docs: https://vercel.com/docs/plans/hobby

### Web Push (VAPID)
- Free, no account. Works on Android Chrome; on iOS 16.4+ only for installed PWAs.

### Cost controls (the learner asked to optimize tokens)
- Images are resized to ≤1024px before upload.
- Chat sends a compact daily summary, not history.
- Stats, calories burned, and stages are computed in code.
- The avatar is generated once per user; report summaries are cached.
- A per-user daily AI cap (e.g., 40 calls) is enforced in the routes using a count from `chat_messages`/`meals`.

## Important Failure Modes

- **Meal photo misread, or not food** → the confirm sheet always lets the user fix items. `is_food: false` triggers "That doesn't look like food 👀". Low confidence shows the top 3 guesses plus "something else".
- **AI provider down or rate-limited** → photo falls back to manual search of `indian-foods.json`; voice falls back to a typed message; chat shows a friendly "I'm a bit slow, try again". Fallback vision via Gemini Flash if OpenAI fails.
- **Avatar generation slow or failed** → the reveal shows stage 1 as soon as it exists; on failure, a placeholder silhouette, a retry in settings, and logging works meanwhile.
- **Push not permitted or unsupported** → reminders show as an in-app banner on the next open.

## What Was Simplified and Why

- **The specialists directory uses labeled sample profiles,** and consult requests are stored, not delivered. The learner confirmed no specialist side is needed for now; the fuller version adds a specialist login and inbox.
- **Friends are added through invite links,** not search or contacts. The learner confirmed this is fine for now; the fuller version adds username search.
- **The PDF report uses the browser's print-to-PDF,** not a server-side PDF generator. Zero dependencies, and it looks good with a print stylesheet.
- **Anonymous accounts are the default.** Linking Google is optional, and without it, data lives with that browser's session. Fuller: required sign-in, which would contradict drip onboarding.
- **Nutrients are AI estimates anchored to a ~60-dish reference table,** not a full Indian nutrient database. The INDB recipe dataset's license is unclear, and IFCT covers raw ingredients, not cooked dishes. Fuller: license INDB and look up every dish.

## Decisions and Open Issues

**Learner decisions**
- PWA only; Android first; iPhone later (Safari install now, Capacitor native on a borrowed Mac).
- Infrastructure must be free (Vercel Hobby, Supabase free); paid AI keys are fine.
- Live URL wanted (Vercel).
- Avatar is an AI-generated 3D likeness, about $0.20 per user one-time.
- Models are chosen per task for strength and token cost (learner asked).
- Privacy is not a constraint for the MVP.
- No time pressure: all features are finished before the demo and ship.
- Push-up alarm cut (it was an analogy). Specialists stay one-sided with sample profiles; friends are added by invite link only.

**Agent recommendations (learner to accept with this spec)**
- Next.js + Tailwind + hand-written service worker
- Supabase anonymous auth
- pg_cron for reminders
- GLM through the OpenAI SDK
- The simplifications listed above

**Useful unknown discussed:** the learner asked how to split tasks across Google, OpenAI, and GLM to optimize tokens and play to each model's strengths.
- **What clarified it:** a per-task routing table based on published comparisons (OpenAI had the lowest calorie error on food photos; Gemini takes audio in directly and generates likeness-preserving images; GLM Flash is near-free for short chat). Plus the principle that the scoring is code, not AI.
- **To check during the build:** log tokens and latency per route on the first 20 test logs, and confirm that photo estimates for 5 home-cooked Indian dishes are within a reasonable range of the reference table.

**Open issues**
- Exact model IDs and prices: verify on the official pages at build start.
- Protein and fiber targets: verify against the ICMR-NIN 2024 guideline PDF (carried from `prd.md > Open Questions`).
- `indian-foods.json` sources: compile from openly citable values (IFCT 2017 ingredients, published recipe values), and record a source per row.
- Stage-up thresholds: tune during the build (carried from the PRD).
- **Build order:** 16 features, built in tier order and all completed before the demo. This intentionally exceeds the course's 2–4 hour target; the learner has time.
