

## Fix: Get Started Flow — Broken by Email Confirmation

### Root Cause

The current `GetStarted.tsx` flow calls `supabase.auth.signUp()` then immediately tries to create a company and redirect to Stripe checkout. **This fails** because email confirmation is enabled — `signUp()` returns no session until the user clicks the email verification link. The flow stops dead at "Please check your email" with no way to resume plan selection or checkout afterward.

Secondary issues:
- `createCheckout` opens Stripe in a **new tab** (`window.open`) instead of redirecting — confusing in a signup flow
- Enterprise tier has `price: null`, which would crash `formatPrice` in the order summary
- No recovery path after email confirmation — user loses all state

### Solution: Split into Sign Up → Confirm → Complete Setup

Restructure into a two-phase flow:

**Phase 1 (GetStarted page):** Capture details + sign up → show "check your email" screen  
**Phase 2 (SetupCompany page):** After email confirmation + sign in → complete plan selection + checkout

```text
Get Started → Enter Details → Sign Up → "Check your email"
                                              ↓
User clicks email link → lands on app → auto-signs in
                                              ↓
Redirect to /setup-company → Select Plan → Trial or Pay → Stripe
```

### File Changes

**1. `src/pages/GetStarted.tsx`** — Simplify to 2 steps
- **Step 1**: Account details (Full Name, Company Name, Email, Password, Confirm Password, Phone) — keep as-is
- **Step 2**: On submit, call `signUp()` with `full_name` and `company_name` stored in user metadata. Show a "Check Your Email" confirmation screen with clear instructions. No plan selection here.
- Remove steps 2 and 3 (plan selection + trial/pay). Remove `useSubscription` import.
- Store `company_name` in user metadata so it's available after email confirmation.

**2. `src/pages/SetupCompany.tsx`** — New post-confirmation setup page (already exists as a route)
- Check if user has a company. If not, call `create_company_for_current_user` using the `company_name` from user metadata.
- Show plan selection (PlanSelector + LicenseCounter) 
- Show Trial vs Pay choice
- Call `createCheckout` with `window.location.href` redirect (not `window.open`)
- This page is behind `ProtectedRoute` so user must be authenticated

**3. `src/hooks/useSubscription.tsx`** — Fix checkout redirect
- Change `window.open(data.url, "_blank")` to `window.location.href = data.url` for the signup checkout flow (add parameter `redirectInPlace = false`)

**4. `src/hooks/useAuth.tsx`** — After email confirmation sign-in
- When a user signs in for the first time (no company_id on profile), redirect to `/setup-company` instead of `/dashboard`

**5. `src/App.tsx`** — Route already exists for `/setup-company`, ensure it stays as ProtectedRoute

### Flow After Fix

1. User clicks "Get Started" → `/get-started`
2. Enters name, company, email, password → clicks "Create Account"
3. `signUp()` called with metadata `{ full_name, company_name }` → email sent
4. User sees "Check your email to verify your account"
5. User clicks verification link → redirected to app → auto-signed in
6. Auth hook detects no company → redirects to `/setup-company`
7. Company created automatically from metadata
8. User selects plan → chooses trial or pay → Stripe checkout (same tab)
9. After Stripe → redirected to `/dashboard`

