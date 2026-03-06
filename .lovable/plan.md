

# Natural Gas Compliance Module -- Add-on Subscription

## Overview
Build an optional Natural Gas compliance module at £15/user/month as a separate add-on. Engineers fill in digital forms and generate branded PDF certificates for 5 certificate types.

---

## Certificate Types (from parsed documents)

| Certificate | Key Data Fields |
|---|---|
| **Landlord Gas Safety Record** | Appliance details (location, type, make, model, flue), operating pressure, combustion readings (CO ppm, CO2%), safety devices, ventilation, visual condition, performance test, defects, CO alarm status, emergency control, gas tightness, equipotential bonding, next inspection due |
| **Homeowner Gas Safety Record** | Same as Landlord but for homeowner context, no landlord appliance checkbox |
| **ND Gas Safety Record** | Non-domestic version with multiple appliances, similar fields |
| **ND Gas Testing & Purging** | Strength test (pneumatic/hydrostatic), tightness test, let-by test, purge details, test pressures, stabilisation periods, pass/fail results |
| **Gas Warning Notice** | Appliance location/make/model, classification (ID/AR/NCS), issue type (gas escape, pipework, ventilation, chimney, meter, other), fault details, actions taken/required, RIDDOR reporting |

---

## Database Schema

### 1. `gas_certificates` table
- `id`, `company_id`, `site_id`, `engineer_id`, `client_id`
- `certificate_type` enum: `landlord_gas_safety`, `homeowner_gas_safety`, `nd_gas_safety`, `nd_gas_testing_purging`, `gas_warning_notice`
- `certificate_number` (auto-incremented per company)
- `job_address_name`, `job_address`, `job_postcode`, `job_phone`
- `customer_name`, `customer_company`, `customer_address`, `customer_postcode`, `customer_phone`
- `inspection_date`, `next_inspection_due`
- `emergency_control_accessible`, `gas_tightness_satisfactory`
- `pipework_visual_satisfactory`, `equipotential_bonding`
- `co_alarm_present`, `co_alarm_fitted`, `co_alarm_satisfactory`
- `defects` (jsonb array)
- `comments`, `actions_taken`, `actions_required`
- `classification` (for warning notices: `immediately_dangerous`, `at_risk`, `not_to_current_standards`)
- `issue_type` (for warnings: gas_escape, pipework, ventilation, meter, chimney, other)
- `riddor_reported_11_1`, `riddor_reported_11_2`
- Strength/tightness test fields (for ND purging): `test_method`, `test_pressure_mbar`, `stabilisation_period`, `test_duration`, `permitted_pressure_drop`, `actual_pressure_drop`, `strength_test_result`, `tightness_test_result`, `purge_completed`
- `issued_by_signature`, `received_by_signature`, `issued_by_name`, `received_by_name`
- `pdf_url` (stored generated PDF)
- `status` enum: `draft`, `issued`
- `created_at`, `updated_at`

### 2. `gas_certificate_appliances` table
- `id`, `certificate_id`, `position` (order)
- `location`, `appliance_type`, `make`, `model`, `flue_type`
- `appliance_inspected`, `operating_pressure_mbar`, `heat_input_kw`
- `high_co_ppm`, `high_co2_percent`, `low_co_ppm`, `low_co2_percent`
- `safety_devices_correct`, `ventilation_satisfactory`, `visual_condition_satisfactory`
- `performance_test_result`, `appliance_safe_to_use`
- Labels/warning notice issued fields

### 3. `company_addons` table
- `id`, `company_id`, `addon_type` (enum: `natural_gas`)
- `stripe_subscription_id`, `stripe_price_id`
- `status` (active, cancelled, past_due)
- `current_period_start`, `current_period_end`
- `created_at`, `updated_at`

RLS: Same pattern as existing tables -- company_id-based with role checks.

---

## Stripe Setup

Create a new Stripe product and price:
- **Product**: "Natural Gas Compliance Add-on" 
- **Monthly Price**: £15/user/month (recurring)
- **Annual Price**: £12.50/user/month (billed annually, ~17% saving)

Update `src/lib/subscription.ts` to add an `ADDON_MODULES` config alongside existing `SUBSCRIPTION_TIERS`.

---

## Files to Create

| File | Purpose |
|---|---|
| `src/lib/gas-addons.ts` | Add-on module config (prices, features, limits) |
| `src/pages/GasCertificates.tsx` | Main gas certificates list page |
| `src/components/gas-certificates/GasCertificateForm.tsx` | Multi-step form that adapts to certificate type |
| `src/components/gas-certificates/ApplianceFields.tsx` | Reusable appliance row fields component |
| `src/components/gas-certificates/WarningNoticeFields.tsx` | Warning-specific fields (classification, RIDDOR) |
| `src/components/gas-certificates/TestingPurgingFields.tsx` | Strength/tightness/purge test fields |
| `src/components/gas-certificates/GasCertificatePDF.tsx` | PDF generation using jsPDF + autotable |
| `src/hooks/useGasAddon.ts` | Hook to check if company has active gas add-on |
| `supabase/functions/create-addon-checkout/index.ts` | Stripe checkout for add-on subscription |
| `supabase/functions/check-addon/index.ts` | Check add-on subscription status |

## Files to Modify

| File | Changes |
|---|---|
| `src/lib/subscription.ts` | Add `ADDON_MODULES` export with gas module config |
| `src/pages/Pricing.tsx` | Add "Add-on Modules" section below main tiers |
| `src/components/landing/PricingSection.tsx` | Add add-on card |
| `src/App.tsx` | Add `/gas-certificates` route |
| `src/components/layout/AppLayout.tsx` | Add Gas Certificates nav item (conditional on add-on) |
| `supabase/functions/create-checkout/index.ts` | No change needed (separate add-on checkout) |

---

## UI Flow

### Pricing Page Add-on Section
Below the 3 main tier cards, add a new section:

```
── Add-on Modules ──────────────────────────────
┌────────────────────────────────────────────────┐
│ 🔥 Natural Gas Compliance           £15/user  │
│                                                │
│ • Landlord Gas Safety Records                  │
│ • Homeowner Gas Safety Records                 │
│ • Non-Domestic Gas Safety Records              │
│ • Gas Testing & Purging Certificates           │
│ • Gas Warning Notices                          │
│ • Branded PDF generation                       │
│ • Digital signature capture                    │
│                                                │
│              [Add to Subscription]             │
└────────────────────────────────────────────────┘
```

### Gas Certificates Page
- List of all issued certificates with search/filter by type
- "+ New Certificate" button opens type selector then multi-step form
- Each certificate row shows: cert number, type, site, date, status, actions (view PDF, edit draft)

### Certificate Form
- Step 1: Company/engineer details (pre-filled from profile)
- Step 2: Job address & customer details (pre-filled if site selected)
- Step 3: Appliance details (add multiple rows) -- adapts by cert type
- Step 4: Defects, comments, test results (type-specific)
- Step 5: Signatures, review & generate PDF

---

## Implementation Order

1. **Database**: Create `gas_certificates`, `gas_certificate_appliances`, `company_addons` tables with RLS
2. **Stripe**: Create product/prices for the add-on, build checkout edge function
3. **Add-on hook**: `useGasAddon` to check subscription status
4. **Pricing UI**: Add add-on section to pricing pages
5. **Certificate forms**: Build the 5 certificate form variants
6. **PDF generation**: Generate branded PDFs matching the uploaded examples
7. **Gas Certificates page**: List, search, filter, create flow
8. **Navigation**: Add conditional nav item and route

