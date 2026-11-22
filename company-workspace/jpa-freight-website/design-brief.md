# Design brief — JPA Freight Logistics, Inc.

**Project:** Production-ready-ish static Astro + Tailwind marketing revamp  
**Audience:** B2B shippers/manufacturers, existing clients, recruitment  
**Deadline:** Today (owner demo)  
**Stack reference:** `company-workspace/marketing-website` (DSSI patterns: BaseLayout, global CSS tokens, `@fontsource`, Tailwind v4 `@theme`)

---

## User & success moment

### Audience jobs & success moments

| Audience | Primary job | Success moment |
|----------|-------------|----------------|
| **B2B shipper / manufacturer** | Validate nationwide hauling capability, reliability, and GPS-backed ops; start a quote without phone tag | Submits quote form (or taps call/email) feeling “these people run tight logistics across the PH” |
| **Existing client** | Find hours, sales contact, tracking path, fleet proof | Locates phone/email in &lt;10s; understands tracking is coming but has a clear placeholder action (notify / sales contact) |
| **Recruit / driver / helper** | See company scale, culture signal, how to apply | Finds careers block on About, sends interest via same form with “Careers” intent or dedicated careers fields |

**Site-level success moment (owner demo):** Owner scrolls Home → sees brand-forward hero, map, fleet, testimonials, tracking teaser → opens Contact → completes quote form UI → feels like a modern logistics partner, not a 2010 template clone.

---

## IA / page map

### Recommended routes (exact)

| Route | Page | Replaces (legacy) |
|-------|------|-------------------|
| `/` | Home | `/` |
| `/services` | Services & coverage | `/services` |
| `/about` | About + Careers | `/about_us` |
| `/contact` | Contact + Quote | `/contact_us` |

**ASSUMPTION:** Static hosting can serve clean paths; no requirement to preserve legacy URLs for demo. **Later:** redirects from `/about_us`, `/contact_us` if DNS/host keeps old paths.

### Global chrome (all pages)

- **Header:** JPA logo (linked home) + wordmark lockup at hero-scale on Home only; on inner pages compact logo left. Nav: Services, About, Contact. Primary header CTA: **Get a quote** → `/contact#quote`. Secondary: **0923-803-6723** (tel link, desktop visible).
- **Footer:** Address, hours (Ops 24/7; Office Mon–Sat 08:00–17:00), sales@jpafreight.ph, Facebook, repeat nav, copyright JPA Freight Logistics, Inc.

### Persistent assets

- Logo: `https://jpafreight.ph/bundles/app/frontend/img/jpa-logo.png` (download to `/public/` for build)
- Hero imagery: **ASSUMPTION** — pull 1–2 from `https://jpafreight.ph/uploads/homepagebanner/` if licensed for demo; else stock highway/fleet photo with **NEEDS CEO** approval for final photography

---

## Happy-path flows

### 1. Quote request (primary)

1. Land on `/` → read headline + tagline → tap **Request a quote** → `/contact#quote`.
2. Scan trust strip (GPS, 24/7 ops, nationwide) above form.
3. Fill: name, company, email, phone, origin/destination (text), cargo type (select), preferred date (optional), message.
4. Submit → success state with “We’ll respond within one business day” + tel/email fallback.
5. **ASSUMPTION:** No backend today — Formspree/spmail endpoint stub or `mailto:` with pre-filled subject; Engineer wires env `PUBLIC_FORM_ENDPOINT`.

### 2. Browse services & coverage

1. Header **Services** or Home **View services** → `/services`.
2. Scan service pillars (Nationwide hauling, VAS, Hire a Helper).
3. Scroll to **Coverage map** (Philippines regions highlighted).
4. CTA **Get a quote** → `/contact#quote`.

### 3. Careers interest

1. Header **About** → `/about#careers`.
2. Read fleet scale, safety/GPS, Tanauan HQ.
3. Tap **Join our team** → scroll to careers form block (subset of contact form: role interest, experience, upload resume **Later**) or anchor to `/contact#quote` with `intent=careers` query **ASSUMPTION** — single form with “Inquiry type” select: Quote | General | Careers.

---

## First viewport — Home (`/`)

**Layout:** Single composition, full-bleed. **No** card grid, **no** overlay badges/pills on the hero image.

### Desktop (≥1024px)

