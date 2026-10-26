---
doc: prd
status: approved
---

# Hoppy — Product Requirements

A calorie tracker (calories in and out) for Indian adults, especially those over 40 trying to lose weight. Your real meals, exercise, water, and sleep power a stylized avatar of *you*, following research-backed rules.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. **First open:** Hoppy says "Hey, I'm about to become *you*." The only ask is a selfie (camera or gallery).
2. **Avatar reveal:** a short "becoming you" animation, then the user's stylized avatar appears and greets them by name (the only other thing asked).
3. **First meal within 60 seconds:** the avatar asks "What did you last eat? Snap it or tell me." The user snaps a photo or speaks it.
4. **Meal card:** Hoppy identifies the Indian dish, asks for a one-tap portion and meal-type confirmation, then streams a warm reply with a big calorie number, key nutrients, and a kind one-liner. The avatar reacts (e.g., the muscle stat fills).
5. **Drip onboarding continues in context:** after the first log, the avatar asks height and weight ("Want to know if that fits your day?"). Later moments ask for age and sex, goal weight, diet type, and sleep, each when first needed (see **Onboarding (Drip)**).
6. **Through the day:** the user logs meals, exercise or yoga, and water, and asks the chat questions ("how much protein today?"). Stats fill, and the avatar comments in character when something is low.
7. **End of day:** the user opens the daily share card (avatar, today's stats, progress), shares it, and comes back tomorrow.
8. **Over weeks:** sustained good days and real progress toward goal weight move the avatar up body stages. Milestones produce milestone cards. Slips pause progress; they never take it away.

## Screens and Layout

- **Onboarding:** selfie capture → avatar reveal. Two steps, nothing else up front.
- **Home (chat):** Zest-style. Greeting at the top, the avatar large and center, the chat thread beneath, and an input bar pinned at the bottom (camera, mic, text, and a "Today" chip). Stats are **not** always visible.
- **Stat sheet:** tap the avatar to open a sheet with the six stat bars, the current body stage, and progress to the next stage.
- **Water tumbler:** reachable from the input bar or stat sheet; a glass that fills as you add water.
- **Calendar:** month view; each day shows food stickers. Tap a day to see its totals and meals.
- **Reports:** trends over time per stat, weight trend, export for a doctor.
- **Meds & supplements:** list with schedules and daily check-offs.
- **Share card:** full-screen preview with a share button.
- **Community:** feed of shared cards and a friends leaderboard.
- **Specialists:** directory and consult request.
- **Settings/profile:** edit details collected by drip onboarding, reminders.

## Look and Feel
*Proposed by the agent at the learner's request; approved with this PRD.*

- **Overall:** calm, warm, premium, Zest-like clarity (one big number per card, lots of breathing room) with a subtle Indian identity. Playful but never childish; readable for 40+ eyes.
- **Colors:**
  - Background "chai cream" `#FBF6EE`; cards white.
  - Ink "kohl" `#1F1B16` for text.
  - Primary "peacock teal" `#0F6E6E`.
  - Accent "turmeric" `#E8A317` for celebration and streaks.
  - Each stat has its own color: Strength pomegranate `#D64545`, Muscle saffron `#F08A24`, Digestion leaf `#4C9A2A`, Hydration sky `#3A8DDE`, Energy turmeric `#E8A317`, Rest indigo `#4B4E9E`.
- **Typography:**
  - Headings and big numbers: **Baloo 2** (rounded, friendly, by Indian foundry Ek Type; supports Devanagari).
  - Body: **Mukta** (same foundry, clean, Devanagari-ready for future Hindi).
  - Base text 17px or larger; high contrast.
- **Avatar art style:** soft 3D stylized character (Memoji/Pixar-lite clay look), a recognizable likeness from the selfie, flattering at every stage, on a plain background so it can sit on cards. All five stages share the same face, outfit, and lighting.
- **Food visuals:** sticker-style Indian food icons with a white outline (roti, dal, rice, idli, dosa, poha, chai, sabzi, biryani, fruit).
- **Indian flavor, subtle:** a light kolam/rangoli dot pattern on share-card borders and milestone moments; festive confetti on stage-ups. No kitsch.
- **Voice of the copy:** warm, playful, a little Hinglish ("Shabaash!", "heyy my muscles are cramping 🥲 protein please"). Appreciative, never critical.
- **Avoid:** generic purple AI gradients, red "over budget" warnings, guilt language, dense dashboards.

## Features and Behavior

### Onboarding (Drip)
Source: learner decision during PRD.
- Up front: selfie only, then the avatar reveal, then name.
- Asked later, each at first need, one question at a time, in the avatar's voice:
  - Height and weight: right after the first meal log (unlocks the Energy target).
  - Age and sex: when the calorie target is first calculated.
  - Goal weight: when body stages are first shown.
  - Diet type (veg / egg / non-veg / Jain / vegan): the first time Hoppy suggests food.
  - Sleep: on the second morning ("How did you sleep?").
- [ ] A new user reaches a logged meal in under 60 seconds, answering nothing but selfie and name.
- [ ] No more than one data question appears in a single moment.
- [ ] Every skipped question can be answered later in settings, and the app still works without it (affected stats show "tell me more to unlock").

### The Avatar and Body Stages
Source: `scope.md > The Character`.
- The avatar is generated from the selfie as five body-stage variants, all at signup:
  1. Starting Line: kind, never mocking
  2. Warming Up
  3. In Rhythm
  4. Strong
  5. Thriving: goal-weight self
- **Moving up:** about 4 weeks of strong daily stats plus progress toward goal weight, paced to a safe 0.5–1 kg/week.
- **Slips:** a bad week **pauses** progress, never demotes. The avatar nudges in character and stays playful.
- **Day-level feel:** the avatar's expression and glow reflect today's stats (energized after exercise, sleepy if rest is low).
- [ ] The avatar is recognizably the user and matches the art style.
- [ ] Stage-up plays a celebration and produces a milestone card.
- [ ] A week of low stats never lowers the stage.

### Daily Stats
Source: `scope.md > Research and AI Decisions`.
Six bars refill each day. Each is something the user raises, never a penalty bar.

| Stat | Fills from | Daily target |
|---|---|---|
| Strength | exercise/yoga minutes | 30–45 min moderate (ICMR-NIN 2024); vigorous counts double (WHO) |
| Muscle | protein | ~0.83 g/kg body weight (ICMR-NIN; verify in spec) |
| Digestion | fiber | ~30 g per 2,000 kcal (ICMR-NIN; verify in spec) |
| Hydration | water | ~2–2.5 L |
| Energy | calories in vs. out | full when inside the target band (~500 kcal under maintenance) |
| Rest | sleep hours | 7–9 h |

- Salt (under 5 g) and fat (under 30% of calories) shape chat tips, not bars.
- When a stat is low, the avatar speaks in character, at most a few times a day.
- [ ] Logging a high-protein meal visibly raises Muscle on the stat sheet.
- [ ] Logging 30 minutes of brisk walking visibly raises Strength.
- [ ] Each stat shows the current value and target (e.g., "42 / 55 g protein").

### Meal Logging (Photo and Voice)
Source: `scope.md > The Core Loop`.
- **Photo:** camera or gallery → Hoppy names the dish (Indian dishes first-class) → one-tap portion (e.g., number of rotis, katori size) and meal type (pre-selected by time of day) → streamed reply with the calorie number, protein/fiber/carbs/fat, and a kind one-liner.
- **Voice:** hold the mic and speak in English, Hindi, or Hinglish ("2 roti, dal, thodi bhindi") → transcript shown → same confirm-and-reply flow.
- Mixed thalis are split into items, each editable.
- The user can edit or delete any logged meal.
- [ ] A photo of dal-chawal returns the dish name, a calorie number, and nutrients within a few seconds, with streaming text.
- [ ] A Hinglish voice log produces the same kind of card.
- [ ] Editing the portion updates the numbers and stats immediately.

### Exercise and Yoga Logging
- Logged by chat, text, or voice ("30 min brisk walk", "12 rounds surya namaskar", "45 min yoga").
- Hoppy estimates duration, intensity, and calories burned using standard activity energy values.
- [ ] An exercise log shows calories out and raises Strength.
- [ ] Calories out feed into the Energy balance.

### Water Tumbler
- A glass that fills as the user adds water in one tap per glass (amount adjustable). It's full when the daily target is met.
- [ ] Each tap visibly fills the tumbler and Hydration.

### Ask About Your Day (Chat)
- Questions in the same chat ("how much protein today?", "can I have a samosa?").
- Answers use the user's own logged data and targets. They are short and kind, with a big number when relevant.
- [ ] "How much protein today?" returns the correct sum of today's logs.
- [ ] General health questions get a brief answer that notes Hoppy isn't medical advice.

### Daily Share Card
Source: `scope.md > The POC Boundary` item 7.
- A Strava-style card designed to make users proud to post, in story size (9:16):
  - the avatar then vs. now (start stage vs. current)
  - today's highlights (calories in/out, protein, active minutes)
  - streak and progress toward goal
  - Hoppy branding, with the kolam border
- Shared through the phone's share sheet or saved as an image.
- [ ] The card renders with the user's avatar and real numbers and can be shared or saved.

### Diet Calendar and History
- Month view with food stickers per day; tap a day to see its meals and totals.
- [ ] Past days show what was logged.

### Medicines and Supplements
- Add a medicine or supplement with dose and times, check it off daily, and get reminded in the avatar's voice.
- [ ] A scheduled item shows as due, can be checked off, and triggers a reminder.

### Streaks
- A day counts when at least one meal is logged. The streak shows on the share card and home.
- [ ] Logging on consecutive days increments the streak; a missed day resets it.

### Reminders
- Meal-time nudges in the avatar's voice ("Lunch? Snap it, or just tell me"), plus low-stat nudges and medicine reminders. Users can configure times.
- [ ] A reminder fires at the set time and opens straight to logging.

### Milestone Share Cards
- Generated on stage-up, weight milestones (every 2 kg toward the goal), and streak milestones (7/30/100 days).
- [ ] Reaching a milestone offers a shareable card.

### Reports
- Weekly and monthly trends for each stat, calories in vs. out, weight trend, and adherence. A deeper AI-written summary is available on demand.
- Exportable as a PDF to show a doctor, nutritionist, or trainer.
- [ ] A report for a chosen period shows trends and exports as a readable PDF.

### Community
- A feed of friends' shared cards and a friends leaderboard ranked by weekly consistency, not weight lost, so it's fair across body sizes.
- [ ] A user can add a friend, see their cards, and see the weekly leaderboard.

### Specialists
- A directory of nutritionists, dietitians, and trainers. The user can send a consult request with their report attached.
- [ ] A user can browse specialists and send a request including a report.

## States and Boundaries

- **First use:** selfie only, then straight to logging. Stats that need missing data show "tell me more to unlock."
- **Empty day:** the avatar invites the first log for the time of day; the stats sit at their morning baseline.
- **Not food:** "That doesn't look like food 👀 Try again, or tell me what you ate."
- **Dish unsure:** Hoppy offers its top guesses plus "something else", and the user picks or types.
- **Voice unclear:** shows the transcript and asks the user to confirm or retry.
- **Avatar generation fails or is slow:** a friendly wait screen, then retry. A placeholder avatar lets the user start logging.
- **AI unavailable:** manual entry from a food list still works.
- **Slipping:** progress pauses, never demotes. Nudges stay playful.
- **Persistence:** all logs, the avatar, and progress persist between sessions.

## Product Decisions

- **Everything is in scope, built in tier order, and finished before the demo.** *Learner: "all of it now — just schedule the tasks"; "we will come to demo only after we finish everything."*
- **The push-up alarm is cut.** It was an analogy, not a feature.
- **The character is a stylized avatar from the user's photo,** like other photo-to-avatar tools.
- **Drip onboarding:** the selfie is the only up-front ask; everything else comes at first need. *Reason: bombarding users with questions in the first five minutes makes them drop the app.*
- **Slips pause and never demote.** Nudges come in character ("my muscles are cramping, I need protein"). *Reason: supportive, not critical.*
- **Stats are hidden** behind a tap on the avatar. The avatar speaks up when something is low.
- **The share card shows progress (avatar then vs. now), not just numbers.** *Reason: users should be proud to share, and it should inspire non-users, like Strava.*
- **Reports are exportable for doctors.**
- **Six stats and five body stages,** proposed by the agent from research and accepted by the learner.
- **Look and feel,** proposed by the agent at the learner's request.
- **Privacy is not a constraint for the MVP.**
- *Assumption:* the friends leaderboard ranks by consistency, not weight lost.
- *Assumption:* a streak day means at least one meal logged.
- *Assumption:* the edge-case behaviors in **States and Boundaries**.

## What We're Building
All 16 items in `scope.md > The POC Boundary`, in tier order, all finished before the demo:
- **Tier 1 (the kernel):** Onboarding (Drip), Avatar and Body Stages, Daily Stats, Meal Logging, Exercise and Yoga Logging, Ask About Your Day, Daily Share Card.
- **Tier 2:** Calendar, Water Tumbler, Medicines and Supplements, Streaks, Reminders, Milestone Cards, Reports.
- **Tier 3:** Community, Specialists.

## Deferred From the POC
None. The learner has time and wants everything finished before the demo.

## Possible Later Enhancements
- Full Hindi and regional-language UI (the fonts already support Devanagari).
- Wearable sync for steps and sleep.
- Regional cuisine packs (Bengali, Gujarati, Kerala, and more) to improve dish recognition.

## Non-Goals
- **Medical diagnosis or treatment advice:** Hoppy is a wellness tool, and reports are for sharing with professionals.
- **Lab-accurate calorie counts:** photo estimates are approximate; portion confirmation narrows the error.
- **Payments or bookings for specialists:** a consult request is enough for now.
- **Public leaderboards with strangers:** friends only.
- **Push-up alarm or phone-locking alarms:** cut; it was only an analogy for engaging reminders.

## Open Questions
- Exact protein and fiber targets, to verify against the NIN 2024 guideline document. **Resolve in `4-spec`.**
- Mobile app (Expo) vs. web app, given the learner is on Linux. **Resolve in `4-spec`.**
- Exact thresholds for a "strong day" and for stage-up. Can be tuned during the build.
