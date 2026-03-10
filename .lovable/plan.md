

## Fix Expiry Notification Routing and Labels

### Problem
Three routing bugs in `ExpiryAlertBanner.tsx`:
1. **Compact variant "View all" button** (line 135) always navigates to `/documents`, even when alerts are certificates
2. **"View more alerts" button** (line 207) always navigates to `/documents`
3. **Compact variant** doesn't let users click individual alerts — it just shows a summary with a single "View all" link to documents

The `handleNavigate` function (line 44-62) already has correct per-alert routing logic (profile → `/settings/profile`, equipment → `/equipment/:id`, etc.), but it's only used in the `full` variant.

### Changes — single file: `src/components/alerts/ExpiryAlertBanner.tsx`

1. **Compact variant "View all" button**: Route intelligently based on alert composition:
   - If only certificates → `/settings/profile`
   - If only documents → `/documents`
   - If mixed → navigate to whichever type has the most critical alert (or show individual clickable alerts instead of summary)

2. **Better approach — make compact variant show clickable individual alerts** instead of a generic summary. Show up to 3 individual alert cards (reusing the full variant's card style but more compact) so each one deep-links to the correct location via the existing `handleNavigate` logic.

3. **"View more" button** (line 207): Route based on remaining alert types rather than hardcoding `/documents`.

4. **Label accuracy**: The labels already correctly distinguish "expiring document" vs "expiring certificate" from the previous fix. No changes needed there.

### Result
- Clicking a certificate expiry alert → opens `/settings/profile`
- Clicking a document expiry alert → opens `/documents` (or equipment/site detail if linked)
- No generic fallback routing to `/documents` for non-document alerts
- Both compact and full variants use context-aware deep-linking

