# AI Agent Company

You are the CEO. AI employees (Agent SDK subagents) run the work.

## Layout

- [`ai-company/`](ai-company/) — HQ COO agent, role subagents, tools, CEO HTTP channel
- [`ai-company/company-data/`](ai-company/company-data/) — **shared** roster + deliverables (sync this across PCs)
- [`dashboard/`](dashboard/) — thin CEO console (roster, objectives, deliverables)

## Employees

| Role | Owns |
| --- | --- |
| product-manager | Specs, priorities, acceptance criteria |
| engineer | Implementation / architecture |
| qa | Test plans, quality gates |
| designer | UX flows, design briefs |
| marketer | Positioning, launch, campaigns |
| finance | Budget, pricing, unit economics |

## Ask before execute

On a new or thin objective, HQ asks clarifying questions and **waits** for your answers before delegating. Say “decide for me / just execute” if you want it to skip Q&A.

## Run HQ (Agent SDK)

`npm run serve` **asks you to log in first**, then starts the playground.

```bash
cd ai-company
npm install
npm run serve
```

Playground: http://127.0.0.1:3000/playground

## Run on every machine + share history

1. Keep this project in **Git** or a **cloud-synced folder** (OneDrive / Dropbox / iCloud).
2. On each PC: sync/clone → `cd ai-company` → `npm install` → `npm run serve` (login once per machine).
3. After work: **push/sync** so `company-data/roster.json` and `company-data/deliverables.json` reach other PCs.
4. On the next PC: **pull/sync** before starting HQ so you see prior deliverables (each entry records which `machine` wrote it).

Cursor credentials stay local (`agent-sdk login` per machine). Shared state is only `company-data/`.

## Run CEO dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open http://127.0.0.1:5173 (proxies `/api` to local HQ).
