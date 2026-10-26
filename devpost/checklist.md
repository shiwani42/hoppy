---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (learner asked to finish everything end to end locally before trying it)

## Slices

- [x] **1. Take a selfie and meet your avatar**
  Becomes usable: Opening the app shows the selfie screen. Taking or picking a selfie plays the "becoming you" wait, then your stylized 3D avatar (stage 1) appears on the home screen with "Hi, [name]". You're signed in anonymously and the avatar survives a reload.
  Why now: The avatar is the kernel and the riskiest AI call (does Gemini keep your likeness, in our art style?). Bootstrapping (Next.js, Tailwind theme and fonts, Supabase auth and storage) lands here so the first thing we build is the first thing you see.
  PRD ref: `prd.md > The Core Journey` (steps 1–2), `prd.md > Onboarding (Drip)`, `prd.md > The Avatar and Body Stages`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Auth and Session`, `spec.md > Onboarding Flow`, `spec.md > Avatar Service`, `spec.md > Look and Feel`, `spec.md > Data Model` (`profiles`, `avatar_stages`), `spec.md > File Structure`
  Build: Scaffold Next.js + TypeScript + Tailwind with the theme tokens and the Baloo 2 / Mukta fonts. Supabase client and server helpers, middleware, anonymous sign-in. First migration (`profiles`, `avatar_stages`, storage buckets, RLS). Onboarding page (selfie capture → client resize → upload → reveal → name). `POST /api/avatar` generates stage 1 via Gemini image with the shared style prompt. Home page shows the greeting and avatar, with the placeholder silhouette on failure. `.env.example`.
  Verify (mechanical): `npm run build` and typecheck pass. Call `/api/avatar` with a test selfie and confirm a PNG lands in Storage and an `avatar_stages` row exists. Load home with the session and confirm the avatar renders. Reload and confirm the same user and avatar.
  Learner check: Open the app, take a selfie, and say whether the avatar looks like you and fits the soft-3D, non-childish style you want.
  Commit: `Selfie onboarding and stage-1 avatar`

- [x] **2. Hoppy installs as an app**
  Becomes usable: Hoppy installs from Chrome as an app with its own icon and opens without the browser bar. The app shell loads offline. A local HTTPS dev server lets your Android open it over Wi-Fi with a working camera.
  Why now: Camera, install, and push all need HTTPS. Getting the PWA shell right early means every later slice works as an installed app. (The Vercel deploy is deferred until accounts exist; see Revisions.)
  PRD ref: `prd.md > Screens and Layout`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Stack` (Serwist), `spec.md > Vercel (Hobby, free)`
  Build: Web app manifest and icons, Serwist service worker (offline shell), `npm run dev:https` script for LAN phone testing, deploy steps documented in the README for later.
  Verify (mechanical): Production build succeeds and `next start` serves the manifest and service worker with 200. The manifest has the required installability fields and icons. Headless Chrome confirms the service worker registers.
  Learner check: On your laptop's Chrome, click Install, open Hoppy as an app, and redo the selfie flow. Optionally open the HTTPS LAN URL on your Android.
  Commit: `PWA manifest, service worker, and install`

- [x] **3. Snap a meal and get your meal card**
  Becomes usable: Tap the camera, snap (or pick) a meal photo, see the dish split into items, adjust portions and meal type in one tap, and get a card with a big kcal number, protein/fiber/carbs/fat, and a warm streamed one-liner. Non-food photos and unsure dishes are handled; if AI fails, you can search a food list.
  Why now: Meal photo understanding on Indian food is the second big AI risk and the main input the kernel feeds on.
  PRD ref: `prd.md > Meal Logging (Photo and Voice)`, `prd.md > The Core Journey` (steps 3–4), `prd.md > States and Boundaries`
  Spec ref: `spec.md > Meal Logging`, `spec.md > OpenAI: meal photo understanding`, `spec.md > GLM (Z.ai): chat, one-liners, activity parsing`, `spec.md > Data Model` (`meals`, `meal_items`), `spec.md > Important Failure Modes`
  Build: `lib/ai/*` clients and zod schemas, `data/indian-foods.json` (~60 dishes with sources), `POST /api/meal/photo`, `MealConfirmSheet`, `MealCard`, `POST /api/chat/reply` (streaming), input bar with camera, manual-search fallback, migration for meal tables and the `meals` bucket, food stickers.
  Verify (mechanical): `npm run build` passes. `curl` `/api/meal/photo` with 3 test images (dal-chawal, a thali, a non-food photo) and confirm valid JSON, sensible dishes, and `is_food:false` for the non-food image. Confirm rows saved after confirm. Confirm the reply route streams chunks.
  Learner check: Snap something you actually ate, fix the portion, and judge whether the dish, calories, and one-liner feel right.
  Commit: `Photo meal logging with meal card`

