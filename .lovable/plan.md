

## Non-Domestic Gas Safety Record — Alignment with Sample Certificate

### Gap Analysis

Comparing the uploaded sample certificate (Sewell NDGS Cert 370) against the current code reveals these discrepancies:

**Appliance Table (PDF)** — Missing 3 columns the prompt requires:
- High CO Ratio and Low CO Ratio (data exists in DB and form, just not rendered in PDF)
- Flue Performance Test (same — stored but not printed)
- Appliance Serviced (same)

Current table: 18 columns. Required: 22 columns (including `#`). This is tight on portrait A4 but achievable at 5pt font with abbreviated headers.

**Defects Table (PDF)** — Sample shows per-appliance rows with 4 columns: `#`, `Labels and Warning Notice Issued`, `Emergency Control Accessible`, `Gas Tightness Satisfactory`. Current code shows a flat defects list without per-row safety checks.

**Gas Installation Safety Checks (PDF)** — Currently shows only 2 fields. The prompt requires 4: Emergency Control, Gas Tightness, Pipework Visual Inspection, Equipotential Bonding.

**Form** — The Gas Checks step for ND already has all 4 fields plus CO alarm checks. No form changes needed.

**ApplianceFields.tsx** — Already contains all 21 data fields. No changes needed.

**Database** — All columns already exist. No migration needed.

### Changes Required

**File: `src/components/gas-certificates/GasCertificatePDF.tsx`**

1. **Appliance table** — Add 4 missing columns:
   - After "High CO (ppm)" add "High CO Ratio"
   - After "Low CO (ppm)" add "Low CO Ratio"  
   - After "Visual Cond." add "Flue Perf." and "Serviced"
   - Adjust column widths to fit 22 columns (reduce text columns like Location/Type/Make/Model, use 5pt font)

2. **Defects table** — Restructure to match sample layout:
   - Columns: `#` | `Defect Description` | `Labels & Warning Notice` | `Emergency Control Accessible` | `Gas Tightness Satisfactory`
   - Render one row per appliance (matching appliance count), filling defect data from the `defects` jsonb array by index

3. **Gas Installation Safety Checks** — Add Pipework Visual Inspection and Equipotential Bonding rows (data already stored on certificate record)

### Files Changed

| File | Change |
|------|--------|
| `src/components/gas-certificates/GasCertificatePDF.tsx` | Add 4 appliance columns, restructure defects table, expand safety checks to 4 rows |

No database, form, or settings changes required — all data inputs and storage already exist.

