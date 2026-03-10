

## SaaS Onboarding Growth Engine — Phase 1

This plan covers the two priorities you selected: **Activation Scoring + Onboarding Wizard** and **Trial System + Auto Conversion**, plus **cron-based email nudges/reminders via Resend**.

This is a large system. I'll break it into manageable implementation steps.

---

### 1. Database Schema (Migration)

Create the following tables:

**`activation_events`** — tracks each scored action per user
- `id uuid PK`, `company_id uuid NOT NULL`, `user_id uuid NOT NULL`, `event_type text NOT NULL` (e.g. `account_created`, `first_site`, `first_equipment`, `document_uploaded`, `first_inspection`, `team_member_invited`), `score integer NOT NULL`, `created_at timestamptz DEFAULT now()`
- RLS: users can view/insert own company events

**`activation_scores`** — materialized score per user
- `id uuid PK`, `company_id uuid NOT NULL`, `user_id uuid NOT NULL UNIQUE`, `total_score integer DEFAULT 0`, `is_activated boolean DEFAULT false`, `activated_at timestamptz`, `updated_at timestamptz DEFAULT now()`
- RLS: users can view own company scores

**`onboarding_progress`** — wizard step tracking
- `id uuid PK`, `company_id uuid NOT NULL`, `user_id uuid NOT NULL UNIQUE`, `step_create_site boolean DEFAULT false`, `step_add_equipment boolean DEFAULT false`, `step_first_inspection boolean DEFAULT false`, `step_first_certificate boolean DEFAULT false`, `completed_at timestamptz`, `updated_at timestamptz DEFAULT now()`
- RLS: users can view/update own record

**`onboarding_nudges`** — tracks sent nudges to avoid duplicates
- `id uuid PK`, `company_id uuid NOT NULL`, `user_id uuid NOT NULL`, `nudge_type text NOT NULL`, `delivered_via text NOT NULL` (email/in_app), `created_at timestamptz DEFAULT now()`
- UNIQUE on `(user_id, nudge_type)`

**`trial_status`** — trial tracking per company
- `id uuid PK`, `company_id uuid NOT NULL UNIQUE`, `trial_start timestamptz NOT NULL DEFAULT now()`, `trial_end timestamptz NOT NULL`, `extended boolean DEFAULT false`, `extended_at timestamptz`, `extension_reason text`, `converted_at timestamptz`, `status text DEFAULT 'active'` (active/converted/expired)
- RLS: users can view own company trial

Add a DB function `recalculate_activation_score(uuid)` that sums `activation_events` for that user and upserts into `activation_scores`.

---

### 2. Activation Scoring Hook (`src/hooks/useActivationScore.ts`)