- **Background layer:** Full-viewport photograph (highway + JPA truck or fleet yard), `object-cover`, subtle **ken-burns** scale only on image (not on text). Left-weighted **scrim gradient** for text legibility (see DSSI `hero-scrim` pattern) — gradient only, not a content card.
- **Foreground column (left ~42%, max-width 36rem):**
  1. **Brand hero block:** JPA logo at large size (min-height ~56–72px logo) + “JPA Freight Logistics, Inc.” display line optional if logo is wordmark-heavy — brand must dominate over nav.
  2. **Headline (display font):** “Whatever day it is—we deliver.” (em dash; title case optional)
  3. **Support (one line):** Nationwide hauling across every region of the Philippines—GPS-tracked fleet, 24/7 operations.
  4. **CTA group:** Primary **Request a quote** (`/contact#quote`); secondary ghost **Track shipment** → scroll to `#tracking` on Home **or** `/contact#tracking` teaser — prefer **on-page `#tracking`** for demo.
- **Nav:** Minimal top bar: transparent over hero; logo smaller duplicate only if needed for sticky — on first paint, **large brand sits in hero column**, nav is slim (Services, About, Contact + Get a quote).

### Mobile

- Same stack: brand → headline → support → CTAs (full-width buttons, `rounded-sm` not pills).
- Hero image remains full-bleed behind; scrim slightly stronger at bottom for thumb reach.
- Sticky header after scroll: compact logo + hamburger; **Get a quote** remains visible in menu footer.

**Hard rule check:** One headline, one support, one CTA group, one dominant image — satisfied.

---

## Section-by-section — all pages

### Home (`/`)

| # | Section ID | Job | Content |
|---|------------|-----|---------|
| 1 | (hero) | Orient + convert | As above |
| 2 | `#trust` | Quick proof | 3–4 stat/fact tiles in a **single horizontal band** (not cards in hero): e.g. “24/7 ops”, “All units GPS”, “Nationwide PH”, “Tanauan HQ” — use dividers, not floating cards |
| 3 | `#services-preview` | Route to depth | 3 linked rows: Hauling, Value-added services, Hire a Helper → `/services#...` |
| 4 | `#coverage` | Geographic confidence | **Service coverage map** — simplified SVG map of Philippines with region labels (Luzon, Visayas, Mindanao clusters) + “All regions” callout; no Google Maps embed required for demo **ASSUMPTION** |
| 5 | `#fleet` | Visual proof | **Fleet gallery** — 6–8 images, masonry or uniform grid, lightbox on click; caption: unit type if known **NEEDS CEO** for captions |
| 6 | `#tracking` | Expectation set | **Tracking teaser** — headline “Shipment tracking, coming soon”; short copy matching live site honesty; email notify field (client-only stash to localStorage or Formspree **ASSUMPTION**) + link to contact sales; visual: stylized tracking UI mock (static), not fake live data |
| 7 | `#testimonials` | Social proof | 2–3 testimonials — if no approved quotes **NEEDS CEO**, use placeholder structure with `<!-- NEEDS CEO: client quote -->` and one **ASSUMPTION** generic line marked for replacement |
| 8 | `#cta` | Final convert | Full-width band: “Ready to move cargo?” + quote CTA + phone |

### Services (`/services`)

| # | Section | Job | Content |
|---|---------|-----|---------|
| 1 | Page header | Context | Title “Services”; one-line nationwide hauling |
| 2 | `#hauling` | Core offer | Long-haul / FTL-style copy; bullet outcomes (on-time, documented, regional reach) |
| 3 | `#vas` | Differentiators | 24×7 customer service, 24×7 on-site maintenance, GPS on all units |
| 4 | `#helper` | Hire a Helper | Short explainer + CTA quote with cargo/labor context |
| 5 | `#coverage-map` | Repeat map | Same component as Home map (reusable `CoverageMap.astro`) |
| 6 | CTA band | Convert | Quote + contact |

### About (`/about`)

| # | Section | Job | Content |
|---|---------|-----|---------|
| 1 | Page header | Identity | Company story, “WHATEVER DAY IT IS… WE DELIVER.” as pull quote |
| 2 | `#story` | Trust | Mission/values—professional, family-operated tone **ASSUMPTION** until CEO copy |
| 3 | `#operations` | Ops proof | 466 Zone 4, Brgy. Natatas, Tanauan City, Batangas; garage + office; hours split |
| 4 | `#fleet-about` | Scale | Smaller gallery or link to Home fleet; fleet count **NEEDS CEO** |
| 5 | `#careers` | Recruitment | Open roles list **ASSUMPTION:** “Drivers, helpers, dispatch—always interested in skilled people”; CTA to contact form with Careers intent |
| 6 | CTA | Convert | Quote |

### Contact (`/contact`)

