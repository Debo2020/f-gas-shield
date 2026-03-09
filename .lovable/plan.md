

## Gas Warning Notice — Full Module Build

### Current State

The warning notice is severely underdeveloped:
- **Form**: Only 3 steps (`["Job Details", "Warning Details", "Comments & Sign"]`) — missing Company/Installer, appliance details, preview
- **WarningNoticeFields**: Uses single-select `issue_type` instead of multiple checkboxes; no appliance fields (location, make, type, model, serial no); no "Details of Faults" separate field; RIDDOR is boolean instead of Yes/No/N/A
- **PDF**: Basic portrait layout — needs landscape A4 matching the reference
- **DB**: Missing columns for appliance details, multiple issue type checkboxes, customer mobile, fault details, other issue description
- **No preview component** exists for warning notices

### Plan

**1. Database Migration**

Add columns to `gas_certificates`:
- `warning_location` (text) — appliance location/room
- `warning_make` (text)
- `warning_type` (text) — appliance type
- `warning_model` (text)  
- `warning_serial_no` (text)
- `fault_details` (text) — "Details of Faults" free text
- `customer_mobile` (text)
- `issue_gas_escape` (text, default 'n/a') — Yes/No/N/A
- `issue_pipework` (text, default 'n/a')
- `issue_ventilation` (text, default 'n/a')
- `issue_meter` (text, default 'n/a')
- `issue_chimney_flue` (text, default 'n/a')
- `issue_other` (text, default 'n/a')
- `issue_other_description` (text)
- `riddor_11_1_status` (text, default 'n/a') — replaces boolean with Yes/No/N/A
- `riddor_11_2_status` (text, default 'n/a')

**2. Update `GasCertificateForm.tsx`**

- Change `gas_warning_notice` steps to: `["Company / Installer", "Job Details", "Appliance / Installation", "Warning Details", "Comments & Sign", "Preview"]`
- Add `gas_warning_notice` to company info auto-fetch condition
- Add `gas_warning_notice` to received-by-name display condition
- Update `warningData` state to include all new fields
- Update `handleSave` to map all new fields
- Wire Preview step to render `WarningNoticePreview`

**3. Rewrite `WarningNoticeFields.tsx`**

Split into sections matching the reference:
- **Appliance/Installation section**: Location, Make, Type, Model, Serial Number
- **Classification**: ID / AR / NCS radio buttons
- **Issue Type checkboxes**: 6 individual Yes/No/N/A selects (Gas Escape, Pipework, Ventilation, Meter, Chimney/Flue, Other + description)
- **Unsafe classification notice**: Auto-display warning text when ID selected
- **Details of Faults**: Large text field
- **Actions Taken**: Large text field
- **Actions Required**: Large text field
- **RIDDOR Reporting**: Two Yes/No/N/A selects

**4. Create `WarningNoticePreview.tsx`**

Landscape HTML preview matching the reference document:
- Header with company logo, title, cert number, regulatory text
- Three-column layout: Company/Installer | Job Address | Client/Landlord
- Appliance/Installation details table
- Issue type checkboxes grid
- ID warning notice banner (conditional)
- Details of Faults, Actions Taken, Actions Required
- RIDDOR reporting
- Legal declaration text
- Signatures with date
- Emergency contact numbers footer

**5. Update `GasCertificatePDF.tsx`**

Replace the basic portrait warning notice block (lines 253-271) with a full landscape A4 PDF:
- Route `gas_warning_notice` to `new jsPDF({ orientation: "landscape" })`
- Create `generateWarningNoticePDF` function matching the reference layout
- Three-column header with company/job/client details
- Appliance details table
- Issue type checkboxes rendered as grid
- Classification banner
- Faults, Actions Taken, Actions Required sections
- RIDDOR reporting table
- Legal text, signatures, emergency contacts

**6. Update `GasCertificates.tsx`**

Add `gas_warning_notice` to the company/engineer data fetch condition in `handleDownloadPDF`.

### Files

| File | Action |
|------|--------|
| Migration SQL | Add ~17 columns to gas_certificates |
| `WarningNoticeFields.tsx` | Full rewrite with all reference fields |
| `WarningNoticePreview.tsx` | New — landscape HTML preview |
| `GasCertificateForm.tsx` | Update steps, state, save logic, company fetch, preview routing |
| `GasCertificatePDF.tsx` | New `generateWarningNoticePDF` in landscape, remove old portrait block |
| `GasCertificates.tsx` | Extend download handler for warning notice |

