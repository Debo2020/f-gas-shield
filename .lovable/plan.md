

# Natural Gas Compliance Add-on -- Current Status

The add-on is **already fully implemented** across database, Stripe, edge functions, forms, PDF generation, navigation, and pricing UI. Here is the complete inventory:

## What's Built

| Layer | Component | Status |
|---|---|---|
| **Database** | `gas_certificates`, `gas_certificate_appliances`, `company_addons` tables with RLS | Done |
| **Database** | Auto-numbering trigger (`LGSR-`, `HGSR-`, `NDGS-`, `NDTP-`, `GWN-`) | Done |
| **Stripe** | Product `prod_U66CcCxINGyl6y`, Price `price_1T7u0OF9KjzL48NkyYDPnOqO` (£15/mo) | Done |
| **Edge Functions** | `create-addon-checkout` (Stripe session) | Done |
| **Edge Functions** | `check-addon` (verify & upsert subscription status) | Done |
| **Config** | `src/lib/gas-addons.ts` (module config, cert types, pricing) | Done |
| **Hook** | `src/hooks/useGasAddon.ts` (checks `company_addons` table) | Done |
| **UI -- Pricing** | Add-on module section in `Pricing.tsx` and `PricingSection.tsx` | Done |
| **UI -- Navigation** | Conditional "Gas Certs" nav item in `AppLayout.tsx` | Done |
| **UI -- List Page** | `GasCertificates.tsx` with search, type filter, PDF download | Done |
| **UI -- Type Selector** | `CertificateTypeSelector.tsx` with 5 certificate type cards | Done |
| **UI -- Form** | `GasCertificateForm.tsx` (4-step: Job Details → Gas Checks → Appliances → Comments & Sign) | Done |
| **UI -- Appliances** | `ApplianceFields.tsx` (combustion readings, safety checks) | Done |
| **UI -- Warning** | `WarningNoticeFields.tsx` (classification, RIDDOR) | Done |
| **UI -- Testing** | `TestingPurgingFields.tsx` (strength/tightness/purge) | Done |
| **PDF** | `GasCertificatePDF.tsx` (jsPDF + autotable) | Done |
| **Route** | `/gas-certificates` in `App.tsx` (protected, requires license) | Done |

## What's Required to Use It

The module is fully functional. To activate it for a company, one of these paths applies:

1. **Production flow**: A user clicks "Add to Subscription" on the Pricing page → completes Stripe checkout → the `check-addon` edge function upserts a row in `company_addons` with `status = 'active'` → the nav item appears and certificates become accessible.

2. **Testing/manual activation**: Insert a row directly into the `company_addons` table with your `company_id`, `addon_type = 'natural_gas'`, and `status = 'active'`.

## Potential Enhancements (not blockers)

These are optional improvements you may want in the future but are **not required** for the add-on to function:

- **Edit existing draft certificates** before issuing
- **Digital signature capture** (canvas-based signature pad)
- **Company logo/branding** on PDF output (fetching from `companies.logo_url`)
- **PDF storage** to the `certificates` storage bucket after generation
- **Annual pricing toggle** for the add-on (currently monthly only in Stripe)
- **More detailed PDF layout** matching the exact formatting of the uploaded example documents

No code changes are needed. The add-on is complete and ready for end-to-end testing.

