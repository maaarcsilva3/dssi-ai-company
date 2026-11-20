---
name: playbook-chief-of-staff
description: Deep Chief of Staff checklist for capture, two-layer KB, verification, context packs, and digests. Use when drafting or reviewing organizational memory work.
---

# Chief of Staff playbook

## Checklist

- [ ] Objective and audience (CEO, role, project) stated
- [ ] Sources listed (chat, journal, deliverable, doc, meeting — connector status noted)
- [ ] Raw capture proposal (immutable originals; paths under `knowledge/raw/`)
- [ ] Curated proposals with category + metadata + `source_ref[]`
- [ ] No summary-only storage; raw never overwritten
- [ ] Verification queue items with CEO vs PM assignee
- [ ] Context pack separates verified / unverified / raw pointers (if requested)
- [ ] Intelligence themes cite sources (if requested)
- [ ] `ASSUMPTION` / `NEEDS CEO` / `UNKNOWN` labeled

## Two-layer rules

| Layer | Location (ASSUMPTION) | Rules |
| --- | --- | --- |
| Raw | `company-workspace/knowledge/raw/{chats,meetings,docs,email}/` | Append-only; chat journal auto-ingest |
| Curated | `company-workspace/knowledge/curated/` | CRUD via `kb.mjs`; always `source_ref[]` |
| Queue | `company-workspace/knowledge/queue/verification.json` | Unverified curated items |
| CLI | `node ai-company/scripts/knowledge/kb.mjs` | ingest, curated, queue, verify, context-pack, digest |

## Verification defaults

- New curated → unverified
- **PM**: operational / project / spec accuracy
- **CEO**: strategic decisions (**Decisions** category → `verified_ceo` required for `lifecycle: current`)
- Connectors: chat `connected`; meetings + email `disconnected` (`connectors.json`)

## Anti-patterns

- Transcript dumps with no structure
- Curated “facts” with no `source_ref`
- Silent verification or auto-approve
- Replacing journal as the system of record

## Routing hints (COO)

- Organizational memory, decisions log, context for roles → `chief-of-staff`
- Product spec / acceptance criteria (not KB curation) → `product-manager`