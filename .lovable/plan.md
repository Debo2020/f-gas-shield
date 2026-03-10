

## Batch Upload for Clients and Suppliers with CSV Templates

### Overview
Create a reusable CSV batch upload component used by both the Clients and Suppliers tabs, plus downloadable CSV template files for each.

### New Files

**1. `src/components/batch-upload/CSVBatchUploadDialog.tsx`**
A generic dialog component that handles:
- File selection via drag-and-drop (using existing `react-dropzone` dependency) or file picker, accepting `.csv` only
- CSV parsing (vanilla JS — split by newlines + commas, handle quoted fields)
- Preview table showing parsed rows with validation status (green/red indicators)
- Validation: required field check (`name` for both), email format, max lengths
- Summary: X valid, Y errors — with inline error messages per row
- "Upload" button that batch-inserts valid rows via Supabase
- Progress indicator and success/error toast summary
- Props: `type: "clients" | "suppliers"`, `companyId`, `onSuccess` callback

**2. `src/lib/csv-templates.ts`**
Utility with two functions:
- `downloadClientTemplate()` — generates and downloads a CSV with headers: `name,contact_name,contact_email,contact_phone,address,notes` plus 2 example rows
- `downloadSupplierTemplate()` — generates and downloads a CSV with headers: `name,contact_name,contact_email,contact_phone,address,account_number,notes` plus 2 example rows

Uses `Blob` + `URL.createObjectURL` + programmatic anchor click for download.

### Modified Files

**3. `src/components/organisation/OrganisationClientsTab.tsx`**
- Add "Batch Upload" button (with `Upload` icon) next to the existing "Add Client" button
- Add "Download Template" button (with `Download` icon)
- Wire up `CSVBatchUploadDialog` with `type="clients"`

**4. `src/components/organisation/OrganisationSuppliersTab.tsx`**
- Add "Batch Upload" button next to the existing "Add Supplier" button
- Add "Download Template" button
- Wire up `CSVBatchUploadDialog` with `type="suppliers"`

### CSV Template Content

**Clients template (`clients-template.csv`):**
```
name,contact_name,contact_email,contact_phone,address,notes
ABC Retail Ltd,John Smith,john@abcretail.com,+44 7700 900000,"123 High Street, London, SW1A 1AA",Key account
XYZ Properties,Jane Doe,jane@xyzproperties.com,+44 7700 900001,"45 Park Lane, Manchester, M1 2AB",
```

**Suppliers template (`suppliers-template.csv`):**
```
name,contact_name,contact_email,contact_phone,address,account_number,notes
Refrigerant Supplies Ltd,Bob Wilson,bob@refsupplies.com,+44 1234 567890,"Unit 5 Industrial Estate, Birmingham, B1 1AA",ACC-001,Primary supplier
Gas Parts Direct,Sarah Jones,sarah@gasparts.com,+44 1234 567891,"10 Commerce Road, Leeds, LS1 1AB",ACC-002,
```

### Technical Details
- CSV parsing handles quoted fields containing commas (standard RFC 4180)
- Batch insert uses `supabase.from("clients").insert(rows)` / `supabase.from("suppliers").insert(rows)` for efficiency
- Validation: `name` is required; `contact_email` validated with regex if provided; all string fields trimmed and length-capped
- Duplicate detection: warns if a row's `name` matches an existing client/supplier (case-insensitive check against already-loaded data)
- Maximum 100 rows per upload to prevent abuse
- Role check: only shown to users with `canManageClients` / `canManageSuppliers` permissions

