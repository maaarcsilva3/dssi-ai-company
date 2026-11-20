## Objective

Ship Chief of Staff knowledge MVP (S2–S6) with CEO-locked policy, then close S1 runtime gate via serve restart.

## What we did

- Answered meeting location: **no prior meeting store** — only `memory/journal.jsonl` for chats. Meetings now drop to `knowledge/raw/meetings/`.
- Locked: KB root, Decisions=CEO verify, email later, stubs OK, digest ASSUMPTION = per-objective + weekly Friday UTC.
- **Engineer:** Schemas, journal→raw ingest, curated CRUD, verification queue, context packs, digest stub, CLI.
- **QA:** CONDITIONAL GO on KB/CLI; roster visibility still needs restart.

## Deliverables

| Title | Kind |
| --- | --- |
| Chief of Staff knowledge MVP S2–S6 | product-build |
| Chief of Staff S2–S6 QA — conditional go | qa-plan |

KB: `company-workspace/knowledge/` · CLI: `node ai-company/scripts/knowledge/kb.mjs` · Smoke: `cd ai-company && npm run knowledge:smoke`

## Decisions needed

1. **Restart HQ** (required): in the terminal running `serve-all`, Ctrl+C, then `node scripts/serve-all.mjs` from repo root — so `list_roster` shows Chief of Staff.
2. Optional: change weekly digest day from Friday UTC.
3. Later: email provider; real meeting source if not manual drops.
4. Confirm sample smoke Decision may stay unverified or CEO-verify it: `node ai-company/scripts/knowledge/kb.mjs verify --id curated_decision_cos_seventh_role_smoke --as ceo --actor CEO`

## Next steps

1. Restart serve; confirm roster has 7 including Chief of Staff.
2. Optionally verify the smoke Decision as CEO.
3. Next build slice: S7 doc auto-ingest and/or wire CoS into live objective context packs — your call.
