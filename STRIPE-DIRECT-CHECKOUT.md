# Stripe Direct Checkout — BCHN Exam Prep

Phase 1 build. All behind `/buy.html` — does NOT change the existing app or auth flow.

## Architecture

```
buy.html (sales page + access gate)
  ├── /.netlify/functions/create-checkout     → Stripe Checkout session
  ├── /.netlify/functions/stripe-webhook      → enrollment + Kit sync + welcome email
  ├── /.netlify/functions/send-magic-link     → passwordless login
  ├── /.netlify/functions/verify-magic-link   → sets session cookie, redirects
  ├── /.netlify/functions/check-access        → checks auth + enrollment
  └── /.netlify/functions/logout              → clears session cookie
```

## Flow

1. **New buyer** visits `buy.html` → sees sales page
2. Clicks "Get Started" → enters email → redirects to Stripe Checkout
3. Stripe processes payment → webhook fires → creates `direct_enrollments` row + Kit sync + sends welcome magic link email
4. Buyer clicks magic link in email → session cookie set → redirected to buy.html → sees "Welcome Back" with link to main app
5. **Returning user** visits `buy.html` → `check-access` detects session + enrollment → shows portal access

## Setup Required

### 1. Env vars (Netlify)

```
STRIPE_SECRET_KEY=sk_test_...          # Stripe test mode secret key
STRIPE_WEBHOOK_SECRET=whsec_...        # From Stripe webhook dashboard
EXAM_PREP_PRICE_ID=price_...           # Created by tools/stripe-setup.mjs
MAGIC_LINK_SECRET=<random-64-char>     # openssl rand -hex 32
RESEND_API_KEY=re_...                  # Already exists in CRM
KIT_API_KEY=...                        # Already exists in CRM
SITE_URL=https://exam.holisticconsultinghq.com
FROM_EMAIL=hello@holisticconsultinghq.com

# Already set for existing app:
SUPABASE_URL=https://uvzfhksyjqadkxypcocq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Stripe Product Setup

```bash
# In test mode first!
cd "Exam Prep"
node tools/stripe-setup.mjs
```

This creates the product/price in Stripe and saves IDs to `stripe_products.json`.

### 3. Database Migration

Run `migrations/001-direct-enrollments.sql` in the Supabase SQL editor.

### 4. Stripe Webhook

In Stripe Dashboard → Developers → Webhooks:
- Endpoint URL: `https://exam.holisticconsultinghq.com/.netlify/functions/stripe-webhook`
- Events: `checkout.session.completed`
- Copy the signing secret → `STRIPE_WEBHOOK_SECRET` env var

### 5. Test Locally

```bash
npm install
npx netlify dev
# Visit http://localhost:8888/buy.html
```

For webhook testing, use Stripe CLI:
```bash
stripe listen --forward-to http://localhost:8888/.netlify/functions/stripe-webhook
```

## What This Does NOT Change

- `index.html` — the existing exam prep app is untouched
- Existing Supabase Auth login flow — still works exactly as before
- No existing URLs or routes change
- `buy.html` is a completely separate entry point

## Pricing Decision Needed

Current default: **$297 one-time** — Sean can change this in:
- `tools/stripe-setup.mjs` (PRICE_CENTS constant)
- `buy.html` (display price in buttons/copy)

## Kit Tags Applied on Purchase

- `bchn-exam-prep-purchased`
- `exam-prep-customer`
