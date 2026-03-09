

## Add Digital Signature Capture to All Gas Certificates

### What Exists Now
- Signatures are text-only: `issued_by_name` and `received_by_name` stored as strings
- DB already has `issued_by_signature` and `received_by_signature` text columns on `gas_certificates` — currently unused
- All preview components show placeholder text "Signature captured on issue"
- PDF generators render empty signature boxes

### Plan

**1. Create `SignaturePad.tsx` component**

A reusable canvas-based signature capture component:
- HTML5 Canvas with touch and mouse drawing support
- Clear button to reset
- Saves signature as base64 PNG data URL
- Props: `value` (base64 string), `onChange` callback, `label`
- Responsive sizing, works on mobile

**2. Update `GasCertificateForm.tsx`**

- Add state for `issuedBySignature` and `receivedBySignature` (base64 strings)
- Add two `SignaturePad` instances in the "Comments & Sign" step alongside the existing name inputs
- Save base64 values to `issued_by_signature` and `received_by_signature` columns on save (columns already exist)

**3. Update all Preview components**

For each of `CertificatePreview.tsx`, `LandlordCertificatePreview.tsx`, `TestingPurgingPreview.tsx`, `WarningNoticePreview.tsx`:
- Accept `issuedBySignature` and `receivedBySignature` props
- Replace placeholder text with `<img>` rendering the base64 signature when available

**4. Update `GasCertificatePDF.tsx`**

- In all `generateXxxPDF` functions, if signature base64 data exists, use `doc.addImage()` to render the signature into the signature table cells
- No DB migration needed — columns `issued_by_signature` and `received_by_signature` already exist

### Files

| File | Action |
|------|--------|
| `src/components/gas-certificates/SignaturePad.tsx` | New — canvas drawing component |
| `src/components/gas-certificates/GasCertificateForm.tsx` | Add signature state + pads to Comments & Sign step |
| `src/components/gas-certificates/CertificatePreview.tsx` | Render signature images |
| `src/components/gas-certificates/LandlordCertificatePreview.tsx` | Render signature images |
| `src/components/gas-certificates/TestingPurgingPreview.tsx` | Render signature images |
| `src/components/gas-certificates/WarningNoticePreview.tsx` | Render signature images |
| `src/components/gas-certificates/GasCertificatePDF.tsx` | Add `doc.addImage()` for signatures |

