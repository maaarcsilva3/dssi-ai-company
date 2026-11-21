# GBPI Legal Contract Ops — Pilot MVP (local demo)

Thin operations layer: intake → assignment pool → status timeline → routing slip → expiry visibility → assistive AI (no auto status changes).

## Run (exact commands)

```bash
cd /Users/maaarc.silva/Desktop/Company/dssi-ai-company/company-workspace/gardenia-legal-pilot/app
npm install
npm run db:setup
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts (no password — click to sign in)

| Email | Role | Use in demo |
| --- | --- | --- |
| `requester@gbpi.demo` | requester | Intake, My requests, timeline |
| `atty.jp@gbpi.demo` | legal | Claim pool, matter detail, routing |
| `assigner@gbpi.demo` | assigner | Pool assign, print gate workflow |
| `manager@gbpi.demo` | manager | Portfolio, expiry watch |

## Demo script (≤10 steps, ~25 min)

1. **Login** as `requester@gbpi.demo` → **New request** → submit (note matter number + “email” in terminal).
2. **Sign out** → **Login** as `assigner@gbpi.demo` → **Assignment pool** → **Claim** the new item.
3. Open matter → **Drafting** status → set **custody** + **Google Doc URL**.
4. **Preview & print** routing slip (`LEG-FORM-5` layout) → **Record printed copy issued**.
5. Advance to **Internal Review** (blocked until step 4 if you skip it).
6. **Sign out** → **Login** as requester → **My requests** → open matter → **timeline** + optional **AI summary**.
7. **Login** as `manager@gbpi.demo` → **Portfolio** KPIs → **Expiry watch** → **Near expiry** tab.
8. **Matters** search: filter by counterparty `Filinvest` or status `In Pool`.
9. Open seeded **Lease** (`GBPI-2026-0003`) — verify **near expiry** flag; open **Brand ambassador** — **missing end date** flag.
10. Optional: set `OPENAI_API_KEY` for live LLM summaries; without it, template summaries still work.

## Environment (optional)

| Variable | Default | Notes |
| --- | --- | --- |
| `FEATURE_DIGITAL_ROUTING` | off | Digital routing UI (demo only) |
| `AI_ENABLED` | on | Set `false` to hide AI buttons |
| `OPENAI_API_KEY` | — | Falls back to deterministic summary |
| `DATABASE_PATH` | `./data/gardenia.db` | SQLite file |

## Stack

Next.js 15 App Router · TypeScript · Tailwind v4 · SQLite (`better-sqlite3`) · cookie session demo auth

## Reseed

```bash
npm run db:seed
```