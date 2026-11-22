# JPA Freight website — QA demo readiness

**Date:** 2025-11-22  
**Reviewer:** QA (AI Company HQ)  
**Project:** `jpa-freight-website/`  
**Dev server:** http://127.0.0.1:4322/  
**Build verified:** `npm run build` exit 0 (4 static pages → `dist/`)

---

## Demo verdict

### **CONDITIONAL GO**

Safe for an **owner walkthrough** of positioning, visual direction, IA, and section completeness. **Do not** treat quote submission or tracking notify as production behavior unless `PUBLIC_FORM_ENDPOINT` is wired and copy/claims are verbally qualified.

---

## CEO must-haves checklist

| Must-have | Result | Notes |
|-----------|--------|-------|
| Multi-page (4 routes) | **PASS** | `/`, `/services`, `/about`, `/contact` — all HTTP **200** on dev server |
| Keep name + logo | **PASS** | Legal name on hero; `/images/logo.png` in hero + header; footer lockup |
| Modern direction (not purple AI template) | **PASS** | Charcoal/asphalt, accent `#e85c2b`, signal `#f0b429`; Barlow Condensed + Outfit; no purple/violet tokens |
| Quote form | **PASS** | Full fields on `/contact#quote`; client validation; success/error/submitting states in code |
| Coverage map | **PASS** | `CoverageMap.astro` on Home (`#coverage`) and Services (`#coverage-map`); SVG + text region list |
| Fleet / gallery | **PASS** | `#fleet` — 6 images, captions, `<dialog>` lightbox |
| Tracking teaser (honest) | **PASS** | “Customer tracking—coming soon”; mock UI labeled “Preview UI (not live)”; sales CTAs |
| Testimonials | **PASS** | Section present; **SAMPLE** labels in UI (`Sample Client`, footer disclaimer) |
| Production-ready-ish static Astro | **PASS** | Astro 7 static build green; pre-rendered `dist/` for all pages |
| Mobile responsive chrome | **PASS** | `viewport` meta; `lg:hidden` hamburger; responsive grids/typography (`sm:`, `md:`, `lg:`) |
| Contact info accurate | **PASS** | Matches brief: 0923-803-6723, sales@jpafreight.ph, address, hours, Facebook |

---

## QA plan (executed)

### Scope under test

Owner demo path: Home scroll → Services → About (careers) → Contact form UI; static build; honesty of tracking/testimonials claims; alignment with `design-brief.md`, `copy-pack.md`, `tech-notes.md`.

### Scenarios exercised

| ID | Type | Steps | Expected | Actual |
|----|------|-------|----------|--------|
| S1 | Smoke | `curl` four routes on :4322 | HTTP 200 | **Pass** — `/`, `/services`, `/about`, `/contact` → 200 |
| S2 | Content | Grep rendered Home HTML | Hero tagline, section IDs | **Pass** — `#trust`, `#services-preview`, `#coverage`, `#fleet`, `#tracking`, `#testimonials`, `#cta` |
| S3 | Build | `npm run build` | Exit 0, 4 pages | **Pass** |
| S4 | A11y (spot) | Inspect `QuoteForm.astro` + contact HTML | `<label for>` on fields | **Pass** — explicit labels; `aria-invalid`, `aria-busy`, `role="alert"` on errors |
| S5 | Honesty | Read `TrackingTeaser.astro` + hero CTA | No fake live portal | **Pass** on section copy; see **B3** for hero button label |
| S6 | Sample copy | Read `TestimonialStrip.astro` | SAMPLE visible | **Pass** |
| S7 | Visual tokens | `global.css` `@theme` | Brief palette, no purple | **Pass** |

### Edge & failure cases (not live-tested in browser)

| Case | Risk | Severity if fails during demo |
|------|------|-------------------------------|
| Submit quote with no `PUBLIC_FORM_ENDPOINT` | Opens mail client then shows success without server receipt | **Major** — owner may think inquiry was received |
| Owner clicks **Track shipment** expecting portal | Lands on `#tracking` with coming-soon (OK if they read) | **Minor** — wording could confuse |
| Fleet/founder stats wrong | About + gallery cite 100+ trucks, 2004 founding, founder name | **Major** (reputation) if unverified with owner |
| Mobile hamburger (`<details>`) | No keyboard/animation test run | **Minor** |
| Network error on Formspree (when wired) | Error banner path exists | **Low** until endpoint set |

### Quality gates (demo)

| Gate | Pass? |
|------|-------|
| All four routes 200 | Yes |
| `npm run build` green | Yes |
| Tracking not presented as live | Yes (section); hero CTA caveat |
| Testimonials labeled SAMPLE | Yes |
| Form has labeled inputs | Yes |
| Logo + brand name on site | Yes |

### Manual vs automated

- **Automated this session:** HTTP smoke, production build, source/HTML inspection.
- **Manual recommended before/during demo:** 5-minute scroll on phone width; click one fleet thumbnail; expand mobile menu; **do not** live-submit quote unless endpoint configured—use empty/error states only.

