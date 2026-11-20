# AI Agent Company

You are the CEO. Talk to HQ in the playground. Employees do the work. Reports are saved as files.

## Layout

- [`ai-company/`](ai-company/) — HQ COO + role subagents
- [`company-workspace/`](company-workspace/) — **shared project files** (every playground chat sees this)
- [`reports/`](reports/) — CEO output files (`.md`, `.pdf`, etc.)
- [`ai-company/company-data/`](ai-company/company-data/) — shared roster + deliverable log

## Run

```bash
cd "C:\Users\marc.silva\Desktop\test company"
npm run install:all   # first time
npm run serve
```

Playground: http://127.0.0.1:3000/playground  
Reports folder: `reports\` next to this README

Ask for formats in chat, e.g. “save the CEO report as markdown” or “export that as PDF”.

## Ask before execute

On a thin objective, HQ asks clarifying questions and waits before delegating.

## Multi-machine

Sync this whole folder (Git / OneDrive). Pull before work so `company-data/` and `reports/` stay shared. Run `npm run login` once per PC.
