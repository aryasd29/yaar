# Isle

**Dating that actually gets you to the date.** A mobile-first web app (PWA) built for the eLitmus product assignment.

Scrapbook profiles instead of CVs, a small daily drop (Tide) instead of swiping, reactions to one specific thing to connect, a Chemistry Room of games, Help Me Reply, gentle date suggestions, a Date Planner, Date Assurance and safety tools, Soft Exit, Social Battery, and Tables for meeting people in a new city.

See [docs/PRODUCT.md](docs/PRODUCT.md) for journeys, dependencies, edge cases, and what is real vs mocked.

## Run locally

Needs **Node.js 22.13 or newer** (Tailwind v4 needs it).

```bash
npm install
npm run dev        # http://localhost:3000
```

Optional environment variables (`.env.local`):

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` or `GEMINI_API_KEY` | Turns on AI suggestions in Help Me Reply. Without one, built-in rule-based suggestions are used. |
| `NEXT_PUBLIC_YAAR_HOUR` | Daily drop time, 24-hour `HH:MM` (default `20:00`). |
| `NEXT_PUBLIC_SHOW_DEMO_TOOLS` | `true` shows the evaluator demo tools to everyone. |

## Live mode (Supabase)

Full step-by-step setup, environment variables and what is real vs simulated: **[docs/SETUP.md](docs/SETUP.md)**.


Without Supabase settings, Isle runs entirely on your device (demo mode). With them, it runs live:
real accounts, reactions, matches, chat and shared date plans, updating in real time.

1. In Supabase, open **SQL Editor**, paste all of `supabase/schema.sql`, and click **Run**.
2. In **Authentication → Sign In / Providers → Email**, turn off **Confirm email** (so test accounts work instantly).
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Phone sign-in works once an SMS provider (for example Twilio) is connected under **Authentication → Providers → Phone**.

Security: every table has Row Level Security. People can only read their own reactions, matches,
messages and plans. Work and college live in an owner-only table and are never shown to others.
Sample people (ids starting `u_`) stay on the device and are labelled "Sample profile".

## Trying it

- Sign up with any 10-digit Indian mobile number; the prototype OTP is `123456`.
- After onboarding you get a small demo world: an ongoing chat, a new match, a past date ready for feedback, two received reactions and a chat that shows the Red Flag Radar.
- **Demo tools** (move the clock forward to see drops refresh, date nudges and match expiry) are hidden by default. Open any page with `?demo=1` to turn them on for that device (`?demo=0` turns them off), or set `NEXT_PUBLIC_SHOW_DEMO_TOOLS=true`.

## Tech

Next.js 15 (App Router, TypeScript), Tailwind CSS v4, Motion, Zustand, lucide-react icons, qrcode.react. Fonts: Nunito Sans, Inter, Caveat (via Fontsource).

## Disclosures

- Scaffolded with `create-next-app`. Open-source libraries listed above.
- The Coco mascot and all scene illustrations are original SVGs drawn in code for this project.
- Venues, events, availability, payments, the selfie check and demo people are **mock data**, labelled "Prototype" in the app.
- AI-assisted development tools were used to write code.
