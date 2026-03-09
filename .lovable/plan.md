

## Landlord Gas Safety Record — Full Module Build

### Current State

The landlord certificate type exists but is incomplete:
- **Form flow** is only 4 steps: `["Job Details", "Gas Checks", "Appliances", "Comments & Sign"]` — missing Company/Installer, Defects, and Preview
- **Company info** is only auto-fetched for `nd_gas_safety`, not for `landlord_gas_safety`
- **Defects step** is only shown for `nd_gas_safety`
- **Received-by name** (customer signature) is only captured for `nd_gas_safety`
- **PDF output** (lines 126-162) is a basic 8-column summary table — does not match the reference certificate layout at all
- **Preview component** only renders the ND certificate format

### Plan

**1. Update form flow (`GasCertificateForm.tsx`)**

- Change `landlord_gas_safety` steps to: `["Company / Installer", "Job Details", "Gas Checks", "Appliances", "Defects", "Comments & Sign", "Preview"]`
- Extend the Company/Installer `useEffect` fetch to also run for `landlord_gas_safety`
- Extend defects save logic to include `landlord_gas_safety`
- Extend received-by-name input to show for `landlord_gas_safety`
- Wire Preview step to render a `LandlordCertificatePreview` component

**2. Create landlord preview (`LandlordCertificatePreview.tsx`)**

Portrait-oriented HTML preview matching the reference document:
- Header with company logo, title "Landlord Gas Safety Record", cert number, regulatory text
- Company/Installer section (engineer, company, Gas Safe reg, ID card)
- Job Address section
- Customer/Landlord section
- 22-column appliance inspection table (same columns as ND)
- Defects list
- CO Alarms section (fitted, tested/satisfactory)
- Gas Installation Safety Checks (4 fields)
- Comments
- Signatures (engineer + customer) with date
- Next Inspection Due

**3. Rewrite landlord PDF (`GasCertificatePDF.tsx`)**

Replace the basic 8-column table (lines 126-162) with a full portrait A4 PDF matching the reference:
- Route `landlord_gas_safety` to a new `generateLandlordGasSafetyPDF` function
- Company/Installer, Job Address, Customer/Landlord as side-by-side tables at top
- Full 22-column appliance table (same structure as ND but portrait orientation, 5pt font)
- Defects table
- CO Alarms row
- Gas Installation Safety Checks (4 fields)
- Comments, Next Inspection Due
- Signature blocks
- Regulatory footer text

**4. Update download handler (`GasCertificates.tsx`)**

Extend the `handleDownloadPDF` function to fetch company/engineer data for `landlord_gas_safety` (currently only does this for `nd_gas_safety`).

### Files

| File | Action |
|------|--------|
| `src/components/gas-certificates/GasCertificateForm.tsx` | Update steps, extend company fetch + defects + signatures to landlord type |
| `src/components/gas-certificates/LandlordCertificatePreview.tsx` | New — portrait HTML preview |
| `src/components/gas-certificates/GasCertificatePDF.tsx` | Add `generateLandlordGasSafetyPDF` function, route landlord type to it |
| `src/pages/GasCertificates.tsx` | Extend `handleDownloadPDF` to fetch company data for landlord type |

No database changes needed — all fields already exist in `gas_certificates` and `gas_certificate_appliances` tables.

