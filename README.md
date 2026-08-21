# frontrow.lol

A 100-slot board. Each listing pays monthly, and **what you pay is your rank**.
Pay more than the listing above you and you take its spot. Ties break toward
whoever reached that price first.

Next.js 16 · Supabase (Postgres) · Polar (payments)

---

## The one design decision worth knowing

Polar can't change the amount of a *pay-what-you-want* subscription in place —
`subscriptions.update()` accepts `productId`, not `amount`. Free-form bidding
would mean cancel-and-re-checkout every time someone climbs: two charges, a
gap in coverage, and a checkout page between the user and the thing they
already decided to do.

So the board runs a **fixed ladder of ten prices**, one Polar product each:

```
$29  $39  $49  $69  $99  $149  $199  $299  $499  $999
```

Climbing is a product swap with `prorationBehavior: "invoice"` — Polar charges
the difference immediately and the new rank is live in seconds. Set the ladder
in `src/lib/tiers.ts`; `npm run setup:products` creates the matching products.

Prices are quantised, but that's arguably better UX than a free-form amount
field: "take #12 for $99" is one click and no arithmetic.

---

## Setup

**1. Supabase** — create a project, then run `supabase/schema.sql` in the SQL
editor. It creates the tables, the `board` view (where rank is computed), and
`activate_listing()` (which enforces the 100-slot cap under an advisory lock,
so two simultaneous payments can't both claim the same rank).

**2. Polar** — create an organization, grab an access token from
Settings → Developers, then:

```bash
POLAR_ACCESS_TOKEN=polar_… POLAR_SERVER=sandbox npm run setup:products
```

Paste the printed `POLAR_PRODUCT_IDS` into `.env.local`. Re-running is safe —
existing products are reused, not duplicated.

**3. Webhook** — Settings → Webhooks → add `https://your-domain/api/webhooks/polar`,
subscribed to:

```
subscription.active      subscription.updated    subscription.canceled
subscription.uncanceled  subscription.past_due   subscription.revoked
order.paid
```

Put the signing secret in `POLAR_WEBHOOK_SECRET`.

**4. Env** — copy `.env.example` to `.env.local` and fill it in.

```bash
npm run dev
```

For local webhook testing, tunnel with `ngrok http 3000` and point the Polar
webhook at the tunnel — the board only ever goes live off a verified event.

---

## How it works

| Path | Does |
|---|---|
| `/` | The board. Rank computed in SQL, never stored. |
| `/submit` | Claim a slot → creates a `pending` listing → Polar checkout. |
| `/success` | Shows the rank landed at and the manage link. |
| `/manage/[token]` | Secret-link control panel: rank, clicks, cost per click, climb, billing portal. |
| `/r/[slug]` | Outbound click tracker, then redirect. |
| `/api/webhooks/polar` | The only thing that puts a listing on the board. |
| `/api/cron/grace` | Daily. Handles both halves of the grace period. |

**Listing states:** `pending` → `active` → (`past_due` | `grace`) → `canceled`.
`past_due` stays visible with a badge — public pressure collects better than a
dunning email. `grace` means pushed off a full board, with 7 days to climb back;
the cron stops billing immediately so nobody pays for a slot they've lost.

**Auth:** there is none. Each listing gets a `manage_token` UUID and the secret
link is the credential. No signup friction, nothing to reset. RLS is on with no
public policies — every query runs server-side with the service role key.

---

## Deploying

Vercel: import the repo, add the env vars, done. `vercel.json` already schedules
the grace cron daily at 09:00 UTC; set `CRON_SECRET` to match.

Set `NEXT_PUBLIC_SITE_URL` to the real domain — it builds the checkout return URL.
Drop `POLAR_SERVER=sandbox` when you go live, and re-run `setup:products` against
production (sandbox product IDs don't carry over).

---

## Not built yet

**Email is the gap that matters.** Nothing is sent right now — no manage link, no
monthly click report, no "you dropped to #14" nudge. Polar sends payment receipts,
that's all. The monthly report is the single highest-leverage thing to add: a
listing that sees *"340 clicks for $49 — $0.14 each"* doesn't churn, and churn is
what kills boards like this. Wire Resend into the webhook handler and the cron.

Also missing: logo upload (`logo_url` exists but nothing populates it), a
moderation queue (you will get spam and scam URLs within hours of any real
traffic, and one on the front page ends the run), and OG image generation.

---

## Tested

- Schema runs clean on Postgres 16.
- Ranking, the tie-break, and the 100-slot cap were exercised with 102 listings:
  a floor-price latecomer is correctly refused a slot, and a higher payer takes
  #1 and bumps exactly one listing to grace.
- Ranks verified stable across repeated queries — equal price *and* equal
  timestamp fall back to `id`, so rows can't swap places between page loads.
- Pages render and typecheck; lint is clean.

The payment paths (checkout, webhook activation, prorated climb) are written
against the verified Polar SDK types but have **not** been run against a live
Polar account. Test those in sandbox before launch.
