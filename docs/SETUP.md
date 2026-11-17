# Isle: setting up the live version

Everything below is free. Steps marked *optional* switch on extra features; the app works without them.

## 1. Database (Supabase)
1. Supabase → **SQL Editor** → New query → paste all of `supabase/schema.sql` → **Run**.
   - Already ran an older `schema.sql`? Run `supabase/v2-launch.sql` instead (it's safe to re-run).
2. **Authentication → Sign In / Providers → Email**: turn off **Confirm email** so test accounts work instantly.
3. **Authentication → URL Configuration**: Site URL = your Vercel address; add `https://<your-site>/**` to Redirect URLs (needed for password reset links).
4. Make yourself a moderator (after you've signed up on the site):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
   ```
   Then **Profile → Moderation and metrics** appears for you.

## 2. Hosting (Vercel) environment variables
| Key | Type | Needed for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Config | Live accounts (required) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Config | Live accounts (required) |
| `GROQ_API_KEY` | Secret | AI "Help me reply" (optional; built-in suggestions otherwise) |
| `UNSPLASH_ACCESS_KEY` | Secret | Real photos on sample events (optional) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Secret | ₹99 deposit through Razorpay **test mode** (optional) |
| `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NOTIFY_FROM` | Secret | Emails for new matches and confirmed dates (optional) |

After changing variables: **Deployments → ⋯ → Redeploy** (untick build cache).

Notes:
- The service-role key is powerful. Only ever paste it into Vercel as a **Secret**; never commit it or share it.
- Resend's free sender (`onboarding@resend.dev`) can only email your own address until you verify a domain.
- Razorpay test cards: use the test card numbers from Razorpay's docs. No real money moves with `rzp_test_` keys.

## 3. Reviewer test accounts
Sign up twice on the live site (normal window + incognito), complete both scrapbooks, set "interested in" so they fit each other, react to each other so they match, and send a message. Suggested logins:
- `reviewer1@isle.test` / `Isle@2026`
- `reviewer2@isle.test` / `Isle@2026`

## 4. What's real and what's simulated
| Real | Simulated / sample |
|---|---|
| Email sign-up, sign-in, password reset | Selfie check (no verification vendor yet) |
| Profiles, photos and voice notes (Supabase Storage) | Sample people, events, venues (labelled "Sample") |
| Private discovery (database picks who you can see) | Phone OTP needs an SMS provider + DLT registration |
| Reactions, matches, live chat, date plans | Deposit refunds/payouts (payments are test mode) |
| Blocking, reporting, moderation, suspensions | |
| Rate limits, account deletion, data download | |
| Funnel metrics for the north star (dates attended) | |