- [x] **4. Your avatar reacts to what you eat**
  Becomes usable: After a meal, your avatar's expression and glow change. Tapping the avatar opens the stat sheet with six colored bars ("42 / 55 g protein"). After your first meal, the avatar asks your height and weight in chat (then age and sex when it builds your calorie target), and the Energy stat unlocks. Stats without enough data show "tell me more to unlock".
  Why now: This is the kernel (your choices power a character that is you), so it comes right after the first input exists. The research-backed rules engine is pure code and gets unit tests.
  PRD ref: `prd.md > Daily Stats`, `prd.md > Onboarding (Drip)`, `prd.md > The Avatar and Body Stages` (day-level feel)
  Spec ref: `spec.md > Rules Engine (research-backed, no AI)`, `spec.md > Stat Sheet`, `spec.md > Avatar Service`, `spec.md > Onboarding Flow`, `spec.md > Data Model` (`daily_snapshots`)
  Build: `lib/rules/targets.ts`, `stats.ts` (with source comments; verify protein and fiber targets against the ICMR-NIN 2024 PDF), `lib/onboarding/nextQuestion.ts`, inline drip question bubbles, `StatSheet`, avatar expression/glow overlay, `daily_snapshots` upsert on each log, vitest unit tests for the rules.
  Verify (mechanical): `npx vitest run tests/rules` passes (BMR, targets, stat math, energy band, drip order). Log a high-protein meal via the API and confirm the Muscle value rises in `daily_snapshots`. `npm run build` passes.
  Learner check: Log a protein-rich meal, tap your avatar, and check that Muscle went up and the avatar looks livelier. Answer the height/weight question and see Energy unlock.
  Commit: `Rules engine, stat sheet, avatar reactions, drip questions`

- [x] **5. Every stat has an input: voice, exercise, water, sleep, weight**
  Becomes usable: Hold the mic and say "2 roti, dal, thodi bhindi" (Hinglish works); confirm the transcript and items. Log "12 rounds surya namaskar" or "30 min brisk walk" and see calories out and Strength rise. Tap the tumbler to fill water. Answer "How did you sleep?" on the second morning. Log weight.
  Why now: Completes the six stats so the kernel is fully playable before anything is built on top of it.
  PRD ref: `prd.md > Meal Logging (Photo and Voice)` (voice), `prd.md > Exercise and Yoga Logging`, `prd.md > Water Tumbler`, `prd.md > Daily Stats` (Rest), `prd.md > Onboarding (Drip)` (sleep)
  Spec ref: `spec.md > Meal Logging` (voice), `spec.md > Gemini: voice logs, avatar images, reports`, `spec.md > Exercise and Yoga Logging`, `spec.md > Water Tumbler`, `spec.md > Rules Engine (research-backed, no AI)` (`activity.ts`), `spec.md > Data Model` (`activities`, `water_logs`, `sleep_logs`, `weights`)
  Build: Mic recording (MediaRecorder) plus `POST /api/log/voice`, `POST /api/log/activity` with `data/met-activities.json` and `lib/rules/activity.ts`, `Tumbler`, sleep and weight drip prompts, migrations, unit tests for the MET math.
  Verify (mechanical): Vitest passes (MET kcal). `curl` the voice route with a recorded Hinglish sample and confirm the transcript and items JSON. `curl` the activity route with 3 phrases and confirm activity keys and minutes. Confirm each log updates `daily_snapshots`. Build passes.
  Learner check: On your phone, speak a meal in Hinglish, log a yoga session, tap water three times, and watch the stat sheet fill.
  Commit: `Voice, exercise/yoga, water, sleep and weight logging`

