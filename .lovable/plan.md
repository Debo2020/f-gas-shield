

## Fix False Positive Expiry Alerts on Dashboard

### Problem
The `useExpiryAlerts` hook fetches **all documents and certificates with expiry dates up to 90 days from now** — but has **no lower bound**. This means documents expired months or years ago still appear as "critical" alerts on the dashboard, creating false positives.

For example, a document that expired 6 months ago still shows as a critical alert because `daysUntilExpiry` is deeply negative (e.g. -180), which passes the `<= 7` severity check.

### Solution
Add a lower bound to the queries so only **recently expired** items (within the last 30 days) and upcoming expirations (next 90 days) are shown. Items expired more than 30 days ago are stale and should not trigger alerts.

### Changes — single file: `src/hooks/useExpiryAlerts.tsx`

1. **Add a lower bound date** (`thirtyDaysAgo`) to both queries:
   - Documents query: add `.gte("expiry_date", thirtyDaysAgo)` 
   - Profiles query: add `.gte("f_gas_certificate_expiry", thirtyDaysAgo)`

2. This filters the window to: **expired up to 30 days ago → expiring within 90 days from now**

No other files need changes. The Dashboard, ExpiryAlertBanner, and all document areas already use real database data — no mock data exists anywhere.

