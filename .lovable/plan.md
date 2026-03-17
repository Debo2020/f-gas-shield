

# Raise Service Ticket Feature

## Summary
Build a complete service ticket system accessible from the app's Support section. Authenticated users get a pre-populated form with locked identity fields, user-input-only issue fields, and backend-validated ticket creation with email notification.

## Architecture

### 1. Database: `support_tickets` table
New migration creating the table with all required fields:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| ticket_ref | text | Auto-generated (e.g. FT-000001) |
| company_id | uuid | From backend session |
| user_id | uuid | From backend session |
| user_name | text | From profile |
| user_email | text | From profile |
| user_role | text | From user_roles |
| org_name | text | From companies |
| issue_type | text | Bug, Feature Request, Access Issue, etc. |
| priority | text | Low, Medium, High, Critical |
| affected_module | text | Dashboard, Sites, F-Gas Systems, etc. |
| description | text | User input |
| steps_to_reproduce | text | User input |
| is_recurring | boolean | Yes/No toggle |
| page_url | text | Auto-captured |
| browser_info | text | Auto-captured |
| app_version | text | Auto-captured |
| metadata | jsonb | Any extra context |
| status | text | Default 'open' |
| created_at | timestamptz | Auto |

RLS: Users can INSERT for own company/user_id, SELECT own tickets. Owners/Managers can view all company tickets.

A trigger function auto-generates `ticket_ref` as `FT-NNNNNN`.

### 2. Storage: Attachments
Use existing `compliance-documents` bucket or create a dedicated path prefix. Attachments uploaded client-side, URL stored in a `support_ticket_attachments` table (ticket_id, file_url, file_name, mime_type).

### 3. Edge Function: `submit-support-ticket`
- Validates JWT via `getClaims()`
- Pulls user profile, roles, company name from DB using service role (no client-side trust)
- Validates user input fields (length limits, required fields)
- Generates ticket reference number
- Inserts into `support_tickets` table
- Sends email via Resend to `SUPPORT_EMAIL` secret with full ticket details + attachments
- Returns ticket reference to client

### 4. Secret: `SUPPORT_EMAIL`
Need to add this secret for the recipient email address.

### 5. Frontend: Service Ticket Dialog/Page
New component `src/components/support/ServiceTicketDialog.tsx`:
- **Auto-populated & locked fields** (read-only inputs): Name, Email, Organisation
- **Auto-captured** (hidden, sent with payload): User ID, Org ID, Role, Browser info, Page URL, App version, Timestamp
- **User input fields**:
  - Issue Type (select: Bug, Feature Request, Access Issue, Data Issue, Performance, Other)
  - Priority (select: Low, Medium, High, Critical)
  - Affected Module (select: Dashboard, Sites, F-Gas Systems, Inspections, Gas Log, Gas Certificates, Organisation, Reports, Documents, Other)
  - Description (textarea, required)
  - Steps to Reproduce (textarea)
  - Screenshot/Attachment (file upload)
  - Is this recurring? (Yes/No radio)
- Success state shows ticket reference number

### 6. Navigation Integration
- Add "Raise Support Ticket" button to the Help page contact section
- Add a "Support" menu item in the user dropdown menu in `AppLayout.tsx`
- The ticket dialog opens as a Sheet/Dialog from anywhere in the app

### 7. Email Template
HTML email sent to SUPPORT_EMAIL containing all ticket fields in a structured layout matching the enterprise-contact pattern.

## Files to Create/Edit

1. **New migration SQL** -- `support_tickets` table + `support_ticket_attachments` table + ticket_ref trigger
2. **New secret** -- `SUPPORT_EMAIL`
3. **New edge function** -- `supabase/functions/submit-support-ticket/index.ts`
4. **New component** -- `src/components/support/ServiceTicketDialog.tsx`
5. **Edit** `src/components/layout/AppLayout.tsx` -- Add Support item to user dropdown
6. **Edit** `src/pages/Help.tsx` -- Add "Raise Support Ticket" card in contact section
7. **Edit** `supabase/config.toml` -- Add function config

## Security
- Identity fields pulled server-side from JWT + DB lookup, never from client payload
- Input validation (length limits, required fields, HTML escaping)
- RLS ensures users can only create tickets for themselves
- File uploads validated for type/size client-side