| # | Section | Job | Content |
|---|---------|-----|---------|
| 1 | Page header | Reach | Phone, email, address, hours, Facebook |
| 2 | `#quote` | **Quote/inquiry form** | Full form (see States); anchor target for all CTAs |
| 3 | `#map-embed` | Location | Static map link to Google Maps query for address **ASSUMPTION** — optional iframe **Later** |
| 4 | `#tracking-fallback` | Tracking | Repeat teaser: “Tracking portal coming soon—contact sales@jpafreight.ph” |

---

## Visual direction

**Concept: “Asphalt & signal”** — industrial night-highway clarity, not startup purple or broadsheet clutter. Feels Filipino logistics: heat, distance, reliability. Logo stays; surround it with deep charcoal, hi-vis amber accent (road line / beacon), and cool steel mist for secondary surfaces.

### Mood

- Full-bleed photography, hard edges (`rounded-sm`), restrained shadows.
- Typography-led hierarchy; numbers and region names in display face.
- Accent used sparingly: CTAs, active nav, map highlights — not full yellow pages.

### Typography (expressive — not Inter/Roboto)

| Role | Font | Source package |
|------|------|----------------|
| Display | **Barlow Condensed** (700/800) | `@fontsource/barlow-condensed` |
| UI / body | **Outfit** (400/500/600) | `@fontsource/outfit` |

**ASSUMPTION:** Barlow Condensed evokes highway signage; Outfit is geometric and readable for forms.

### CSS token proposal (`global.css` `@theme` + `:root` mirrors)

```css
@theme {
  /* Typography */
  --font-display: "Barlow Condensed", sans-serif;
  --font-sans: "Outfit", sans-serif;

  /* Surfaces & ink */
  --color-ink: #0f1419;
  --color-ink-muted: #5a6570;
  --color-surface: #e8ebee;
  --color-surface-elevated: #ffffff;
  --color-border: #c2c9d1;

  /* Hero / night road */
  --color-hero-deep: #12161c;
  --color-hero-mist: #2c3540;
  --color-hero-asphalt: #1a1f26;

  /* Brand accent — extract from logo */
  --color-accent: #e85c2b;           /* ASSUMPTION: warm industrial orange-red */
  --color-accent-hover: #c94e24;
  --color-accent-ink: #0f1419;
  --color-signal-line: #f0b429;      /* highway line / map highlight */
  --color-signal-muted: #d4dce4;

  /* Map */
  --color-map-land: #2a3440;
  --color-map-region-active: #f0b429;
  --color-map-region-idle: #3d4a56;

  /* Spacing scale (reference) */
  --space-section-y: 5rem;           /* mobile 3.5rem */
  --space-section-y-lg: 7rem;
  --content-max: 72rem;
  --prose-max: 42rem;
}
```

**NEEDS CEO:** Confirm accent hex from official brand / logo (replace `--color-accent` if logo is primarily blue).

### Imagery

- Hero: fleet on NLEX/SCTEX-style road or company banner from live site.
- Gallery: trucks, yard, loading — consistent color grade (slightly desaturated, lift shadows).
- No stock “smiling warehouse workers” collage.

---

## Component inventory (Engineer)

| Component | Props / notes |
|-----------|----------------|
| `BaseLayout.astro` | `title`, `description`, optional `ogImage` |
| `SiteHeader.astro` | `variant: "hero" \| "default"`, `transparent` bool |
| `SiteFooter.astro` | Static site config |
| `HeroHome.astro` | Headline, support, CTAs, background image path |
| `TrustBand.astro` | Items: `{ label, value }[]` |
| `ServicePreviewList.astro` | Links to `/services#anchors` |
| `CoverageMap.astro` | SVG PH map, region list, optional `highlight="nationwide"` |
| `FleetGallery.astro` | `images[]`, lightbox client script (minimal) |
| `TrackingTeaser.astro` | `id="tracking"`, notify input, sales fallback |
| `TestimonialStrip.astro` | `quotes[]` with name, company, role |
| `CtaBand.astro` | Title, primary/secondary links |
| `PageHeader.astro` | Inner page title + intro |
| `ServiceBlock.astro` | `id`, title, body, bullets |
| `QuoteForm.astro` | Full form + client validation + submit handler stub |
| `ContactCards.astro` | Phone, email, address, hours, Facebook |
| `Button.astro` | `variant: primary \| ghost-hero \| ghost-light` |
| `site.ts` | Centralize name, tagline, phone, email, address, social, form endpoint |

**Layouts:** Mirror DSSI: `src/pages/*.astro`, `src/layouts/BaseLayout.astro`, `src/styles/global.css`.

---

## Form states — Quote / inquiry (`QuoteForm.astro`)