- [x] **6. Ask about your day, and your avatar talks back**
  Becomes usable: Ask "how much protein today?" or "can I have a samosa?" and get short, kind, streamed answers using your real numbers. The chat history persists. When a stat is low, the avatar nudges in character ("heyy my muscles are cramping 🥲 protein please"), at most 3 times a day. The diet-type question appears the first time Hoppy suggests food.
  Why now: Turns the logging surface into the Zest-style conversation and adds the playful personality that keeps people coming back.
  PRD ref: `prd.md > Ask About Your Day (Chat)`, `prd.md > Daily Stats` (low-stat nudges), `prd.md > Onboarding (Drip)` (diet type)
  Spec ref: `spec.md > Chat`, `spec.md > Rules Engine (research-backed, no AI)` (`nudges.ts`), `spec.md > Data Model` (`chat_messages`), `spec.md > Cost controls (the learner asked to optimize tokens)`
  Build: `ChatThread` with persistence, `POST /api/chat/ask` (compact daily summary plus last 6 messages to GLM, streaming), `lib/copy/voice.ts`, `nudges.ts` with tests, per-user daily AI cap.
  Verify (mechanical): Vitest passes (nudge limits). After seeding logs, `curl` `/api/chat/ask` "how much protein today?" and confirm the number matches the sum in the DB. Confirm the cap returns a friendly message past the limit. Build passes.
  Learner check: Ask Hoppy three real questions about your day and judge the tone: is it supportive, Hinglish-friendly, and never preachy?
  Commit: `Chat about your day and in-character nudges`

- [x] **7. Your avatar evolves over weeks**
  Becomes usable: All five body stages exist (Starting Line → Thriving). The stat sheet shows your stage and progress to the next. A sustained good run (plus progress to your goal weight, asked when stages first appear) triggers a stage-up celebration with confetti. A bad week only pauses progress.
  Why now: The long-term half of the kernel. It needs the daily snapshots from slices 4–5.
  PRD ref: `prd.md > The Avatar and Body Stages`, `prd.md > Onboarding (Drip)` (goal weight)
  Spec ref: `spec.md > Avatar Service`, `spec.md > Rules Engine (research-backed, no AI)` (`stages.ts`), `spec.md > Data Model` (`profiles.current_stage`, `daily_snapshots`)
  Build: Generate stages 2–5 in the background after stage 1, `stages.ts` with tests, stage-up check on app open, celebration and confetti, goal-weight drip question, dev-only seed script for 28 days of sample snapshots.
  Verify (mechanical): Vitest passes (stage-up thresholds, never demotes). Run the seed script for a test user and confirm a stage-up on next open; seed a bad week and confirm the stage holds. Confirm all 5 stage images exist in Storage.
  Learner check: Look at your five stages side by side. Is each one flattering and recognizably you? Then trigger the seeded stage-up and watch the celebration.
  Commit: `Five body stages and stage-up progression`

- [ ] **8. Share your day like Strava**
  Becomes usable: Open today's share card (9:16): your avatar then vs. now, today's highlights, streak, and goal progress, with the kolam border. Tap Share to open Android's share sheet (Instagram, WhatsApp, X), or save the image.
  Why now: Completes the core journey end to end (log → react → share) and is the growth hook you care about.
  PRD ref: `prd.md > Daily Share Card`, `prd.md > The Core Journey` (step 7)
  Spec ref: `spec.md > Share Cards`, `spec.md > Look and Feel` (kolam border), `spec.md > Data Model` (`shared_cards`)
  Build: `app/share/[kind]/page.tsx`, `ShareCard`, `KolamBorder`, `html-to-image` export, `navigator.share({files})` with download fallback, `shared_cards` record and upload.
  Verify (mechanical): Build passes. Load `/share/today` for a seeded user and confirm the PNG export produces a 1080×1920 image containing the real numbers (render it and inspect). Confirm the fallback download path when `navigator.canShare` is false.
  Learner check: On your phone, share today's card to WhatsApp or Instagram Stories. Would you be proud to post it?
  Commit: `Daily share card with native share`

- [ ] **9. See your history on a calendar**
  Becomes usable: A month calendar shows food stickers on each day you logged; tapping a day shows its meals and totals.
  Why now: First Tier 2 habit feature; it reuses the data that's already flowing.
  PRD ref: `prd.md > Diet Calendar and History`
  Spec ref: `spec.md > Calendar`
  Build: `app/calendar/page.tsx`, day sheet, sticker mapping, navigation from home.
  Verify (mechanical): Build passes. With seeded meals across 3 days, confirm the stickers render on the right dates and the day totals match DB sums.
  Learner check: Open the calendar and tap yesterday. Is everything you logged there?
  Commit: `Diet calendar and day history`

- [ ] **10. Streaks and milestone cards**
  Becomes usable: Your streak shows on home and the share card. Hitting a stage-up, every 2 kg toward your goal, or a 7/30/100-day streak offers a milestone share card.
  Why now: Builds on share cards (slice 8) and stages (slice 7) to make posting a recurring journey.
  PRD ref: `prd.md > Streaks`, `prd.md > Milestone Share Cards`
  Spec ref: `spec.md > Streaks`, `spec.md > Share Cards`
  Build: `lib/rules/streak.ts` with tests, streak display, milestone detection, `share/milestone` variant.
  Verify (mechanical): Vitest passes (streak increments, resets on a missed day). Seeded 7-day streak triggers a milestone card offer.
  Learner check: Look at the milestone card for a 7-day streak. Does it feel like an achievement worth posting?
  Commit: `Streaks and milestone share cards`

