# Organizational knowledge base (S2–S6)

**Status:** MVP slices S2–S6 implemented. Root: `company-workspace/knowledge/` (CEO confirmed 2026-11-20).

## Two-layer model

| Layer | Directory | Rules |
| --- | --- | --- |
| **Raw evidence** | `raw/` | Immutable originals. Append-only; never overwrite with summaries. |
| **Curated knowledge** | `curated/` | Structured facts. Every record requires `source_ref[]` → raw paths. |
| **Index** | `index/` | Ingest ledger, latest context pack JSON, digest stubs. |
| **Queue** | `queue/` | Verification queue (`verification.json`). |

### Raw layout

| Subdir | Purpose |
| --- | --- |
| `raw/chats/` | Auto-ingest from `memory/journal.jsonl` (+ rotated `journal-*.jsonl`) |
| `raw/meetings/` | Manual drop / future connector |
| `raw/docs/` | Manual drop (S7 auto-ingest later) |
| `raw/email/` | Manual drop / future connector |

Each raw chat item: `{id}.json` (immutable payload) + `{id}.meta.json` (metadata sidecar).

## Schemas

- `schema/raw-record.schema.json` — raw sidecar metadata
- `schema/curated-record.schema.json` — curated records
- `schema/categories.json` — enum of 10 categories
- `schema/examples/` — sample JSON

Required curated metadata: `source_ref[]`, `recorded_at`, `project` (nullable), `category`, `verification_status`, `lifecycle_status` (`current` \| `outdated` \| `superseded`).

## CEO-locked policy (2026-11-20)

| Topic | Decision |
| --- | --- |
| KB root | `company-workspace/knowledge/` |
| Meetings | Drop folder `raw/meetings/`; connector **disconnected** until CEO picks source |
| Email | **disconnected**; CEO provides provider later |
| Verification | CEO verifies **Decisions**; PM may verify operational/project status |
| Decisions → `current` | Requires `verification_status: verified_ceo` |
| Digest cadence (ASSUMPTION) | On each CoS objective engagement + weekly template (Friday UTC) |
| Journal | Capture input only; never modified by ingest |

## Connector status

See `connectors.json`. Summary:

| Connector | Status | Ingest |
| --- | --- | --- |
| Chat journal | connected | `node ai-company/scripts/knowledge/kb.mjs ingest-journal` |
| Meetings | disconnected | Manual files → `raw/meetings/` |
| Email | disconnected | Manual files → `raw/email/` |
| Docs | manual | Drop → `raw/docs/` (S7) |

## CLI (`_tools/` + `ai-company/scripts/knowledge/kb.mjs`)

```bash
# From repo root
node ai-company/scripts/knowledge/kb.mjs ingest-journal
node ai-company/scripts/knowledge/kb.mjs curated create --title "..." --body "..." --category "Projects" --source-ref raw/chats/foo.meta.json
node ai-company/scripts/knowledge/kb.mjs queue list
node ai-company/scripts/knowledge/kb.mjs verify --id ID --as ceo --actor CEO
node ai-company/scripts/knowledge/kb.mjs context-pack --project chief-of-staff
node ai-company/scripts/knowledge/kb.mjs digest
node ai-company/scripts/knowledge/kb.mjs smoke
```

Implementation modules live in `knowledge/_tools/` (plain Node, no extra npm deps).

## Verification queue

- New curated defaults to `unverified`.
- **Decisions** new records use `lifecycle_status: outdated` until CEO verifies (then `current`).
- Transitions: `unverified` → `verified_ceo` \| `verified_pm` \| `rejected`.
- Supersede: old record `lifecycle_status: superseded`, `superseded_by` set; new record links `supersedes`.

## Context pack

`context_pack` separates verified facts, unverified drafts, and raw pointers. JSON snapshot: `index/context-pack-latest.json`. CoS / COO attach markdown from `kb.mjs context-pack` to `task` prompts.

## Intelligence digest (stub)

Template: `templates/intelligence-digest.md`. Generator: `kb.mjs digest` (cites `source_ref`; weekly job stub — ASSUMPTION Friday UTC).

## Not the journal

Session journal: `company-workspace/memory/`. Ingest is idempotent and read-only toward journal files.