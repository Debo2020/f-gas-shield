

## Add Client → Site Selection to Gas Certificate Workflow

**Current state:** The "Job Details" step (step 2) has manual text inputs for property address and client/landlord details. The `gas_certificates` table already has `client_id` and `site_id` columns but they are never populated.

**Goal:** Add Select Client → Select Site dropdowns (filtered by chosen client) that auto-populate address and contact fields, matching the pattern used in the F-Gas/Sites module.

### Changes — single file: `src/components/gas-certificates/GasCertificateForm.tsx`

1. **Add state** for `selectedClientId` and `selectedSiteId`
2. **Fetch clients** for the company on mount (from `clients` table)
3. **Fetch sites** filtered by `selectedClientId` (from `sites` table where `client_id` matches)
4. **Add two Select dropdowns** at the top of the "Job Details" step:
   - **Client dropdown** — lists all active clients; on change, auto-populates customer name/company/address/phone fields and resets site selection
   - **Site dropdown** — lists sites belonging to selected client; on change, auto-populates job address/name/postcode/phone fields
   - Both include a "Manual entry" option to allow free-text input as fallback
5. **Save `client_id` and `site_id`** in the `certData` object passed to the insert query

### Technical detail
- Uses existing `Select` component from `@/components/ui/select`
- Queries: `supabase.from("clients").select("*").eq("company_id", companyId).eq("is_active", true)` and `supabase.from("sites").select("*").eq("client_id", selectedClientId).eq("is_deleted", false)`
- Auto-populate mapping: client → `customer_name` (contact_name), `customer_company` (name), `customer_address` (address), `customer_phone` (contact_phone); site → `job_address_name` (name), `job_address` (address), `job_postcode` (postcode), `job_phone` (contact_phone)

