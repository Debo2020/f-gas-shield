

## Certificate Preview Mode

### Approach

Add a "Preview" step to the ND Gas Safety form flow that renders a formatted on-screen certificate using HTML/CSS before the engineer issues it. This lets them review all data exactly as it will appear on the PDF.

### Changes

**1. New component: `src/components/gas-certificates/CertificatePreview.tsx`**

An HTML rendering of the ND Gas Safety Record that mirrors the PDF layout:
- Company logo + title + cert number header
- Regulatory subtitle text
- Company/Installer, Job Address, Customer/Landlord sections as bordered tables
- 22-column appliance inspection table (same columns as PDF)
- Defects table
- Gas Installation Safety Checks (4 fields)
- Comments, Next Inspection Due
- Signature blocks (Engineer + Customer)
- Styled with Tailwind to match the certificate's portrait proportions (A4 aspect ratio container)
- Accepts the same data shape as the form state (jobDetails, companyInfo, gasChecks, appliances, defects, comments, signatures)

**2. Update `src/components/gas-certificates/GasCertificateForm.tsx`**

- Add "Preview" as a new step in the ND flow between "Comments & Sign" and final submission:
  - `STEPS.nd_gas_safety` becomes `["Company / Installer", "Job Details", "Gas Checks", "Appliances", "Defects", "Comments & Sign", "Preview"]`
- On the Preview step, render `<CertificatePreview>` with all collected form data
- Move the "Save Draft" and "Issue Certificate" buttons to appear only on the Preview step
- On the "Comments & Sign" step, the "Next" button advances to Preview

This gives engineers a final visual check of the complete certificate before issuing, with the ability to go back and edit any section.

