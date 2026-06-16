## SEO landing pages plan

Build 4 dedicated marketing pages targeting the keywords Semrush showed are winnable, plus one informational page to capture the high-volume "f gas register" query without competing for it head-on.

### Pages to create

| Route | Target keyword (UK) | Intent | Primary CTA |
|---|---|---|---|
| `/f-gas-software` | "f gas software" (70/mo, £10 CPC, KD 0) | Commercial — buyers | Start free trial |
| `/refrigerant-tracking-software` | "refrigerant tracking software" (30/mo, KD 0) | Commercial | Start free trial |
| `/refrigerant-management-software` | "refrigerant management software" (30/mo, KD 0) | Commercial | Start free trial |
| `/f-gas-register-guide` | "f gas register" (880/mo, KD 38) | Informational | Soft CTA → FTrack as the tool you'll need post-certification |

All four follow the same template: H1 with exact-match keyword, 2-sentence value prop, screenshot/illustration, 3–5 benefit cards mapped to the keyword's intent, FAQ section (3–5 Qs), trust strip, and a footer CTA. Reuses existing `LandingHeader` and `FooterSection` so brand/nav stay consistent.

The `/f-gas-register-guide` page is content-led: explains what the F-Gas Register is, who needs to be on it (REFCOM route), how to apply, ongoing record-keeping obligations, and links out to gov.uk and REFCOM as authoritative sources. Soft pitch at the bottom: "Once you're certified, you'll need a system to log inspections and refrigerant movements — that's FTrack."

### Per-page SEO

Each page uses `react-helmet-async` (already installed and provider already mounted in `src/main.tsx`):

- Unique `<title>` (≤60 chars) with keyword at the front
- Unique `<meta name="description">` (≤160 chars)
- Self-referencing `<link rel="canonical">` and `<meta property="og:url">`
- `og:title`, `og:description`, `og:type="website"` (article for the guide)
- JSON-LD: `SoftwareApplication` on the three product pages, `Article` + `FAQPage` on the guide
- Single H1 per page, semantic `<section>` / `<h2>` structure
- Internal links: each commercial page links to the other two and to `/pricing`; the guide links to all three product pages

### Files to create / change

**New page components**
- `src/pages/landing/FGasSoftware.tsx`
- `src/pages/landing/RefrigerantTrackingSoftware.tsx`
- `src/pages/landing/RefrigerantManagementSoftware.tsx`
- `src/pages/landing/FGasRegisterGuide.tsx`

**New shared component** (avoids 4× duplication)
- `src/components/landing/SeoLandingTemplate.tsx` — accepts `{ title, metaDescription, canonical, h1, subhead, benefits[], faqs[], jsonLd }` and renders header + hero + benefits grid + FAQ accordion + footer CTA + `FooterSection`.

**Wiring**
- `src/App.tsx` — register 4 new public routes above the catch-all
- `public/sitemap.xml` — add 4 new `<url>` entries (priority 0.7, monthly)
- `src/components/landing/FooterSection.tsx` — add a "Solutions" column linking to the three product pages and a "Resources" link to the guide (helps discovery + internal link equity)

### Technical notes

- Existing pattern: `src/pages/Privacy.tsx` already uses `<Helmet>` correctly — match its structure.
- Routes are public (no `ProtectedRoute` wrap). Authenticated users hitting `/f-gas-software` etc. should redirect to `/dashboard` per the project's auth-redirect rule — wrap each new route content in the same redirect guard used by `Landing` (check `Landing.tsx` for the pattern and reuse it).
- No backend or database changes.
- No new dependencies — `react-helmet-async`, shadcn `Accordion`, `Card`, `Button` are all already in the project.
- Honest expectation to set with the user: KD 0 doesn't mean "instant rank" — new pages typically take 6–12 weeks to start showing, longer with low domain authority. "f gas register" guide will be slow to crack page 1 (KD 38 + gov.uk competition) but can pick up long-tail variants quickly.

### Out of scope (ask separately if wanted)

- Custom hero illustrations / og:images for each page
- A blog/content hub beyond the single register guide
- Programmatic SEO (per-city or per-refrigerant pages)
- Paid-search landing variants
