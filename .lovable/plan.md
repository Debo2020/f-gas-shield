

## Rewrite ND Gas Safety PDF to Match Sample Certificate Layout

### What the sample shows (portrait, single page)

The uploaded "Sewell Non Domestic Gas Safety Record" is a portrait-orientation document with:

1. **Company logo** (top-left) + "Non Domestic Gas Safety Record" title + Cert. No. (top-right)
2. **Regulatory subtitle**: "Safety Inspection and reporting carried out in accordance with the Gas Safety (Installation and Use) Regulations..."
3. **Company / Installer** section: Engineer, Company, Address (single line), Gas Safe Reg, ID Card No
4. **Job Address**: Name, Address, Post Code
5. **Customer / Landlord**: Post Code, Tel. No, Gas Safe Reg, ID Card No
6. **Appliance Details table** — 16 columns per row (NO CO Ratio, NO Flue Performance Test, NO Appliance Serviced):
   - Location, Appliance Type, Make, Model, Flue Type, Landlord's Appliance, Inspected, Operating Pressure (mbar), Heat Input (kW/h), High CO (ppm), High CO₂ (%), Low CO (ppm), Low CO₂ (%), Safety Devices Correct, Ventilation Provision, Visual Condition Satisfactory, Appliance Safe to Use
7. **Defects / Identified** table: # | Labels and Warning Notice Issued
8. **Gas Installation Safety Checks**: Emergency Control Accessible, Gas Tightness Satisfactory
9. **Next Inspection Due** date
10. **Comments** section
11. **Signatures**: Issued by (Signed + Print Name), Received Signed by, Date

### Changes Required

**File: `src/components/gas-certificates/GasCertificatePDF.tsx`**

Complete rewrite of the `generateNDGasSafetyPDF` function:

- **Add company logo**: Accept `company_logo_url` in `CertificateData`. Fetch the logo as a base64 image and embed it top-left using `doc.addImage()`. If no logo, skip gracefully.
- **Header layout**: Logo top-left, "Non Domestic Gas Safety Record" title top-centre, "Cert. No. XXX" top-right — matching the sample's portrait layout
- **Add regulatory subtitle** text below the header
- **Company / Installer** section: Two-column key-value table (Engineer, Company, Address, Gas Safe Reg, ID Card No)
- **Job Address**: Two-column key-value table (Name, Address, Post Code)
- **Customer / Landlord**: Two-column key-value table (Post Code, Tel. No, Gas Safe Reg, ID Card No)
- **Appliance Details table**: Use exactly 16 data columns matching the sample (drop CO Ratio, Flue Perf, Serviced from the PDF — data stays in DB, just not printed on this certificate type)
- **Defects / Identified** table: # | Description | Labels and Warning Notice Issued
- **Gas Installation Safety Checks**: Emergency Control Accessible, Gas Tightness Satisfactory (two fields only, matching sample)
- **Next Inspection Due**: Bold date
- **Comments**: Free text block
- **Signatures table**: Issued by (Signed + Print Name), Received Signed by, Date
- All tables use a consistent clean grid style with navy header colour matching company branding

**File: `src/pages/GasCertificates.tsx`**

- Update `handleDownloadPDF` to also fetch `logo_url` from the `companies` table and pass it as `company_logo_url` to the PDF generator
- Attempt to fetch the logo image and convert to base64 data URL before passing to the PDF function

**File: `src/components/gas-certificates/GasCertificatePDF.tsx` (interface)**

- Add `company_logo_url?: string` to `CertificateData`

### No database changes needed

All fields exist. The PDF just needs to render the correct subset in the correct layout with the company logo.

### Technical Detail: Logo Embedding

```text
GasCertificates.tsx (handleDownloadPDF)
  ├── Fetch company.logo_url from DB
  ├── If logo_url exists, fetch image → convert to base64 data URL
  └── Pass base64 string as company_logo_url to generateGasCertificatePDF()

GasCertificatePDF.tsx (generateNDGasSafetyPDF)
  ├── If company_logo_url provided, doc.addImage(logo, 'PNG', x, y, w, h)
  └── Position title + cert no. accordingly
```

