

## Rebuild Get Started as a Dedicated Signup Journey

### Problem
Currently, "Get Started" navigates to `/onboarding` which requires authentication first, redirecting unauthenticated users to `/auth` (a combined Sign In/Sign Up page). This mixes concerns and creates a confusing flow.

### New Flow
```text
Get Started → /get-started

Step 1: Create Account (Full Name, Company Name, Email, Password, Confirm Password, Phone)
Step 2: Select License/Plan (reuse PlanSelector + LicenseCounter)
Step 3: Choose Trial or Pay → Stripe Checkout
Step 4: Redirect to /dashboard
```

Sign In remains at `/auth` as a standalone page (no Sign Up tab).

---

### Changes

**1. Create `src/pages/GetStarted.tsx`** — New dedicated signup page
- 4-step wizard with progress indicator
- Step 1: Account details form (Full Name, Company Name, Email, Password, Confirm Password, Phone optional)
  - Password validation using existing zod schema (12+ chars, upper, lower, number, special)
  - Confirm Password field with match validation
  - All fields preserved when navigating back
- Step 2: Plan selection — reuses existing `PlanSelector` and `LicenseCounter` components
- Step 3: Review + choose "Start 7-Day Free Trial" or "Subscribe Now"
  - Clear messaging: trial = no charge today, auto-bills after 7 days
  - Pay now = immediate charge
- On submit:
  - Call `signUp()` to create the auth account
  - Wait for session, then call `create_company_for_current_user` RPC
  - Create owner license
  - Call `createCheckout()` with `trial: true` or `trial: false` based on choice
- No sign-in fields, no sign-in links in this flow
- Mobile responsive, clean commercial SaaS design

**2. Modify `src/pages/Auth.tsx`** — Sign In only
- Remove the Tabs wrapper and Sign Up tab entirely
- Keep only the sign-in form + forgot password flow
- Remove checkout redirect logic (that now lives in GetStarted)
- Add a small link at the bottom: "Don't have an account? [Get Started](/get-started)"

**3. Update `src/App.tsx`** — Add new route
- Add `/get-started` as a public route (no ProtectedRoute wrapper)
- Keep `/onboarding` route but redirect it to `/get-started` for backward compatibility

**4. Update landing page links**
- `src/components/landing/HeroSection.tsx`: Change "Start Free Trial" button to navigate to `/get-started`
- `src/components/landing/LandingHeader.tsx`: Change "Get Started" button to navigate to `/get-started`
- `src/components/landing/PricingSection.tsx`: Update any "Get Started" CTAs to `/get-started`

**5. Update `src/pages/Landing.tsx`** — No changes needed (already redirects authenticated users)

### Key Design Decisions
- Account creation happens first (Step 1), before plan selection — per requirements
- Company is created atomically via existing `create_company_for_current_user` RPC after signup succeeds
- Stripe checkout opens after account + company are created, with trial flag passed through
- If user refreshes mid-flow, state is lost but account creation is idempotent (RPC checks for existing company)
- The existing `create-checkout` edge function already supports `trial: true` for 7-day trials

### Files Summary
| Action | File |
|--------|------|
| Create | `src/pages/GetStarted.tsx` |
| Modify | `src/pages/Auth.tsx` — strip to sign-in only |
| Modify | `src/App.tsx` — add `/get-started` route |
| Modify | `src/components/landing/HeroSection.tsx` — update CTA |
| Modify | `src/components/landing/LandingHeader.tsx` — update CTA |

