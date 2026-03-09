

## Homeowner Gas Safety Record — Full Module Build

### Current Gaps

The homeowner type currently has only 4 steps (`["Job Details", "Gas Checks", "Appliances", "Comments & Sign"]`), an 8-column summary PDF, no Company/Installer auto-fetch, no Defects step, no Preview, and no received-by name. It needs identical treatment to the landlord certificate.

### Changes

**1. `GasCertificateForm.tsx`**

- Update `STEPS.homeowner_gas_safety` to: `["Company / Installer", "Job Details", "Gas Checks", "Appliances", "Defects", "Comments & Sign", "Preview"]`
- Add `"homeowner_gas_safety"` to the company info `useEffect` fetch condition (line 54)
- Add `"homeowner_gas_safety"` to the defects save condition (line 144)
- Add `"homeowner_gas_safety"` to the received-by-name display condition (line 407)
- Wire the Preview step to render `LandlordCertificatePreview` for homeowner type too (same layout, different title handled by component)

**2. New `HomeownerCertificatePreview.tsx`**

Create a portrait preview component identical to `LandlordCertificatePreview` but with title "Homeowner Gas Safety Record". Alternatively, make `LandlordCertificatePreview` accept a `title` prop and reuse it for both types — this is cleaner.

**3. `GasCertificatePDF.tsx`**

- Route `homeowner_gas_safety` to the existing `generateLandlordGasSafetyPDF` function (same layout), passing the correct title "Homeowner Gas Safety Record" (already handled by `TYPE_TITLES`)
- Remove the old basic 8-column homeowner PDF block (lines 131-167)

**4. `GasCertificates.tsx`**

- Add `"homeowner_gas_safety"` to the company/engineer data fetch condition in `handleDownloadPDF` (currently only fetches for `nd_gas_safety` and `landlord_gas_safety`)

### No database changes needed

All fields already exist in `gas_certificates` and `gas_certificate_appliances` tables.

### Files

| File | Action |
|------|--------|
| `GasCertificateForm.tsx` | Extend steps, company fetch, defects, received-by to homeowner |
| `GasCertificatePDF.tsx` | Route homeowner to landlord PDF generator, remove old block |
| `GasCertificates.tsx` | Extend download handler |
| `LandlordCertificatePreview.tsx` | Add optional `title` prop, default to "Landlord Gas Safety Record" |