**Fields (must-have):** Inquiry type (Quote | General | Careers), Name*, Company, Email*, Phone*, Origin, Destination, Cargo type (select), Message*.

### Empty (default)

- Visible labels (not placeholder-only); `required` on starred fields.
- Primary submit: **Send inquiry**.
- Helper text: “Ops answers 24/7; sales office Mon–Sat 8:00–17:00.”

### Validation error

- On submit: inline errors under fields (`role="alert"`), border `--color-accent` or dedicated `--color-error: #c53030`.
- Focus first invalid field.
- Summary at top optional for screen readers only (visually hidden list).

### Submitting

- Disable button, label **Sending…**; `aria-busy="true"`.

### Success

- Replace form body with confirmation panel: check icon (SVG, not emoji), “Request received”, next steps, `tel:09238036723` and `mailto:sales@jpafreight.ph`.
- **ASSUMPTION:** Formspree `POST` or `mailto:` fallback if endpoint unset — show dev banner in non-prod only.

### Server/network error

- Banner: “Could not send. Call 0923-803-6723 or email sales@jpafreight.ph.”
- Preserve field values.

---

## Motion intent (2–3)

1. **Hero ken-burns** — slow scale on background image only (22s alternate), `prefers-reduced-motion: reduce` disables (match DSSI `hero-bg`).
2. **Rise-in stagger** — hero brand, headline, support, CTAs use `rise-in` 0.12s delays (max 4 elements).
3. **Map region pulse** — on scroll into `#coverage`, active regions fade opacity 0.6 → 1 once (CSS `@keyframes region-emphasis`, 600ms); no infinite glow piles.

---

## Accessibility basics

- Color contrast: body text `--color-ink` on `--color-surface` ≥ WCAG AA; hero white text on scrim ≥ AA for headline and buttons.
- Focus rings: visible `outline` / `ring` on all interactive elements (2px, offset).
- Form: explicit `<label for>`, `aria-invalid`, `aria-describedby` for errors.
- Images: meaningful `alt`; decorative gallery backgrounds `alt=""`.
- Skip link: “Skip to main content” first in body.
- Motion: respect `prefers-reduced-motion`.
- Map: provide text list of regions adjacent to SVG (not color-only).
- Tel/mail links: readable labels (“Call sales”, not bare number in link text only).

---

## Must-have vs later

### Must-have (today demo)

- 4 pages at routes above
- Home hero per composition rules
- Quote form UI with empty/error/success states (stub submit)
- Coverage map (SVG)
- Fleet gallery
- Tracking teaser (honest “coming soon”)
- Testimonials section (structure + at least one quote **NEEDS CEO** or labeled placeholder)
- Mobile responsive header/footer
- JPA name + logo preserved
- Contact info accurate (phone, email, address, hours, Facebook)

### Later

- Live tracking portal integration
- Legacy URL redirects
- CMS / admin for testimonials and gallery
- Resume upload for careers
- Google Maps embed / interactive coverage
- Blog / news
- Analytics, cookie banner if required
- Bilingual copy (EN/TL)
- Production form backend + spam protection (honeypot, rate limit)

---

## Decisions for CEO / owner

| Label | Item |
|-------|------|
| **NEEDS CEO** | Approve hero/fleet photography (live banners vs new shoot) |
| **NEEDS CEO** | Official brand color hex from logo (accent token) |
| **NEEDS CEO** | 2–3 real client testimonials with names/companies |
| **NEEDS CEO** | Fleet gallery image set + captions |
| **NEEDS CEO** | Careers: actual open roles vs general interest |
| **NEEDS CEO** | Form delivery: Formspree account/email vs internal inbox |
| **ASSUMPTION** | English-only copy for demo |
| **ASSUMPTION** | Tracking notify email stored via Formspree field, not productized yet |
| **ASSUMPTION** | SVG map sufficient for “service coverage map” showpiece |

---

## Handoffs

### Engineer

- Scaffold Astro project parallel to `marketing-website`; implement tokens in `global.css`; build components listed above; download logo to `public/`; wire `site.ts` constants; implement `QuoteForm` with env `PUBLIC_FORM_ENDPOINT`; use `@fontsource/barlow-condensed` + `@fontsource/outfit`; no hero cards/badges; sticky header on scroll.

### Marketer

- Replace **ASSUMPTION** About story and testimonial placeholders with approved owner copy; align headline punctuation with brand (“WHATEVER DAY IT IS… WE DELIVER.”); optional meta descriptions per page for owner social share.

---

*Deliverable: design brief only — no site build in this artifact.*