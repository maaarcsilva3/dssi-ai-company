# JPA Freight Logistics — Marketing Site

Static Astro + Tailwind v4 marketing website for **JPA Freight Logistics, Inc.**

**Production base path:** `/dev/jpa-marketing-website`  
**Container port (host):** `8093` → nginx alpine serving `dist/`

## Local dev

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4322
```

Open [http://127.0.0.1:4322/dev/jpa-marketing-website/](http://127.0.0.1:4322/dev/jpa-marketing-website/)

## Build dist

```bash
npm install
npm run build
```

Output: `./dist/` (assets and links prefixed with `/dev/jpa-marketing-website/`).

## Docker (serve dist only)

```bash
npm run build
docker compose up -d
```

Smoke: [http://127.0.0.1:8093/](http://127.0.0.1:8093/) (container root; host nginx adds the `/dev/jpa-marketing-website` prefix).

## Host nginx (ds-solutionsinc.com)

Add alongside your other `/dev/*` locations:

```nginx
location = /dev/jpa-marketing-website {
    return 301 /dev/jpa-marketing-website/;
}

location /dev/jpa-marketing-website/ {
    proxy_pass http://127.0.0.1:8093/;   # trailing slash strips the prefix
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Public URL: `https://ds-solutionsinc.com/dev/jpa-marketing-website/`

## Environment (optional)

| Variable | Purpose |
|----------|---------|
| `PUBLIC_FORM_ENDPOINT` | Formspree (or similar) URL for quote form POST. If unset, submit uses `mailto:sales@jpafreight.ph`. |

```env
PUBLIC_FORM_ENDPOINT=https://formspree.io/f/your-id
```

Set before `npm run build` so it is baked into the static bundle.

## Pages

- `/dev/jpa-marketing-website/` — Home
- `/dev/jpa-marketing-website/services/` — Services & coverage
- `/dev/jpa-marketing-website/about/` — About + careers
- `/dev/jpa-marketing-website/contact/` — Contact + quote form

## Stack

- Astro 7
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Fonts: Barlow Condensed (display), Outfit (UI) via `@fontsource`
- Runtime: `nginx:alpine` via `docker-compose.yml` (static `dist/` only)