- [ ] **11. Track medicines and supplements**
  Becomes usable: Add a medicine or supplement with dose and times; today's due items show and can be checked off.
  Why now: An independent Tier 2 feature; reminders (next slice) build on its schedule.
  PRD ref: `prd.md > Medicines and Supplements`
  Spec ref: `spec.md > Medicines and Supplements`, `spec.md > Data Model` (`meds`, `med_logs`)
  Build: `app/meds/page.tsx`, migrations, due-today list, check-offs.
  Verify (mechanical): Build passes. Add an item with 2 times; confirm it appears as due and that a check-off writes `med_logs`.
  Learner check: Add a real supplement you take and check it off.
  Commit: `Medicines and supplements tracking`

- [ ] **12. Settings and reminders that reach your phone**
  Becomes usable: In settings you can edit everything drip onboarding collected, set meal-reminder times, regenerate your avatar, and allow notifications. At the set time, your phone gets a push in the avatar's voice ("Lunch? Snap it, or just tell me"), and tapping it opens logging. Med reminders arrive too. Without push permission, you see an in-app banner.
  Why now: Needs meds (slice 11) and the deployed HTTPS app (slice 2). Push is the trickiest infrastructure, so it's isolated in its own slice.
  PRD ref: `prd.md > Reminders`, `prd.md > Onboarding (Drip)` (editable later), `prd.md > Screens and Layout` (settings)
  Spec ref: `spec.md > Reminders and Push`, `spec.md > Settings`, `spec.md > Web Push (VAPID)`, `spec.md > Data Model` (`push_subscriptions`, `reminders`)
  Build: Settings page, push subscription in the service worker, VAPID keys, `POST /api/cron/reminders`, Supabase `pg_cron` + `pg_net` job, deep links, in-app banner fallback.
  Verify (mechanical): `curl` the cron route with `CRON_SECRET` and a due reminder and confirm `web-push` returns 201 for a test subscription. Without the secret it returns 401. Confirm the `pg_cron` job is listed in Supabase.
  Learner check: Set a reminder 2 minutes from now, lock your phone, and confirm the notification arrives and opens logging.
  Commit: `Settings and push reminders`

- [ ] **13. Reports you can show a doctor**
  Becomes usable: Pick 7/30/90 days and see trends for each stat, calories in vs. out, weight, and adherence. Tap "Write my summary" for an AI-written overview. Export a clean PDF.
  Why now: Uses all the accumulated data; the last Tier 2 feature.
  PRD ref: `prd.md > Reports`
  Spec ref: `spec.md > Reports`, `spec.md > Data Model` (`reports`)
  Build: `app/reports/page.tsx`, SVG charts, aggregation queries, `POST /api/report/summary` (larger model, cached), print stylesheet with header and disclaimer.
  Verify (mechanical): Build passes. With 28 seeded days, confirm the chart values match DB aggregates and that the summary route returns text and caches (second call makes no model call). Print-to-PDF renders without the app chrome.
  Learner check: Export a 30-day PDF. Would a doctor understand it at a glance?
  Commit: `Health reports with AI summary and PDF export`

- [ ] **14. Friends, feed, and a fair leaderboard**
  Becomes usable: Share an invite link; a friend who opens it is added. See your friends' shared cards in a feed and a weekly leaderboard ranked by strong days (consistency, not weight lost). Optionally link Google to keep your progress across devices.
  Why now: Tier 3; it needs shared cards (slice 8) and daily snapshots, plus new RLS rules for friend visibility.
  PRD ref: `prd.md > Community`
  Spec ref: `spec.md > Community`, `spec.md > Auth and Session` (Google linking), `spec.md > Data Model` (`friendships`, `shared_cards`)
  Build: Invite codes and `app/invite/[code]`, `friendships` migration with friend-read RLS, feed, leaderboard view, Google identity linking.
  Verify (mechanical): Using two test users, accept an invite, confirm each sees the other's cards and a third user sees nothing (RLS), and confirm the leaderboard order matches seeded strong-day counts.
  Learner check: Open your invite link in a second browser profile, then see yourself on each other's leaderboard.
  Commit: `Friends via invite, feed, and weekly leaderboard`

