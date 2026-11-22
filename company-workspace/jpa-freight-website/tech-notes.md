# JPA Freight website — tech notes

## Architecture

- **Static site generator:** Astro 7, file-based routing in `src/pages/`.
- **Styling:** Tailwind v4 with design tokens in `src/styles/global.css` (`@theme` + component classes mirroring DSSI `marketing-website`).
- **Config:** `src/lib/site.ts` centralizes contact info, nav, and optional `PUBLIC_FORM_ENDPOINT`.
- **Layout:** `BaseLayout.astro` (meta, skip link) + `SiteHeader` / `SiteFooter` on every page.
- **Components:** Section-based Astro components (hero, map, gallery, form, etc.) composed per page.

## Data flow

- No server runtime in production; all pages pre-rendered at build time.
- **Quote form:** Client-side validation → `fetch(POST)` to `PUBLIC_FORM_ENDPOINT` if set; otherwise `mailto:` with prefilled body. Success UI is client-side only (no persistence without backend).
- **Tracking notify:** Email stored in `localStorage` only (demo stub).

## How to run

```bash
cd jpa-freight-website
npm install
npm run dev -- --host 127.0.0.1 --port 4322
# open http://127.0.0.1:4322/dev/jpa-marketing-website/
```

## Deploy (subpath + Docker)

- **Astro `base`:** `/dev/jpa-marketing-website` — all asset/nav URLs use `withBase()` in `src/lib/site.ts`.
- **Build:** `npm run build` → `./dist/` (files at container root; HTML hrefs include the public prefix).
- **Compose:** `docker compose up -d` → `nginx:alpine` on **8093**, mounts `./dist` + `./nginx.conf`.
- **Host nginx:** `location /dev/jpa-marketing-website/` → `proxy_pass http://127.0.0.1:8093/;` (trailing slash strips prefix). See README.

## ASSUMPTIONs

- Accent color `#e85c2b` (warm industrial orange-red) until CEO confirms logo hex.
- Mission/vision copy paraphrases live site commitments; exact legacy wording may differ.
- Testimonials are **SAMPLE** and labeled in UI.
- SVG Philippines map is illustrative, not geographic GIS data.
- Formspree (or similar) wired via env when owner provides endpoint.
- Gallery uses mix of downloaded live banners + one `about_us` photo; additional gallery IDs on live site may use different timestamps.

## Non-goals (today)

- Live tracking portal, CMS, legacy URL redirects, resume upload, analytics/cookie banner, bilingual copy, spam protection (honeypot/rate limit).

## Verification

- `npm run build` must exit 0.
- Manual smoke: all 4 routes, mobile nav, form validation, map scroll animation (with reduced-motion respected), fleet lightbox.