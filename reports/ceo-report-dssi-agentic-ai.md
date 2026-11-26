# CEO brief — DSSI agentic AI (landing + demo)

## Objective
Keep the DSSI services + Operational Gap Audit site; add agentic AI (“answer anything about the data it has”) via homepage section + `/agent` thin demo mock; stay audit-primary CTA; public-launch ready under a $5k envelope.

## What we did
- **Engineer:** Shipped homepage Agentic AI section, interactive `/agent` scripted demo, CTA updates (`Start an audit` → `/audit`), nav link; `npm run build` PASS.
- **Marketer:** Positioning, paste-ready copy, claims matrix, lean 2-week launch outline.
- **Finance:** $5k impact model, packaging options, scenarios, conditional GO.

## Deliverables
| Role | Title | Kind |
| --- | --- | --- |
| Engineer | DSSI marketing site — agentic AI mock (homepage + `/agent`) | product-build |
| Marketer | DSSI agentic AI — positioning & launch copy pack | gtm |
| Finance | DSSI agentic AI — $5k project impact & launch economics | finance |

**Disk:** `company-workspace/marketing-website/` — live pages + `tech-notes-agentic-ai.md`, `copy-pack-agentic-ai.md`, `finance-agentic-ai-impact.md`.

**Preview:** `cd marketing-website && npm run dev` → http://localhost:4321 and `/agent`.

## Decisions needed
1. **Blocker for true public launch:** Replace `hello@dssi.example` (and wire Cal/Formspree if used) with a real inbox.
2. Sign off **disclaimer language** (demo = sample/scripted data; production agent = your connected warehouse).
3. Confirm **audit list price** (finance used $9k midpoint ASSUMPTION) and whether agent readiness is included in the audit (Option A recommended) or paid upsell.
4. Cap **90-day paid launch spend** (finance suggests ≤$500 until metrics).

## Next steps
1. Drop in real contact/booking → redeploy `dist/`.
2. Spot-check `/agent` prompts on mobile; optional paste of marketer copy pack polish.
3. Run week-1 owned channels (LinkedIn + warm email) before turning on paid.
