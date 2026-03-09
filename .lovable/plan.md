

## Switch All Gas Certificates to Landscape with Pagination

### Current State

- **ND Gas Safety**: Already landscape A4 (297x210mm) — no pagination
- **Landlord / Homeowner**: Portrait A4 (210x297mm) — no pagination
- **Other types** (Warning Notice, Testing & Purging): Basic portrait — no pagination
- **Previews**: ND is landscape (`aspect-[1.414/1]`), Landlord is portrait (`aspect-[1/1.414]`)

### Changes

**1. `GasCertificatePDF.tsx`**

**a) Convert `generateLandlordGasSafetyPDF` to landscape:**
- Change `pageWidth` from 210 → 297, pageHeight to 210
- Create landscape doc: `new jsPDF({ orientation: "landscape" })` at the routing point (line 94-96)
- Widen column widths and appliance table to use the full 269mm content width
- Update all page-break thresholds from ~250 → ~170

**b) Add pagination logic for appliances (all types):**
- Chunk appliances into groups of 6
- Page 1 renders appliances 1-6 along with header, company info, job address, customer, defects 1-6, safety checks, comments, signatures
- If >6 appliances: add continuation page(s) with title, cert number, job address summary, "Continuation Page" label, page number, and appliance rows 7-12, 13-18, etc.

**c) Add pagination logic for defects:**
- Chunk defects into groups of 6
- First 6 on page 1; overflow onto continuation pages
- If both appliances and defects overflow, appliance continuation pages come first, then defect continuation pages

**d) Convert `generateNDGasSafetyPDF` to use the same pagination:**
- Currently renders all appliances in one block — apply the same 6-per-page chunking

**e) Add page numbering:**
- Add "Page X of Y" to footer of every page

**2. `LandlordCertificatePreview.tsx`**

- Switch container from portrait (`aspect-[1/1.414]`, `max-w-[850px]`) to landscape (`aspect-[1.414/1]`, `max-w-[1100px]`)
- Show only first 6 appliances and first 6 defects on page 1 view
- If overflow exists, render additional "page" divs below with continuation header, page number, and the overflow rows
- Each page div maintains the same landscape aspect ratio

**3. `CertificatePreview.tsx`** (ND)

- Apply the same 6-appliance / 6-defect pagination with continuation page divs

**4. Entry point routing (line 85-96)**

Update to create landscape docs for landlord/homeowner:
```
if (data.certificate_type === "landlord_gas_safety" || data.certificate_type === "homeowner_gas_safety") {
  const landscapeDoc = new jsPDF({ orientation: "landscape" });
  return generateLandlordGasSafetyPDF(landscapeDoc, data, title);
}
```

### Continuation Page Structure (PDF)

Each continuation page includes:
- Certificate title + certificate number (top)
- Job address summary (one line)
- "Continuation Page — Appliances" or "Continuation Page — Defects" label
- Page number: "Page X of Y"
- Table with headers repeated
- Footer

### Files

| File | Action |
|------|--------|
| `GasCertificatePDF.tsx` | Landscape for landlord/homeowner, pagination for all types, page numbering |
| `LandlordCertificatePreview.tsx` | Landscape aspect ratio, paginated overflow rendering |
| `CertificatePreview.tsx` | Paginated overflow rendering (already landscape) |

