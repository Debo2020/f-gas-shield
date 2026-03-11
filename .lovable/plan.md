

## Fix: Invitation Emails Not Sending

### Root Cause
The Resend logs show a `403 validation_error`: the edge function uses `from: "FTrack <onboarding@resend.dev>"` which is Resend's test-only domain. It can only send emails to the Resend account owner's address. All other recipients are rejected.

### Solution
Update the `from` address in `supabase/functions/invite-member/index.ts` to use a verified sending domain. There are two options:

**Option A (Recommended):** If you have a verified domain in Resend (e.g., `build-iq.co.uk`), update line 255:
```typescript
from: "FTrack <noreply@build-iq.co.uk>",
```

**Option B:** Set up a custom email domain through Lovable Cloud's email setup, then use that domain.

### Changes Required

**File: `supabase/functions/invite-member/index.ts`** (line 255)
- Change `from: "FTrack <onboarding@resend.dev>"` to `from: "FTrack <noreply@YOUR_VERIFIED_DOMAIN>"`

### What's Already Working
The rest of the invitation flow is correctly implemented:
- Frontend submits correctly via `supabase.functions.invoke("invite-member")`
- JWT auth verification works
- Invitation record is created in `team_invitations` with a secure token and 7-day expiry
- Auth user is created via `admin.createUser`
- Magic link is generated for the accept URL (`/set-password?token=xxx`)
- Branded HTML email template includes company name, inviter name, role badge, accept link, and expiry notice
- Audit logging is in place
- Error handling catches and logs email failures

### Before Proceeding
I need to know: **what verified domain do you have in Resend?** (e.g., `build-iq.co.uk`, `ftrack.uk`, etc.) so I can set the correct `from` address.

