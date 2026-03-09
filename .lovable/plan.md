

# Phase: Client Portal Billing + Invitation Emails

## Summary
Two changes: (1) Add £20/month per-user billing for client portal users as a Stripe add-on, mirroring the existing Natural Gas add-on pattern. (2) Wire up the client user invitation flow to actually send branded emails via the `invite-member` edge function pattern (currently it just inserts a DB row with no email).

---

## 1. Client Portal Add-on Billing (£20/user/month)

The existing Natural Gas add-on pattern (`company_addons` + `addon_licenses` + Stripe subscription item) provides a proven model. Client portal users will follow the same approach.

**Changes:**

### Database migration
- Add `'client_portal'` to the `addon_type` enum so `company_addons` and `addon_licenses` tables can track it
- No new tables needed — reuses existing add-on infrastructure

### Stripe product/price
- A new Stripe product and price must be created for Client Portal at £20/user/month
- Add the product/price IDs to `src/lib/gas-addons.ts` (rename to `src/lib/addons.ts` or extend the existing config)

### `src/lib/gas-addons.ts` → extend with client_portal module
- Add `client_portal` entry: `{ name: "Client Portal Access", price: 20, currency: "GBP", product_id: "...", price_id: "..." }`

### `src/components/clients/ClientUsersDialog.tsx`
- On invite: also insert an `addon_licenses` row with `addon_type: 'client_portal'` for the client user
- On delete: also delete the corresponding `addon_licenses` row
- On toggle status: update the addon_license status accordingly
- After each change, call `update-addon-license-count` to sync Stripe quantity (same pattern as gas add-on)

### `src/components/organisation/OrganisationLicensesTab.tsx` — Cost Summary Footer
- Add a third line item for Client Portal users: count active `client_portal` addon_licenses × £20/user
- Include in the total monthly cost

### `supabase/functions/update-addon-license-count/index.ts`
- Extend to also sync `client_portal` addon license counts to Stripe (currently only handles `natural_gas`)

### `supabase/functions/check-addon/index.ts`
- Ensure it handles `client_portal` addon type queries

---

## 2. Client Portal Invitation Emails

Currently `ClientUsersDialog.tsx` line 132-135 has a placeholder: `"Invitation resent (email functionality coming soon)"`. The invite flow (line 93-107) only inserts a DB row — no email is sent.

**Changes:**

### New edge function: `supabase/functions/invite-client-user/index.ts`
- Authenticated endpoint (owner/manager only)
- Accepts `{ clientId, email }` 
- Creates the `client_users` row (moved from frontend)
- Creates auth user if needed (via `admin.generateLink`)
- Generates magic link with redirect to a client portal accept page
- Sends branded HTML email via Resend (similar template to `invite-member`)
- Returns `{ success, email_sent }`

### `src/components/clients/ClientUsersDialog.tsx`
- Replace direct `supabase.from("client_users").insert(...)` with `supabase.functions.invoke("invite-client-user", { body: { clientId, email } })`
- Wire `handleResendInvite` to call the same edge function (re-sends the email)
- Show proper success/error toasts based on response

### `supabase/config.toml`
- Add `[functions.invite-client-user]` entry with `verify_jwt = false`

---

## Files Modified

| File | Change |
|------|--------|
| Database migration | Add `'client_portal'` to `addon_type` enum |
| `src/lib/gas-addons.ts` | Add `client_portal` add-on config |
| `src/components/clients/ClientUsersDialog.tsx` | Use edge function for invites, manage addon_licenses |
| `src/components/organisation/OrganisationLicensesTab.tsx` | Add client portal cost line in summary |
| `supabase/functions/invite-client-user/index.ts` | New — send client portal invitation emails |
| `supabase/functions/update-addon-license-count/index.ts` | Handle `client_portal` addon type |
| `supabase/functions/check-addon/index.ts` | Handle `client_portal` addon type |
| `supabase/config.toml` | Add new function entry |

