

## Non-Domestic Gas Safety Certificate — Gap Analysis & Implementation Plan

### What the sample certificate requires vs what exists

Comparing every field in the uploaded "Non Domestic Gas Safety Record" against the current database schema and form code reveals these gaps:

### 1. Database Migration — New Columns

**`companies` table** — add:
- `gas_safe_reg_no` (text, nullable) — Gas Safe Registration Number

**`profiles` table** — add:
- `gas_safe_id_card_no` (text, nullable) — Engineer's Gas Safe ID Card Number

**`gas_certificate_appliances` table** — add 5 columns:
- `landlord_appliance` (boolean, default false) — "Landlord's Appliance" Yes/No
- `appliance_serviced` (boolean, default false) — "Appliance Serviced" Yes/No
- `high_co_ratio` (numeric, nullable) — CO Ratio for high combustion reading
- `low_co_ratio` (numeric, nullable) — CO Ratio for low combustion reading
- `flue_performance_test` (text, nullable) — Flue performance test result

No new columns needed on `gas_certificates` — `defects` (jsonb), `received_by_name`, `received_by_signature` already exist.

### 2. Form Updates

**`ApplianceFields.tsx`** — add the 5 new fields:
- "Landlord Appliance" checkbox
- "Appliance Serviced" checkbox
- "High CO Ratio" numeric input
- "Low CO Ratio" numeric input
- "Flue Performance Test" text input

Update `ApplianceData` interface and `emptyAppliance` default.

**`GasCertificateForm.tsx`** — add to the ND Gas Safety flow:
- **Company/Installer section** (read-only, auto-populated from company + profile): company name, address, phone, Gas Safe reg, engineer name, ID card number
- **Defects section** — dynamic rows with: defect number, description, warning labels issued (using existing `defects` jsonb column)
- **Signatures step** — add "Received By" name field and date (columns already exist in DB)
- Pass the 5 new appliance fields through to the insert query

**`GasCertificateForm.tsx` save handler** — include the new appliance fields (`landlord_appliance`, `appliance_serviced`, `high_co_ratio`, `low_co_ratio`, `flue_performance_test`) in the insert payload, and include `defects` jsonb + `received_by_name` on the certificate record.

### 3. PDF Rewrite for ND Gas Safety

**`GasCertificatePDF.tsx`** — rewrite the `nd_gas_safety` branch to match the sample certificate layout:

1. **Header**: "Non Domestic Gas Safety Record" + Cert. No.
2. **Company / Installer table**: Engineer, Company, Address, Gas Safe Reg, ID Card No
3. **Job Address table**: Name, Address, Postcode, Tel
4. **Customer / Landlord table**: Name, Company, Address, Postcode, Tel
5. **Appliance Details table** — full columns matching the sample: Location, Type, Make, Model, Flue Type, Landlord Appliance, Inspected, Op. Pressure, Heat Input, High CO Ratio/PPM/CO₂%, Low CO Ratio/PPM/CO₂%, Safety Devices, Ventilation, Visual Condition, Flue Performance, Serviced, Safe to Use
6. **Defects table** — numbered rows with description and warning labels
7. **Gas Installation Safety Checks** — Emergency Control, Gas Tightness, Pipework Visual, Equipotential Bonding
8. **Comments** section
9. **Signatures** — Engineer (name + date) and Customer/Representative (name)
10. **Next Inspection Due** date

The PDF will also need to fetch company details (name, address, gas_safe_reg_no) and profile details (gas_safe_id_card_no) — these will be passed from the list page when downloading.

### 4. Company Settings & Profile Updates

- **Company Settings page** (`CompanyDetailsForm.tsx`) — add "Gas Safe Registration Number" field
- **Profile page** (`Profile.tsx`) — add "Gas Safe ID Card Number" field

### 5. Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add 7 columns across 3 tables |
| `src/components/gas-certificates/ApplianceFields.tsx` | Add 5 new fields to interface, form, and defaults |
| `src/components/gas-certificates/GasCertificateForm.tsx` | Add Company/Installer display, Defects section, Received By field, pass new fields to save |
| `src/components/gas-certificates/GasCertificatePDF.tsx` | Rewrite ND Gas Safety PDF to match sample layout |
| `src/pages/GasCertificates.tsx` | Fetch company + profile data for PDF generation |
| `src/components/company/CompanyDetailsForm.tsx` | Add Gas Safe Reg field |
| `src/pages/settings/Profile.tsx` | Add Gas Safe ID Card No field |

