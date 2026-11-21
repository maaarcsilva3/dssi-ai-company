# CEO Report — Gardenia Legal MVP (live demo)

## Objective
Build the approved Gardenia Legal Contract Ops pilot MVP as a runnable web app for live demo.

## What we did
- **Engineer** shipped a local demo app under `company-workspace/gardenia-legal-pilot/app` (Next.js + SQLite + demo login).
- Demo path: intake → assignment pool → claim → matter (status/custody/GDoc) → LEG-FORM-5 print view → printed-copy gate → requester timeline → manager portfolio/expiry → assistive AI summary (template/OpenAI optional).
- **QA** gave **Conditional GO** for live demo if the server is healthy; full product AC gaps noted (SMTP, CSV import, digests, NL search, clause highlight, true PDF).

## Deliverables
- App: `company-workspace/gardenia-legal-pilot/app` (see README)
- QA: `company-workspace/gardenia-legal-pilot/qa-mvp-demo-readiness.md`

## How you run the demo (your server)
You are serving **http://127.0.0.1:3000** — HQ will **not** stop or restart that process.

Demo accounts (no password — click to sign in):
| Email | Role |
| --- | --- |
| requester@gbpi.demo | Requester intake / My requests |
| assigner@gbpi.demo | Pool claim + print gate |
| atty.jp@gbpi.demo | Legal matter work |
| manager@gbpi.demo | Portfolio + expiry |

Script: README steps 1–9 in `gardenia-legal-pilot/app/README.md`.

## Decisions needed
None blocking for a DSSI-hosted live demo with seed data. Before GBPI production data: SOW + IT hosting/auth still open from the proposal phase.

## Next steps
1. Run the README demo script on your open tab at 127.0.0.1:3000.
2. If any page 500s, tell HQ — we will patch code without killing your server (you restart only if you choose).
3. After champion feedback, prioritize: real PDF download, expiry digest emails, thin CSV import.
