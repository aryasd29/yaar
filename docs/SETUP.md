# Isle: setting up the live version

Everything below is free. Steps marked *optional* switch on extra features; the app works without them.

## 1. Database (Supabase)
1. Supabase → **SQL Editor** → New query → paste all of `supabase/schema.sql` → **Run**.
   - Then run, in order: `supabase/v2-launch.sql`, `supabase/delete-account.sql`, `supabase/v3-plus.sql`, `supabase/v4-real.sql`. Each is safe to run again.
   - Already set up before? Just run the ones you haven't run yet (currently `v3-plus.sql` and `v4-real.sql`).
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
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | **Required for payments**: Isle Plus, Tables seats, date bundles, the ₹99 promise, refunds and Isle credit. Also used for notifications. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Secret | Razorpay's real checkout and refunds in **test mode** (`rzp_test_…`). Without them, Isle shows its own labelled test checkout. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Config / Secret / Config | Push notifications. Generate a pair with `npx web-push generate-vapid-keys`; `VAPID_SUBJECT` is `mailto:` plus your email. |
| `RESEND_API_KEY`, `NOTIFY_FROM` | Secret | Emails for new matches and confirmed dates (optional) |
| `GROQ_API_KEY` | Secret | AI "Help me reply" (optional; built-in suggestions otherwise) |
| `UNSPLASH_ACCESS_KEY` | Secret | Real photos on Tables (optional) |

After changing variables: **Deployments → ⋯ → Redeploy** (untick build cache).

Notes:
- The service-role key is powerful. Only ever paste it into Vercel as a **Secret**; never commit it or share it.
- Resend's free sender (`onboarding@resend.dev`) can only email your own address until you verify a domain.
- Razorpay test mode: pay with UPI ID `success@razorpay` or Razorpay's test cards. No real money moves with `rzp_test_` keys. In the Razorpay dashboard, keep **automatic capture** on so refunds work.
- Push on iPhone works only after "Add to Home Screen" (iOS 16.4+).

## 3. Reviewer test accounts
Sign up twice on the live site (normal window + incognito), complete both scrapbooks, set "interested in" so they fit each other, react to each other so they match, and send a message. Suggested logins:
- `reviewer1@isle.test` / `Isle@2026`
- `reviewer2@isle.test` / `Isle@2026`

## 4. What's real and what's simulated
Everything runs for real between real accounts. What's left needs a company, a contract or paperwork:

| Real | Not yet |
|---|---|
| Email sign-up, sign-in, password reset, account deletion, data download | Phone OTP (needs an SMS provider and DLT registration) |
| Selfie check: on-device liveness (turn, turn, smile) and face match against your photos; badge granted by the database; moderators spot-check and revoke | Selfie check runs on the member's device, so a determined technical user could fake it; moderator spot-checks are the backstop |
| Profiles, photos and voice notes (Supabase Storage); private discovery | Date venues are sample cafés (no café partnerships yet) |
| Reactions, matches, live chat, date plans, push and email notifications | Scheduled reminders the day before a date (needs a background job) |
| Tables: members host free Tables, admins can sell seats; real attendees, places revealed on joining, cancellations | Recurring Plus billing (Plus is paid per period; it doesn't auto-charge) |
| Payments in Razorpay test mode: Isle Plus, seats, bundles, the ₹99 promise; server-side prices; refunds; no-show payouts as Isle credit | Live (real-money) payments need a Razorpay business account |
| QR check-in between two phones, verified by the database | |
| Live location link for a trusted contact | |
| Blocking, reporting, moderation, suspensions, rate limits; funnel metrics | |
