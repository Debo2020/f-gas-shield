## Why verification emails aren't arriving

Supabase is doing its job — the auth logs show `user_confirmation_requested` firing and the email hook returning success. The problem is the **delivery side**: this workspace has no verified sender domain, so Lovable is falling back to its default sender. Default-sender mail to real production addresses (Gmail, corporate domains) is regularly rate-limited or silently dropped, which matches what you're seeing.

The fix is to send from your own brand (`ftrack.uk`) and ship branded templates that match the app.

## What I'll do

### 1. Set up a verified sender on `ftrack.uk`
Open the email setup dialog so you can pick a delegated subdomain — recommended: `notify.ftrack.uk`. You'll add 2 NS records at your registrar; Lovable then manages SPF / DKIM / DMARC inside that delegated zone automatically. The root `ftrack.uk` keeps serving the app as it does today.

This also provisions the queue/cron infrastructure (`process-email-queue`, pgmq queues, send log, suppression list) needed for reliable delivery.

### 2. Scaffold branded auth email templates
Generate the 6 standard auth templates (signup confirmation, magic link, password recovery, invite, email change, reauthentication) plus the `auth-email-hook` edge function that routes Supabase auth events into the queue.

### 3. Brand the templates to match FTrack
Pull tokens from `src/index.css` / `tailwind.config.ts` and the FTrack logo from `public/`, then apply them across all 6 templates:
- Primary button colour + radius from `--primary` / `--radius`
- Heading and body colours from `--foreground` / `--muted-foreground`
- FTrack logo embedded at the top of each template (uploaded to an `email-assets` bucket)
- Copy adapted to FTrack tone (e.g. "Confirm your FTrack account" not generic "Verify email")
- Body background stays `#ffffff` per email-client compatibility rules

### 4. Deploy and verify
Deploy `auth-email-hook`, then surface a button so you can open **Cloud → Emails** to watch DNS verification complete and inspect the send log. Until DNS verifies, Supabase keeps using default Lovable templates as a safe fallback — there is no outage during the switchover.

After this is live, any new signup will:
1. Hit Supabase `/signup`
2. Trigger `auth-email-hook`
3. Enqueue a branded email in `auth_emails`
4. `process-email-queue` sends it from `noreply@notify.ftrack.uk` within ~5 seconds

## What you'll need to do
- Complete the email setup dialog (one click → confirm subdomain → copy 2 NS records into your DNS registrar). DNS propagation is typically minutes to a few hours.

## Out of scope (call out, not doing now)
- Migrating existing `send-license-invitation` / `invite-member` / `enterprise-contact` functions off the standalone Resend send to go through the same queued transactional pipeline. Happy to do this in a follow-up — it would give all app emails (invites, support tickets, etc.) the same reliability and unsubscribe / suppression handling.
- The open security findings still pending (`health_check_log`, token-column exposure on `team_invitations` / `user_licenses` / `client_users`, offline crypto redesign, `SUPA_rls_policy_always_true`) — separate from this email issue.