- [ ] **15. Find a specialist**
  Becomes usable: Browse a directory of nutritionists, dietitians, and trainers (clearly labeled sample profiles) and send a consult request with your latest report attached; you see "Request sent."
  Why now: Last; it depends on reports (slice 13).
  PRD ref: `prd.md > Specialists`
  Spec ref: `spec.md > Specialists`, `spec.md > Data Model` (`specialists`, `consult_requests`), `spec.md > What Was Simplified and Why`
  Build: `supabase/seed.sql` sample specialists marked as sample, `app/specialists/page.tsx`, consult request with a report snapshot.
  Verify (mechanical): Build passes. Seed loads, the directory lists the sample entries with the "sample" label, and a request inserts a `consult_requests` row linked to a report.
  Learner check: Send a consult request and check the confirmation makes sense.
  Commit: `Specialists directory and consult requests`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 4 (selfie → avatar → meal → avatar reacts on your phone); feedback can still reshape stats, tone, and avatar style before everything builds on them
- [ ] Core journey explored — after slice 8 (full log → react → evolve → share loop on your phone)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence:
Route and stops:
Edit outcome:
Reflection:
Activity mode:

## Revisions

- Built fully local without cloud accounts or AI keys (learner request: "just do everything locally for now; I will do these setups later"). Supabase runs locally through the Supabase CLI on Docker, the same code as the cloud project. Each AI provider sits behind an adapter that falls back to clearly labeled mock responses when its key is missing, so every flow is usable end to end. Real-AI quality checks (likeness, Indian-food accuracy, Hinglish voice) run once keys are added.
- Slice 2 changed from a Vercel deploy to a local installable PWA. A live URL needs GitHub and Vercel accounts and is deferred to when they exist (steps go in the README).
- Hands-on checkpoints deferred: the learner asked to finish all slices end to end before trying the app. Checkpoint boxes stay unchecked until they try it.
- API routes read the user's Supabase access token from an `Authorization: Bearer` header instead of `@supabase/ssr` cookies plus `middleware.ts`. Next 16 renamed middleware to `proxy`, and all data access is client-side under row level security, so a cookie session added nothing. This is internal; the behavior is the same.
- Hand-written `public/sw.js` instead of Serwist: `@serwist/next` hooks into webpack, but Next 16 builds with Turbopack. One small file covers the offline shell and push.
- Nutrition targets verified: protein is 0.83 g/kg/day (ICMR-NIN RDA 2020 brief note), rising to 1 g/kg for cereal-based diets per the same document's footnote, so it's applied to veg/Jain/vegan users. Fibre is 40 g per 2,000 kcal (ICMR-NIN 2020 as reported), replacing the spec's 30 g estimate. `lib/rules/targets.ts` cites both.
- The learner's shell (`~/.bashrc`, `~/.zshrc`) exports an `OPENAI_API_KEY` that OpenAI rejects as invalid, and Next.js lets shell variables win over `.env.local`. The build's dev server runs with that variable unset, so the app stays in keyless demo mode as requested. The README explains how to override it. A useful side effect: this exercised the "AI unavailable → search instead" fallback for real.
- Food stickers are emoji in sticker-style tiles rather than image-model-generated art, since there's no image key yet. They can be swapped for generated stickers later without code changes beyond `data/indian-foods.json`.
- The demo meal analysis can't actually see the photo, so the "not food" path (`is_food: false`) can only be exercised with a real vision key. It is implemented in the route and UI, and verified only through code review until a key is added.
- Typed and spoken logs go through a free local parser first (`lib/parse/text.ts`: the Indian food table, the activity table, Hinglish number words). GLM is called only for parts the parser can't place, which serves the learner's token-optimization goal. Voice still uses Gemini when its key is set; without it, Chrome's on-device speech recognition provides the transcript, so voice works keyless.
- Strength uses moderate-equivalent minutes = MET-minutes ÷ 4, consistent with WHO 2020's ~600 MET-min/week. Vigorous exercise counts about double (as the spec said), and gentle hatha yoga (2.5 MET) earns partial credit instead of none, which matters for a yoga-heavy audience.
- Common chat questions (protein, fibre, calories, water, sleep, workouts, "can I have X?", "what should I eat?", medical deferral) are answered by a free local engine (`lib/chat/answer.ts`) from the user's real numbers. GLM writes the reply when its key is set. Either way, the same engine supplies the big-number stat card and the "Hoppy suggested food" signal that triggers the diet drip question.
- Product refinements found while verifying: (1) food suggestions are ranked by protein or fibre **per calorie** and are vegetarian until the diet is known, after an early version suggested chole bhature and mutton curry; (2) on the signup day, nudges wait for the first log; (3) concurrent refreshes can't double-save a nudge.
