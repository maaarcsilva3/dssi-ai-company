# Chief of Staff — Product brief

## Problem

The organization runs on fragmented context: session journal (`company-workspace/memory/journal.jsonl`) logs turns but does not produce structured, reusable knowledge. Decisions, tasks, and project status live in chat and ad-hoc deliverables. Other AI employees and the CEO lack a trusted, searchable two-layer memory (raw evidence + verified facts). A seventh platform employee—Chief of Staff (CoS)—does not exist; interim duties are folded into Product Manager, which overloads PM and does not give COO a delegate for capture, curation, or intelligence.

## User / JTBD

| User | Job to be done |
| --- | --- |
| **CEO** | When setting direction or reviewing work, quickly see what was decided, what is current, and what is at risk—without losing access to originals. |
| **COO** | When running objectives, delegate organizational memory work to a specialist instead of PM; ensure every role gets context before they guess. |
| **All AI employees (default consumers)** | Before and during work, retrieve verified context for their project/role; never treat a summary as the only source of truth. |
| **PM (verifier)** | Confirm operational/spec knowledge is accurate before other roles rely on it. |
| **CoS (new role)** | Continuously capture, structure, verify-queue, and surface organizational knowledge across the six v1 responsibilities. |

**Mission:** Capture, organize, understand, preserve, and retrieve everything important so CEO and AI employees always have the context they need—via structured knowledge, not transcript dumps.

## Success metrics

| Horizon | Metric |
| --- | --- |
| 30 days | CoS in roster, COO delegation map, and `task` routing; PM interim CoS text removed |
| 30 days | ≥1 path: journal/chat → raw → curated draft → PM or CEO verification → retrievable by another role |
| 30 days | 100% of curated records in QA sample carry required metadata + `source_ref` to immutable raw |
| 60–90 days | Auto-ingest for chats + docs; meetings/email per connectors |
| 90 days | Verification queue SLA-visible; Intelligence Analyst digest logged as deliverable |

## Scope

### Must-have (v1)

**A) Platform: Chief of Staff as 7th employee**

- Role id: `chief-of-staff` (ASSUMPTION)
- Subagent: `instructions.md` + `agent.ts` + `playbook-chief-of-staff`
- Wire: `ROLE_IDS`, `DEFAULT_ROSTER`, deliverables, `ceo.ts`, COO delegation map, `run-objective`
- Revert PM interim CoS overlay after ship

**B) Organizational knowledge system**

- Layer 1 — Raw evidence: immutable originals
- Layer 2 — Curated knowledge: always linked to `source_ref[]`; summaries never replace raw
- Categories: CEO Profile; Company Profile; Projects; Technical Knowledge; Decisions; Tasks & Commitments; People & Stakeholders; Lessons Learned; Ideas & Opportunities; Historical Events
- Metadata: source reference; date/time; related project; category; confidence/verification; lifecycle (`current` | `outdated` | `superseded`)
- Verifiers: CEO and PM
- Consumers: all AI employees by default
- Auto-ingest: chats, meetings, docs, email

**C) Six responsibilities**

1. Conversation Recorder
2. Meeting Secretary
3. Knowledge Manager
4. Decision Tracker
5. Executive Assistant (tasks/deadlines/follow-ups)
6. Intelligence Analyst

### Later

- CEO dashboard UI; fine-grained RBAC; cross-machine sync; automated supersession; calendar bot without CEO vendor choice

### Out of scope

- Replacing journal with KB
- Silent auto-verification
- Summary-only storage
- Budget/pricing for this brief

## Delivery slices (Impact / Effort)

| Slice | Contents | Sequence |
| --- | --- | --- |
| S1 | Role scaffolding | First |
| S2 | Knowledge storage + schemas | MVP |
| S3 | Chat auto-ingest (journal → raw) | MVP |
| S4 | Curated CRUD + source_ref + Decisions | MVP |
| S5 | Verification queue (PM + CEO) | MVP |
| S6 | Retrieve / context_pack | MVP |
| S7 | Doc auto-ingest | After MVP |
| S8 | Tasks & Commitments | After MVP |
| S9 | Intelligence digest | After MVP |
| S10 | Meeting + email connectors | NEEDS CEO systems |

ASSUMPTION: KB root `company-workspace/knowledge/` (`raw/`, `curated/`, `index`) — distinct from `memory/`.

## Acceptance criteria (summary)

- CoS is valid RoleId; COO delegates memory work to CoS
- Curated without `source_ref` fails; raw never overwritten by summary
- Retrieval returns raw + curated; metadata complete
- New curated defaults to unverified; PM/CEO verification transitions auditable
- Chat journal auto-ingests to raw; docs ingest or configurable; meeting/email live or explicit disconnected
- All six responsibilities covered in v1 (connectors may stub)

## Decisions for CEO

1. Meeting ingest source(s)
2. Email provider and mailbox scope
3. Confirm KB at `company-workspace/knowledge/` vs shared `company-data/`
4. Decisions: CEO-only verify vs PM allowed (ASSUMPTION: CEO for Decisions; PM for operational/project status)
5. Intelligence digest cadence
6. S10 stub OK with disconnected + manual upload to `raw/`?

## Handoffs

- **Engineer:** S1–S10 per sequence; schemas; ingest; verification; context_pack
- **Designer:** Optional — markdown templates for packs/digests if no UI
- **Marketer / Finance:** None
