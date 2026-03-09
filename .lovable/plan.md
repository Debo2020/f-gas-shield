

## Switch ND Gas Safety Certificate to Landscape Layout

### Changes

**File: `src/components/gas-certificates/GasCertificatePDF.tsx`**

The `generateNDGasSafetyPDF` function currently creates a portrait A4 document (`new jsPDF()`). Switch to landscape:

1. **Create landscape doc**: Change the jsPDF instantiation to `new jsPDF({ orientation: "landscape" })` — but since the doc is passed in from `generateGasCertificatePDF`, we need to create a new landscape doc inside `generateNDGasSafetyPDF` instead of reusing the portrait one.
2. **Update page dimensions**: `pageWidth` from 210 → 297, page height from 297 → 210.
3. **Widen the appliance table columns**: With ~269mm of usable width (vs 182mm portrait), each of the 22 columns gets ~50% more space. Increase text columns (Location, Type, Make, Model) and use 6-7pt font instead of 5pt for better readability.
4. **Layout the top 3 info sections side-by-side**: In landscape there's enough width to place Company/Installer, Job Address, and Customer/Landlord as 3 columns across the top — saving vertical space. Use manual positioning or three narrow autoTables side by side.
5. **Footer**: Update footer y-position from 290 → 200 (landscape height).
6. **Page-break thresholds**: Adjust all `y > 250` checks to `y > 170` for landscape height.

**File: `src/components/gas-certificates/CertificatePreview.tsx`**

Update the on-screen preview to use landscape proportions (aspect ratio ~1.414:1 width:height instead of the reverse). Change the container styling to reflect landscape orientation.

**File: `src/components/gas-certificates/GasCertificatePDF.tsx` (line 84-88)**

Update the entry point to pass a landscape jsPDF doc for ND certificates, or let the ND function create its own.

### Summary of dimensional changes

```text
                Portrait (current)    Landscape (target)
Page width:     210mm                 297mm
Page height:    297mm                 210mm
Content width:  182mm                 269mm
Margins:        14mm each             14mm each
Footer Y:       290                   200
Page-break Y:   ~250                  ~170
```