### Severity rubric

- **Critical:** Wrong legal claims, fake tracking, site broken.
- **Major:** Misleading submit success, unverified fleet/founder facts shown as fact.
- **Minor:** Copy drift, a11y polish, cosmetic.
- **Trivial:** Dev-only hints, comment-only issues.

---

## Bugs found

| ID | Severity | Description | Location |
|----|----------|-------------|----------|
| B1 | **Major** | With `PUBLIC_FORM_ENDPOINT` unset, successful submit triggers `mailto:` then immediately shows **Request received** without confirming the user sent mail—misleading for a real inquiry test. | `QuoteForm.astro` (`mailtoSubmit` → `showSuccess`) |
| B2 | **Minor** | Visible dev footnote: “No form endpoint configured…” on contact form—undermines “production-ready-ish” polish in front of owner. | `QuoteForm.astro` (lines 131–135) |
| B3 | **Minor** | Hero secondary CTA label **Track shipment** (copy-pack warns against “track now” tone); target is honest `#tracking`, but label can imply live tracking at first glance. | `HeroHome.astro` |
| B4 | **Minor** | Header/footer decorative logos use `alt=""` while wordmark is adjacent—acceptable but hero pattern is stronger. | `SiteHeader.astro`, `SiteFooter.astro` |
| B5 | **Minor** | Design brief secondary hero CTA was **Call** in one variant; implementation uses track scroll—acceptable per brief alt flow. | — |
| B6 | **Major (content)** | About meta/story and fleet block state **2004**, **Gerardo S. Alday**, **100+ 10-wheelers**; `copy-pack.md` marks fleet size/history as **NEEDS CEO** unless verified. Gallery tags scale “(owner-confirmed)”—ensure CEO affirms verbally at demo. | `about.astro`, `site.ts`, `FleetGallery.astro` |

No **Critical** build/routing defects found.

---

## Release risks (post-demo)

1. **Form backend:** No Formspree/env → owner expects leads in inbox; mailto + false success panel.
2. **Claims exposure:** Founder/fleet narrative on About may outpace verified claims matrix.
3. **Asset rights:** Hero/gallery mix of live-site banners—CEO photography approval still open per brief.
4. **Accessibility:** No full WCAG audit; contrast/focus patterns look intentional but unmeasured.
5. **SEO/hosting:** No legacy URL redirects; deploy path not verified in this QA pass.

---

## Fix-before-demo (blocking only)

| Item | Blocking? | Recommendation |
|------|-----------|------------------|
| B1 mailto false success | **No** for visual-only demo | **Yes** if owner will click **Send request** — wire `PUBLIC_FORM_ENDPOINT` or change success copy when using mailto |
| B2 dev form footnote | **No** | Hide behind `import.meta.env.DEV` or remove for demo |
| B6 unverified fleet/history | **No** for UI demo | CEO confirms accuracy or you add “verify with owner” callout |
| B3 “Track shipment” label | **No** | Optional rename to “Tracking updates” or “Shipment status” before demo |

**Nothing blocks a guided scroll-through today** if the presenter avoids live form submit and qualifies SAMPLE testimonials + coming-soon tracking.

---

## Visual / UX vs design brief (spot-check)

| Brief rule | Status |
|------------|--------|
| Brand-first hero, large logo, no hero cards/pills | **Met** — full-bleed image, scrim, logo + headline column |
| “Asphalt & signal” palette | **Met** — tokens match brief (`--color-hero-deep`, accent, signal-line) |
| Typography: Barlow + Outfit | **Met** |
| Sticky/translucent header on hero scroll | **Met** — `data-hero-mode` scroll script |
| Motion: ken-burns, rise-in, map emphasis + reduced motion | **Met** — `global.css` |
| Inner pages: compact header, page headers | **Met** |
| Form states: empty, error, submitting, success, network error | **Met** in implementation |
| Skip link | **Met** — `BaseLayout.astro` |

**UX watch:** Home hero uses bottom-aligned content on mobile (`items-end`)—readable with scrim; desktop left-weighted column matches brief.

---

## Decisions for CEO (demo talking points)

1. Confirm **100+ trucks**, founding story, and founder name on About, or ask for softening before public launch.
2. Approve **SAMPLE** testimonials as stand-ins for demo only (already labeled).
3. Choose whether to **configure Formspree** before demo or instruct “form is UI-only today.”
4. Confirm accent orange `#e85c2b` vs official logo colors.
5. Hero secondary button: keep **Track shipment** vs rename for honesty.

---

## Go / no-go summary

| Audience | Recommendation |
|----------|----------------|
| Owner **visual / strategic** demo today | **CONDITIONAL GO** |
| Owner **live quote submission** test | **NO-GO** until form endpoint or mailto UX fixed |
| Public launch | **NO-GO** — form backend, verified testimonials, claims review, photography |

---

*Full checklist and evidence recorded in this file. Build log: Astro static, 4 pages, ~661ms build time on QA run.*