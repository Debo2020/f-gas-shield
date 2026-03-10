

## Redesign Record Inspection Workflow: Client > Site > Equipment > Inspect

### Overview
Replace the current single-dialog "Record Inspection" flow with a step-by-step wizard that guides engineers through Client > Site > Equipment selection, with QR/barcode scanning as a shortcut at the equipment step.

### New File

**`src/components/inspections/InspectionWizard.tsx`**

A full-screen or large dialog wizard with 4 steps:

1. **Step 1 — Select Client**: Fetch clients from `clients` table filtered by `company_id`. Large touch-friendly cards/list items. Search filter.

2. **Step 2 — Select Site**: Fetch sites from `sites` table filtered by `client_id` (selected client). Large card layout. Back button to step 1.

3. **Step 3 — Select Equipment**: Fetch equipment from `equipment` table filtered by `site_id` (selected site). Shows name, refrigerant type, last inspection date. Includes a "Scan QR/Barcode" button that opens the existing `EquipmentQRScanner` — if a match is found and the equipment belongs to the selected site, skip to step 4. If it belongs to a different site, show error. Also allow manual selection from the list.

4. **Step 4 — Inspection Form**: Render the existing `InspectionForm` with `preselectedEquipmentId` set, equipment_id locked. Breadcrumb shows Client > Site > Equipment.

**Key behaviors:**
- Scanning bypasses manual equipment selection when match found
- If scanned equipment doesn't match current site/company, show clear error with retry option
- Breadcrumb bar at top: `Client Name > Site Name > Equipment ID` — clickable to go back to that step
- Mobile-first: large buttons (min h-14), cards instead of dropdowns, big scan button
- Audit trail: existing `inspector_id: user.id` in the insert already records who; timestamp via `created_at` default

### Modified Files

**`src/pages/Inspections.tsx`**
- Replace `InspectionDialog` usage with `InspectionWizard` when "Record Inspection" is clicked
- Keep the existing `handleAddInspection` logic, pass it to the wizard's final step

**`src/components/inspections/InspectionDialog.tsx`**
- No changes needed — wizard will use `InspectionForm` directly

**`src/components/inspections/InspectionForm.tsx`**
- Add optional `siteId` prop to pre-filter equipment list to the selected site
- When `preselectedEquipmentId` is provided via `defaultValues.equipment_id`, disable the equipment selector (locked selection)

### Architecture

```text
InspectionWizard (new)
├── Step 1: ClientSelector (inline, fetches from clients table)
├── Step 2: SiteSelector (inline, fetches sites WHERE client_id = selected)
├── Step 3: EquipmentSelector (inline, fetches equipment WHERE site_id = selected)
│   └── EquipmentQRScanner (existing component, reused)
└── Step 4: InspectionForm (existing, with equipment_id pre-filled & locked)
```

### UX Details
- Wizard uses a sheet/drawer on mobile, dialog on desktop
- Each step shows count of available items ("3 sites", "12 units")
- Equipment cards show: name, refrigerant type, charge kg, days until next inspection
- Scan button is prominent (primary variant, full width on mobile) with camera icon
- "No match found" error on scan includes "Try Again" and "Select Manually" buttons
- Breadcrumb is always visible, tapping a completed step returns to it (resets subsequent selections)
- Step transitions animate with slide effect

### Data Queries
- Clients: `supabase.from("clients").select("id, name, contact_name").eq("company_id", companyId).eq("is_active", true)`
- Sites: `supabase.from("sites").select("id, name, address, postcode").eq("client_id", clientId).eq("is_deleted", false)`
- Equipment: `supabase.from("equipment").select("id, name, refrigerant_type, refrigerant_charge_kg, next_inspection_due, asset_tag, manufacturer, model").eq("site_id", siteId).eq("is_active", true)`

All queries use existing RLS policies — no database changes needed.

