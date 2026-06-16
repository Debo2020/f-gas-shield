## Add role-based authorization to billing edge functions

Three related security findings flag that billing-sensitive edge functions validate the JWT but never check the caller's role. Any authenticated company member (including engineers) can currently trigger Stripe billing changes.

### Functions to harden

1. **`supabase/functions/update-addon-license-count/index.ts`** — restrict to `owner` or `manager`
2. **`supabase/functions/update-license-count/index.ts`** — restrict to `owner` or `manager`
3. **`supabase/functions/customer-portal/index.ts`** — restrict to `owner` only (portal can cancel subscription / change payment method)

### Approach

After the existing `getClaims` JWT validation, add a role lookup using the service-role client against `public.user_roles`. If the caller lacks the required role, return `403 { error: "Insufficient permissions" }` (or `"Owner access required"` for customer-portal) before any Stripe call.

```typescript
const { data: roleRow } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .in('role', ['owner', 'manager']) // ['owner'] for customer-portal
  .maybeSingle();
if (!roleRow) {
  return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

`customer-portal` currently has no service-role client — I'll add one solely for the role lookup (Stripe calls remain unchanged).

### Frontend impact

`ClientUsersDialog` calls `update-addon-license-count` after invite/disable/remove. Today this dialog is reachable from the Clients module; access to that module is already restricted to owners/managers in practice, so the 403 path should not fire for legitimate users. No frontend changes planned — if QA shows an engineer-accessible path that triggers it, we'll gate the UI separately.

### Search path linter

The remaining Supabase linter warning (`Function Search Path Mutable`) is unrelated to this finding. I'll leave it for a separate pass unless you want it bundled in.

### Out of scope

- No RLS/policy changes
- No Stripe behaviour changes
- No new tables or migrations
