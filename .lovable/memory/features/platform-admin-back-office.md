---
name: Platform Admin Back Office
description: FTrack-internal back office (e.g. Partners & Loyalty) gated by platform_admins table, separate from tenant app_role.
type: feature
---
Platform admins are FTrack staff, distinct from tenant `app_role`. Stored in `public.platform_admins` (user_id PK → auth.users). Helper: `public.is_platform_admin(uuid)` SECURITY DEFINER.

- Seeded: d.allison@solusgsc.com. Add more via direct INSERT (no UI).
- RLS on `partners`, `partner_codes`, `partner_redemptions` is gated by `is_platform_admin(auth.uid())` only; service_role still writes from the Stripe webhook.
- Frontend: `usePlatformAdmin()` hook, `PlatformAdminGuard` route wrapper, `/admin/partners` route. User-menu shows "Admin · Partners" only when `isPlatformAdmin`.
- Edge functions `create-partner-code` and `update-partner-code` enforce platform-admin check server-side.
- Never expose any partner/loyalty data to tenant owners.
