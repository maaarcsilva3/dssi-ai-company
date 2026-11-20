## Objective

Add **Chief of Staff** as a real 7th AI employee and define the organizational knowledge system (two-layer raw + curated) so CEO and all AI employees always have trustworthy context.

## What we did

- **COO:** Locked CEO answers; applied then removed interim CoS overlay on PM; sequenced S1 platform work.
- **Product Manager:** Full product brief (six responsibilities, two-layer KB, verification CEO+PM, delivery slices S1–S10). Saved at `company-workspace/chief-of-staff/product-brief.md`.
- **Engineer:** Shipped **S1** — `chief-of-staff` RoleId, subagent, playbook, COO/`run-objective` routing, roster with 7 roles, `company-workspace/knowledge/` scaffold. `npm run check` + `agent-sdk validate` green.
- **QA:** Static AC pass; **conditional go** pending live serve restart so `list_roster` shows CoS.

## Deliverables

| Title | Kind |
| --- | --- |
| Chief of Staff product brief (platform + knowledge system) | product-brief |
| Chief of Staff S1 platform scaffolding | tech-plan |
| Chief of Staff S1 QA — conditional go | qa-plan |

Also on disk: `company-workspace/chief-of-staff/product-brief.md`, `company-workspace/knowledge/`.

## Decisions needed

1. **Meeting ingest:** Which source(s)? (Zoom, Meet, upload folder, …)
2. **Email ingest:** Provider + mailbox scope (CEO only vs shared)
3. **KB location:** Confirm `company-workspace/knowledge/` vs shared `company-data/` (current ASSUMPTION: workspace)
4. **Decisions verification:** CEO-only for Decisions category, PM for operational/project status? (ASSUMPTION — confirm)
5. **Intelligence digest cadence:** per objective / daily / weekly?
6. **S10 stub:** OK to ship meeting/email as `disconnected` + manual `raw/` upload until connectors exist?
7. **Ops:** Restart agent serve (and MCP) so live `list_roster` shows 7 including Chief of Staff — required to close S1 runtime gate

## Next steps

1. You answer decisions 1–6 (or say “use assumptions”).
2. Restart serve; confirm roster shows Chief of Staff.
3. We proceed S2→S6 (schemas, chat ingest, curated CRUD, verification queue, context packs).
