# Isle: product understanding (Step 1)

Isle is a dating app built around one outcome: helping two people move from "who is this?" to a real, safe first date, at a pace both are comfortable with. **Isle earns when people actually meet, not when they stay stuck on the app.**

## Core journeys

| # | Journey | Steps | Screens |
|---|---|---|---|
| J1 | Join | Welcome → phone/Google sign-in → selfie + age check → preferences and Shared Intent → scrapbook → Social Battery | 1–6 |
| J2 | Discover | Today (Tide) → open an introduction → full scrapbook → react to one element (photo, hot take, voice note, answer) | 7–10 |
| J3 | Connect | Likes (received / sent) → react back → match celebration → chat unlocks | 11–13 |
| J4 | Build chemistry | Chat → Help Me Reply → Chemistry Room games → Conversation Pulse tips | 14–17 |
| J5 | Plan | Date suggestions (3 ideas, private picks) → Date Planner → venue → time → shared date card → optional deposit | 19–24 |
| J6 | Meet | Safety Centre (trusted contact, check-ins) → QR check-in → post-date feedback → Second Date Button | 25–28 |
| J7 | End kindly | Soft Exit (with or without a reason) or instant block/report | 18 |
| J8 | Grow | Explore → Tables / communities / City Starter Pack | 29–34 |
| J9 | Control | Profile, edit scrapbook, preferences, privacy, battery, notifications, safety | 35–41 |

## Dependencies

- A **match** requires mutual reactions. Chat, Chemistry Room, Date Planner and Soft Exit all hang off a match.
- **Discovery** depends on preferences, Shared Intent, blocks/passes, Social Battery and workplace/college exclusions.
- **Date Planner** depends on a match plus both people choosing "I'd go" on at least one shared idea.
- **QR check-in**, the **show-up record**, the **deposit** and the **Second Date Button** depend on a confirmed date.
- **Safety** (block, report) must be reachable from every person-facing screen and never depends on anything else.

## Edge cases we handle

- **Empty drop:** not enough people nearby yet → friendly empty state, suggest Tables, never fill with poor matches.
- **Missed Tide:** today's drop stays open until the next one; drops never pile up after inactivity.
- **Low battery:** no new drops, no nudges; existing chats stay open.
- **Popular profiles:** incoming reactions are capped per day so nobody is flooded.
- **One-sided reaction:** the reactor never learns about a pass; reactions simply expire.
- **Soft Exit vs block:** Soft Exit sends a kind closing note; block is instant and silent; report can follow either.
- **Date cancelled:** 24h+ before → full refund; inside 24h → half of canceller's deposit to the other person; safety reasons → never penalised.
- **Disputed attendance:** no payout until resolved; QR scan is the primary proof.
- **Colleagues:** exclusions reduce exposure but can't promise perfect invisibility (photos can still identify someone); the app says so.
- **Deleted account:** profile disappears from drops, matches close with a neutral note, data deleted per retention policy.

## What is real vs mocked in the submission

| Area | Status |
|---|---|
| Accounts, profiles, reactions, matches, chat, date plans | Real (Supabase) |
| Phone OTP | Demo OTP for evaluator accounts; real SMS needs a paid provider |
| Selfie liveness check | Simulated; production would use a verification provider |
| Help Me Reply / Red Flag Radar | LLM when an API key is set, otherwise a rule-based fallback, labelled |
| Venues, availability, payments, deposit | Mock data, labelled "Prototype" |
| Tables, Circles, Explore | Prototype screens with mock events |
