

## Fix: Dashboard/Documents Data Integrity Reconciliation

### Root Cause Analysis

**Database reality (verified via direct SQL):**
- 5 documents exist — all have `document_type: "other"`, no `expiry_date`, no `site_id`, no `equipment_id`
- 1 profile (Darren Paul Allison) has `f_gas_certificate_expiry: 2026-03-09` (expired yesterday)
- Zero documents have expiry dates

**Issue 1 — "1 Expiring Document" on Dashboard is misleading:**
The `useExpiryAlerts` hook mixes two data sources (documents table + profile F-Gas certificates) into a single `alerts` array. The `ExpiryAlertBanner` compact variant displays `"{count} expiring document(s)"` even when the alert is a profile certificate, not a document. This is the false positive — it says "expiring document" when it's actually an F-Gas certificate expiry on a team member profile.

**Issue 2 — Documents page "Expiring Soon" stat is inflated:**
The Documents page stats card shows `stats.expiring = alerts.length` from `useExpiryAlerts`, which includes profile certificate alerts. These are not documents in the document inventory, so the count doesn't reconcile with visible folder contents.

**Issue 3 — Documents not visible in folders (likely UX confusion):**
The 5 documents with `document_type: "other"` should appear in the **Site** tab under **"Other Documents"** collapsible section. They ARE being rendered — but the other collapsible sections (Declarations, Invoices, Reports, Site Photos) show 0 and are collapsed, so the user may not see the "Other Documents" section below them without scrolling.

### Changes

**1. `src/hooks/useExpiryAlerts.tsx`**
- Add separate return values: `documentAlerts` (type === "document") and `certificateAlerts` (type === "certificate")
- This lets consumers distinguish between actual document expiries and profile certificate expiries

**2. `src/pages/Documents.tsx`**
- Change `stats.expiring` to use only document-type alerts (not certificate alerts): filter `alerts` to `type === "document"` only
- Change the Expiry Alerts section to show only document-type alerts, not certificate alerts
- This ensures the Documents page expiry count reconciles with actual documents in the folders

**3. `src/components/alerts/ExpiryAlertBanner.tsx`**
- Update compact variant text: distinguish between "expiring documents" and "expiring certificates" in the label
- Show "X expiring document(s)" and "Y expiring certificate(s)" separately instead of lumping them together as "expiring documents"

**4. `src/pages/Dashboard.tsx`**
- Keep showing all alerts (documents + certificates) but use accurate labelling
- The compact banner text should say "expiring item(s)" or split the count by type

### Result
- Documents page "Expiring Soon" shows 0 (correct — no documents have expiry dates)
- Dashboard shows "1 expiring certificate" instead of "1 expiring document"
- Document inventory total (5) matches visible folder contents (5 in Site > Other Documents)
- All counts reconcile against the same real data source
- No mock data, no false positives

