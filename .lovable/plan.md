## Update Registered Office Address

Replace the old Norwich address with the new London office across the three places it appears. Company name, number, and contact emails are unchanged.

**New address (formatted as a single line where used inline):**
`4th Floor, Silverstream House, 45 Fitzroy Street, Fitzrovia, London, W1T 6EB, United Kingdom`

### Files to update

1. **`src/components/landing/FooterSection.tsx`** (line 109)
   - Replace `19 Upper King Street, Norwich, NR3 1RB, United Kingdom` with the new address.

2. **`src/pages/Privacy.tsx`** (line 260, contact block)
   - Replace the old address line with the new one.

3. **`src/pages/Terms.tsx`** (line 276, "Registered Address:" line)
   - Replace the old address line with the new one.

### Not changing
- Company name (`Build IQ Tech Ltd` / `BUILD IQ TECH LIMITED` — keeping current "Build IQ Tech Ltd" casing for visual consistency with surrounding copy).
- Company number `15883295`.
- Contact emails (`hello@build-iq.co.uk`, `support@ftrack.uk`, etc.) — no email change was requested.

Let me know if you also want the company name rendered in all caps as `BUILD IQ TECH LIMITED` in these locations.
