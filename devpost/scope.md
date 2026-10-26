---
doc: scope
status: approved
---

# Hoppy

A calorie tracker (calories in *and* out) for Indian adults that turns your day into a game, and the character is you.

## The Unique Kernel
**Your own health choices power a character that is you.** Exercise makes it stronger, protein builds its muscles, fiber improves its digestion, and so on. Every effect follows nutrition and health research, never made-up game logic. Food and activity live together in one picture instead of fighting each other.

## Who It's For
Indian adults over 40 trying to lose weight, plus the broader group of Indian adults struggling with diet consistency. They eat Indian food (messy, mixed meals that are a pain to type ingredient by ingredient) and do Indian forms of exercise, including yoga. Existing trackers are built around Western foods and often feel critical.

## The Character
A stylized avatar generated from the user's own photo, similar to other photo-to-avatar tools. It's the playing character, and its body and stats change with what the user eats and does.

**Two layers of reward** (gamification evidence supports short-term engagement; long-term effects are weaker unless tied to real progress, so long-term rewards track real progress, not points):
- **Within the day (fast feel):** the avatar reacts right away. Strength or energy glows after exercise; muscle, digestion, and hydration stats fill from protein, fiber, and water. These reset daily against ICMR-NIN targets.
- **Over weeks (real change):** the avatar's body moves through a few visible stages based on 7- and 28-day consistency, plus weight trend if logged.
- Body-stage variants are generated once at signup and swapped, not regenerated on every event.

## The Core Loop
Throughout the day: snap a photo of a meal, or just say it out loud if you forgot to take one. Log exercise or yoga. Hoppy works out the nutrients and calories, and your character reacts. Ask questions about your day in the same chat. At the end of the day (or at a milestone), share a card. People come back because the character is *them* and it changes with what they do, and because posting becomes part of an ongoing journey of getting healthy and staying healthy.

## Inspiration & Identity
- **Zest** by @jaimintf ([post](https://x.com/jaimintf/status/2106776095790158162)): chat-first home, photo meal logging, one big kcal number per card, short kind one-liners ("A plot twist. You're fine."), questions in the same chat ("how much protein" → 70 g), a calendar with food stickers. Calm, light theme, clean, not childish.
- The post's build prompt references **Appllama** (design MCP, paid Pro plan; [skills](https://github.com/Appllama/appllama-skills) are free and target Expo/React Native, iOS-native "Liquid Glass" style). Tooling and stack are decided in `4-spec`; the learner is on Linux.
- **Duolingo** for streaks; **Strava** for sharing that spreads on social media.
- Tone: frictionless, supportive, appreciative, never critical. Feels like a game you play during your day, but for adults.

## Why This Matters to the Learner
They want a health app that actually fits Indian food, exercise, and life, and that encourages people instead of judging them. They want to get it working fast.

## What "Working" Looks Like
Someone comes back over their day and plays the game. They log a meal by photo (or voice) and an exercise, and their character visibly changes in research-backed ways: stronger after exercise, muscle after protein, better digestion after fiber. The "oh, that's cool" moment: a shareable card showing *your* character with real numbers. It's visual, not childish, and something people compete over in a healthy way.

## The POC Boundary
The learner chose to keep **everything in scope** and finish all of it before the demo. Tiers are build order only.

**Build order (to-do):**

*Tier 1: the kernel*
1. Chat-first home with the user's character (a stylized avatar from their photo) and its stats
2. Photo meal logging: AI identifies the Indian dish and estimates nutrients and calories, streaming a warm reply
3. Voice logging as the fallback when there's no photo
4. Exercise and yoga logging (calories out)
5. Research-based rules that turn nutrients and activity into character changes
6. Asking about your day in the chat ("how much protein today?")
7. Daily share card (Strava-style): your avatar then vs. now plus real progress numbers, so you're proud to post it. Users compete with each other, and non-users get curious and join.

*Tier 2: the daily habit*
8. Diet calendar and history
9. Water tumbler that fills as you add water
10. Medicines and supplements tracking
11. Streaks (Duolingo-style)
12. Reminders to log meals
13. Milestone share cards for the journey
14. Reports: deep analysis of your health over time, exportable for doctors and specialists

*Tier 3: bigger systems (need accounts and a backend)*
15. Community
16. Connecting to specialists (nutritionists, dietitians, trainers)

## Later
Nothing deferred. The learner chose to keep everything in scope, ordered above.

## Explicitly Cut
- **Push-up alarm.** It was an analogy for reminders that are engaging and hard to ignore, not a feature to build (learner, during spec).

## Research and AI Decisions (pin exact models in `4-spec`)
- **Research sources:** ICMR-NIN Dietary Guidelines for Indians (2024) for nutrient targets, WHO physical activity guidelines, standard MET values for exercise and yoga calories, Indian Food Composition Tables (IFCT, NIN) for nutrient numbers.
- **Which model for which task** (learner has Google, OpenAI, and GLM keys; optimize for tokens and model strengths):
  - Meal photo → dish and portion: OpenAI mid-tier vision (lowest calorie error in a 2025 comparison). Portion is confirmed in one tap.
  - Nutrients: looked up from IFCT, not generated by a model.
  - Voice log (Hindi/Hinglish/English): Gemini Flash (takes audio in directly).
  - Avatar from photo and body stages: Google image model, run rarely.
  - Chat questions and one-liners: cheapest tier (GLM Flash or OpenAI's smallest).
  - Reports: larger reasoning model, on demand only.
  - Stat and avatar rules: plain code, no model.
- **Privacy:** not a constraint for this MVP (learner's call). All three providers are fair game; choose purely on cost and strength. The basics still apply: API keys stay in `.env`, and the learner profile stays out of the public repo.
- No study validates any model on Indian food portions; that remains a known accuracy risk.

## Open Questions (for `3-prd`)
- Exact daily stats, body stages, and the thresholds that move between them.
- Share card layout and how it stays visual, numeric, and non-childish.