- Fetch `activation_scores` and `onboarding_progress` for current user
- Expose `score`, `isActivated`, `progress` (wizard steps), and a `recordEvent(eventType)` function
- `recordEvent` inserts into `activation_events` (with idempotency check — don't double-count same event type per user), then calls `recalculate_activation_score` via RPC
- Automatically record `account_created` on first load if not present

---

### 3. Onboarding Setup Wizard (`src/components/onboarding/SetupWizard.tsx`)

A persistent card on the Dashboard (replaces/extends the existing "Getting Started" checklist) that shows:

```text
Setup Progress (55/100)
━━━━━━━━━━░░░░░░░░░░

✔ Create your first Site
✔ Add Equipment  
□ Run your first Inspection
□ Generate your first Certificate
```

- Each step links to the relevant page with `?action=new` params
- Progress bar shows activation score as percentage of 100
- Auto-updates via the activation hook
- Collapses/hides once `isActivated` is true (score >= 70)

---

### 4. Auto-Event Recording

Wire activation events into existing create flows:
- **Sites page**: after successful site creation → `recordEvent('first_site')` + update `onboarding_progress.step_create_site`
- **Equipment page**: after equipment creation → `recordEvent('first_equipment')` + update step
- **Inspections page**: after inspection creation → `recordEvent('first_inspection')` + update step  
- **Gas Certificates page**: after certificate creation → `recordEvent('first_certificate')` + update step
- **Documents page**: after upload → `recordEvent('document_uploaded')`
- **Team invite**: after invite sent → `recordEvent('team_member_invited')`

Each event is idempotent (only first occurrence scores).

---

### 5. Trial System — Stripe Integration

**Modify `create-checkout` edge function:**
- Accept a `trial` boolean parameter
- When `trial: true`, add `subscription_data.trial_period_days: 7` to the Stripe checkout session
- After checkout completes, the webhook creates a `trial_status` record

**Modify `stripe-webhook` edge function:**
- On `customer.subscription.created`: if subscription has `trial_end`, insert into `trial_status` table with `trial_start` and `trial_end`
- On `customer.subscription.updated`: if `status` changes from `trialing` to `active`, update `trial_status.status = 'converted'` and set `converted_at`

**Modify `check-subscription` edge function:**
- Return `trial_end` and `is_trialing` fields in the response
- Check for `subscription.status === 'trialing'` 

**Modify `useSubscription` hook:**
- Add `isTrialing`, `trialEnd`, `trialDaysRemaining` to state

---

### 6. Trial Dashboard Banner (`src/components/layout/TrialBanner.tsx`)

- Shows when `isTrialing` is true
- Displays countdown: "Your free trial ends in X days"
- Changes color when <= 1 day remaining
- Rendered in `AppLayout.tsx` above main content

---

### 7. Cron Edge Function for Nudges & Trial Reminders (`supabase/functions/onboarding-cron/index.ts`)

A single scheduled function that runs hourly and handles:

**Trial reminders** (via Resend):
- Day 3: "3 days left in your free trial"
- Day 6: "Your trial ends tomorrow"  
- Day 7: "Your subscription starts today"
- Check `onboarding_nudges` to avoid duplicate sends

**Onboarding nudges** (via Resend):
- If signed up 2+ hours ago with score = 5 (only account_created) → send "Your inspection system is ready" email
- If site exists but no equipment after 24 hours → send equipment nudge
- If equipment exists but no inspection after 48 hours → send inspection nudge

**Smart trial extension**:
- If `activation_score >= 50` AND `trial_days_remaining <= 1` AND not already extended → extend trial by 7 days via Stripe API (`stripe.subscriptions.update` with new `trial_end`), update `trial_status`, send extension email

All nudge sends are logged in `onboarding_nudges` for idempotency.

---

### 8. In-App Nudge Component (`src/components/onboarding/InAppNudge.tsx`)

- Query `onboarding_progress` and `activation_scores`
- Show contextual nudge cards on Dashboard based on current state:
  - "Add your first equipment item to start recording inspections"
  - "Run your first inspection in under 60 seconds"
- Dismissable, with state tracked

---

### 9. Frontend Checkout Flow Update

Modify `PlanSelector` / `Onboarding.tsx` to offer a "Start Free Trial" option:
- Pass `trial: true` to `createCheckout`
- Update button text: "Start 7-Day Free Trial"

---

### Summary of files to create/modify:

| Action | File |
|--------|------|
| Create | Migration SQL (6 tables + 1 function) |
| Create | `src/hooks/useActivationScore.ts` |
| Create | `src/components/onboarding/SetupWizard.tsx` |
| Create | `src/components/onboarding/InAppNudge.tsx` |
| Create | `src/components/layout/TrialBanner.tsx` |
| Create | `supabase/functions/onboarding-cron/index.ts` |
| Modify | `supabase/functions/create-checkout/index.ts` — add trial support |
| Modify | `supabase/functions/stripe-webhook/index.ts` — handle trial events |
| Modify | `supabase/functions/check-subscription/index.ts` — return trial state |
| Modify | `src/hooks/useSubscription.tsx` — add trial fields |
| Modify | `src/pages/Dashboard.tsx` — replace Getting Started with SetupWizard + add InAppNudge + TrialBanner |
| Modify | `src/components/layout/AppLayout.tsx` — add TrialBanner |
| Modify | `src/pages/Onboarding.tsx` — add trial option |
| Modify | `src/pages/Sites.tsx`, `Equipment.tsx`, `Inspections.tsx`, `GasCertificates.tsx`, `Documents.tsx`, `Team.tsx` — add activation event recording after creates |
| Modify | `supabase/config.toml` — add onboarding-cron function |

