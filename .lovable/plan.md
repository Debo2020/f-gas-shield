

# Rename "Equipment" to "F-Gas System" Across the Application

## Summary

Replace all user-visible references to "Equipment" with "F-Gas System" (or "System" where space is limited). Internal code variable names, database table/column names, and file paths will remain unchanged to preserve backward compatibility. Only UI-facing strings (labels, titles, descriptions, tooltips, help text) will be updated.

## Scope

**19 files** contain user-visible "Equipment" strings. The database table remains `equipment` -- no schema changes needed.

## Approach

**UI-only rename** -- change display strings, keep code identifiers intact. This avoids breaking imports, database queries, routes, or type definitions.

### Files to Update

#### Pages (UI strings only)
1. **`src/pages/Equipment.tsx`** (~828 lines) -- Page title "Equipment", breadcrumbs, button labels ("Add Equipment"), search placeholders, table headers, toast messages, dialog text, empty states. Also update the bulk regenerate dialog text.
2. **`src/pages/EquipmentDetail.tsx`** (~836 lines) -- Page title, breadcrumb, tab labels, card titles, descriptions mentioning "equipment".
3. **`src/pages/Dashboard.tsx`** (~538 lines) -- Stats card title "Equipment" → "F-Gas Systems", link text.
4. **`src/pages/Inspections.tsx`** -- Filter labels, table headers referencing "Equipment".
5. **`src/pages/Reports.tsx`** -- Report titles ("Equipment Register" → "F-Gas System Register"), descriptions, column headers.
6. **`src/pages/Documents.tsx`** -- Tab label "Equipment" → "Systems", card titles.
7. **`src/pages/GasLog.tsx`** -- CSV export header "Equipment" → "F-Gas System".
8. **`src/pages/SiteDetail.tsx`** -- Tab/section referencing equipment count/list.
9. **`src/pages/Help.tsx`** -- FAQ questions/answers, category name "Equipment & Inspections" → "F-Gas Systems & Inspections".

#### Components
10. **`src/components/equipment/EquipmentForm.tsx`** -- Form labels ("Equipment Name" → "System Name"), placeholders.
11. **`src/components/equipment/EquipmentDialog.tsx`** -- Dialog titles ("Register New Equipment" → "Register New F-Gas System", "Edit Equipment" → "Edit F-Gas System").
12. **`src/components/equipment/EquipmentQRScanner.tsx`** -- Dialog title, toast messages.
13. **`src/components/equipment/EquipmentQuickActions.tsx`** -- Sheet title, action labels.
14. **`src/components/equipment/LabelGenerator.tsx`** -- Label text referencing "equipment".
15. **`src/components/equipment/ComplianceThresholdBadge.tsx`** -- Tooltip/description text if any.
16. **`src/components/inspections/InspectionForm.tsx`** -- Label "Equipment" → "F-Gas System" in the select dropdown.
17. **`src/components/documents/DocumentCategorySection.tsx`** -- Category display name "Equipment" → "F-Gas Systems".
18. **`src/components/organisation/OrganisationReportsTab.tsx`** -- Report card titles, descriptions, column headers.
19. **`src/components/landing/FeaturesSection.tsx`** / **`HeroSection.tsx`** / **`PricingSection.tsx`** -- Any marketing copy referencing "equipment".

#### Other
20. **`src/components/onboarding/SetupWizard.tsx`** -- Step labels if they mention "equipment".
21. **`src/components/batch-upload/CSVBatchUploadDialog.tsx`** -- Template labels.
22. **`src/lib/csv-templates.ts`** -- Column header names in CSV exports.

### What stays unchanged
- **Database**: Table name `equipment`, column `equipment_id` -- no migration needed
- **Routes**: `/equipment` and `/equipment/:id` stay the same (URL stability)
- **File names**: `src/pages/Equipment.tsx`, `src/components/equipment/*` -- no renames
- **TypeScript types/interfaces**: `Equipment`, `EquipmentFormValues` etc. remain as-is
- **Supabase queries**: `.from("equipment")` unchanged
- **`src/integrations/supabase/types.ts`**: Auto-generated, never edited

### Terminology Rules
| Context | Old | New |
|---------|-----|-----|
| Full label | Equipment | F-Gas System |
| Plural | Equipment (list context) | F-Gas Systems |
| Short (nav, tabs, space-constrained) | Equipment | Systems |
| Register report | Equipment Register | F-Gas System Register |
| Category | Equipment & Inspections | F-Gas Systems & Inspections |
| Permissions text | Equipment management | F-Gas System management |

### Estimated changes
~150-200 string replacements across ~20 files. No structural/logic changes. No database changes. No new dependencies.

