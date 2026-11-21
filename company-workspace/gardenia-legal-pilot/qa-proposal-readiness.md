# QA plan — Gardenia Legal Contract Ops pilot package

**Reviewer:** DSSI QA  
**Date:** 2026-11-21  
**Scope:** Proposal and build readiness (no running application required)  
**Artifacts:** [product-brief.md](./product-brief.md), [tech-plan.md](./tech-plan.md), [design-brief.md](./design-brief.md), [proposal-copy.md](./proposal-copy.md), [proposal-one-pager.md](./proposal-one-pager.md), [finance-pilot-pricing.md](./finance-pilot-pricing.md)

---

## Scope under test

| Layer | What QA reviewed |
| --- | --- |
| **Product** | MVP scope (A/B/AI/R), acceptance criteria, success metrics, CEO decisions, out-of-scope |
| **Engineering** | AC traceability to milestones, guardrails, state machine, ACL, test approach |
| **Design** | Flows vs product/tech, wet-ink/AI UX, edge flows |
| **Marketing** | Claims table, one-pager, pursuit outline vs product |
| **Finance** | Packaged scope vs product, timeline, exclusions, pricing insert readiness |

**Out of scope for this review:** LEG-FORM-5 Word template fidelity, live SMTP, UAT execution, GBPI IT security questionnaire content.

---

## PM acceptance criteria ↔ tech plan mapping

| AC ID | Product intent (summary) | Tech plan anchor | Week (plan) | Mapping status |
| --- | --- | --- | ---: | --- |
| **AC-A1** | Intake + ID + receipt email ≤1 min | `POST /api/intakes`, Resend | W1 partial (stub OK), W2 full | **Mapped** |
| **AC-A2** | In Pool ≤5s; claim/assign | Pool APIs, `GET /api/pool` | W1 | **Mapped** |
| **AC-A3** | Illegal transition → error, no audit | State machine §3.3, `PATCH .../status` | W1 | **Mapped** |
| **AC-A4** | Requester timeline (last 10) without Legal login | `/request/status`, JWT token **ASSUMPTION** | W1 skeleton, W2 | **Ambiguous** — product says “without Legal login”; tech/design **recommend login-only**. AC literal may need waiver or public token route. |
| **AC-A5** | Custody → audit | `PATCH` matter custody | W2 | **Mapped** |
| **AC-B1** | Canonical record + latest artifact | `matters`, `artifacts` | W3 | **Mapped** |
| **AC-B2** | Dept ACL 403; manager portfolio | ACL §3.2, integration tests | W3 | **Mapped** |
| **AC-B3** | Near expiry list + digest | Expiry job, alerts | W3 list, W5 emails | **Mapped** (digest W5) |
| **AC-B4** | Search &lt;3s @ ≤500 rows | Search query params | W3 | **Mapped** |
| **AC-B5** | Import 50 rows + error report | `import_jobs`, CSV/XLSX | W5 | **Mapped** |
| **AC-AI1** | No hallucinated dates in summary | AI1 + post-validation | W6 | **Mapped** |
| **AC-AI2** | Missing expiry flags | Rules + digest | W6 | **Mapped** |
| **AC-AI3** | Empty search, no fabrication | NL → filters | W7 | **Mapped** (P3 / deferrable in crunch) |
| **AC-AI4** | Routing PDF fields match intake | AI4 prefill + PDF | W4 visual, W6 | **Mapped** |
| **AC-AI5** | Explicit click + disclaimer | On-demand highlights | W7 | **Mapped** (P3 / deferrable) |
| **AC-R1** | Flag OFF → PDF only, no digital input | Feature flag + PDF route | W4 | **Mapped** |
| **AC-R2** | Internal Review requires print issued | `printed_copy_issued_at` gate | W4 | **Mapped** |
| **AC-R3** | Flag ON staging → digital approvals | `digital-approval` 403 when OFF | W4 | **Mapped** |
| **AC-P1** | Champion sign-off form | Week 7 deliverable | W7 | **Mapped** (commercial, not week-1) |
| **AC-P2** | Gap memo ≥5 findings | Gap audit workstream (Finance pw) | Pre/during build | **Outside code plan** — delivery obligation |
| **AC-P3** | Demo ≤25 min | Rehearsal W8 | W8 | **Mapped** |

**Gaps**

1. **AC-A4 vs ACL:** Unresolved CEO decision (#4 product, #6 tech, #1 design). Proposal must not promise “no login” if build uses login-only without token link.
2. **On Hold + hold reason:** Design requires requester-visible hold note; product AC set does not test it — add AC or document as design-only v1.
3. **AC-B3 vs product B4:** 60-day record in “Near expiry” in AC-B3; alert thresholds 90/30/7 in B4 — consistent with ≤90d bucket but weekly digest content for 60d-only cases should be explicit in UAT script.
4. **4-week crunch:** Tech plan defers AI3, AI5, import to hypercare; finance “aggressive” pw (11.75) still assumes full A+B+AI+R — **schedule/risk mismatch** if sales promises full demo path in week 2.

---

## Marketing claims vs product

| Claim / copy | Source | Product support | QA verdict |
| --- | --- | --- | --- |
| Not CLM; GDocs + wet-ink preserved | proposal-copy, one-pager | Out of scope + R1–R2 | **PASS** |
| Assistive AI only; no auto-approval | All proposal docs | AI guardrails + AC-AI* | **PASS** |
| Digital routing off in production pilot | FAQ, proposal-copy | `digitalRoutingSlipEnabled` default OFF | **PASS** |
| “Requester status without Legal login” | proposal-copy key message #1 | AC-A4 literal vs tech **login-only** | **FAIL until aligned** — use “without asking Legal to email updates” or confirm token URL |
| “30% faster” / “70% self-serve” | proposal-copy claims table | Marked ASSUMPTION / not guaranteed | **PASS** if cited as pilot metrics only |
| One-pager: “demo in **~2 weeks**: intake → pool → **print routing → expiry → search**” | proposal-one-pager § How we proceed | Tech W2 = visibility/email; **print W4**; search/expiry W3 | **OVERCLAIM** — week-2 credible slice is intake → pool → assign → timeline; not full AC-P3 |
| “One system of record” | one-pager promise | Product: parallel Excel 2 weeks + import bootstrap | **CONDITIONAL** — qualify “for pilot cohort matters” |
| Hosting / SSO specifics | one-pager FAQ “per GBPI IT” | NEEDS CEO/IT | **PASS** (appropriately deferred) |
| Pricing on external one-pager | one-pager footer | Finance PHP 1.55M **NEEDS CEO** | **PASS** (deferred to SOW) |
| Entity/workbook filenames in materials | proposal-copy CEO #1 | Evidence index names real files | **CONDITIONAL** — CEO anonymization decision |

**proposal-copy.md** “Claims product can support” table is strong control; **proposal-one-pager.md** timeline line is the highest-risk external overclaim.

---

## Finance scope vs product

| Finance line / assumption | Product scope | Match |
| --- | --- | --- |
| A + B + light AI + R | product-brief must-haves | **YES** |
| ≤8 users, 1–2 entities, 2–3 depts, ≤500 matters | product assumptions | **YES** |
| 4–8 wk build + 2–4 wk hypercare + readout | product duration | **YES** |
| Gap audit (≥5 findings) | AC-P2 | **YES** |
| Import one sheet ≤200 rows | B6 | **YES** |
| 2 training sessions | product handoff | **YES** |
| Excludes case trackers, GDocs API, SSO (add-on) | out of scope | **YES** |
| Person-weeks 15.5 base vs tech 8 wk calendar | Reasonable | **YES** with crunch risk |
| PHP 1.55M includes full MVP | Maps to P0–P2 build order | **YES** — margin tight if conservative 20 pw + IT migration |
| Phase 2 “from PHP 1.2M” appendix only | product “later” | **YES** |
| VAT 12% | Not in customer one-pager | **NEEDS CEO** before signed PDF |

**Mismatch:** Finance aggressive scenario (4–5 wk) does not automatically reduce **sold** scope; SOW must echo product exclusions and optional deferral of AI3/AI5/import per tech crunch path.

---

## Wet-ink and AI guardrails consistency

| Topic | Product | Tech | Design | Proposal |
| --- | --- | --- | --- | --- |
| Print-first LEG-FORM-5 | R1–R2 P1 | React-PDF, gate on Internal Review | Print gate callout, wet blocks | FAQ + headline | **Consistent** |
| Digital routing default OFF | R3 flag | `digitalRoutingSlipEnabled`, 403 when OFF | Hidden UI unless flag | “off by default” | **Consistent** |
| Demo env digital ON | CEO recommend off prod, on demo | `dssi-demo` ON | Staging banner | Optional in FAQ | **Consistent** — train sales not to confuse tenants |
| AI no status mutation | Light AI guardrail | No tool writes status | Explicit click; kill switch | Assistive only | **Consistent** |
| AI5 doc text | On explicit request; indexing NEEDS CEO | In-memory parse, no index default | Button + disclaimer | Metadata-only default in FAQ | **Consistent** |
| Disclaimers | UI disclaimers | API `disclaimer` field | Fixed strings Appendix B | Objection FAQ | **Consistent** |
| “No legal advice” | Throughout | Prompt constraints | Assistive panel | Throughout | **Consistent** |

**Minor tension:** product AI3 “unless CEO approves doc text indexing”; tech default OFF for full-text — aligned. If Execom demo shows AI5 on PDF, counsel/policy should be decided **before manager demo**, not only before prod.

---

## Scenarios

| ID | Type | Steps | Expected |
| --- | --- | --- | --- |
| S1 | Happy — proposal accuracy | Paralegal reads one-pager + FAQ | No CLM/AI-replacement; wet-ink primary; pilot footprint labeled ASSUMPTION |
| S2 | Happy — scope boundary | Champion asks about labor case tracker | Deferred to gap backlog; not in pilot fee |
| S3 | Happy — demo narrative | Run proposal-copy demo script mentally against tech weeks | All steps exist in scope by W8; **not all by W2** |
| S4 | AC trace | Engineer uses tech plan week 1 exit | Fake submit + assign in preview — **AC-A2, partial A1** |
| S5 | Commercial | Finance SOW line items vs product outputs | Audit + MVP + hypercare + readout; no SSO unless add-on |
| S6 | Claims audit | Compare one-pager “2 weeks” to tech milestone table | Marketing accepts correction or footnote “vertical slice” vs “full demo path” |

---

## Edge & failure cases

| Area | Edge / failure | Package coverage | Risk if unaddressed |
| --- | --- | --- | --- |
| **Requester access** | Magic link vs Google login | Documented NEEDS CEO | Wrong promise in proposal; ACL bugs |
| **Parallel Excel** | Champion keeps shadow sheet | Mitigation in product/tech | Dual truth; metrics invalid |
| **Print gate bypass** | API called without print date | AC-R2, state machine | Legal distrust |
| **Import** | 50 rows OK but 50 silent drops | AC-B5 negative test | Data loss |
| **ACL** | Cross-dept matter ID guess (IDOR) | Tech security checklist | **Critical** privacy |
| **Email** | GBPI filters block Resend | Tech risk table | AC-A1 fail |
| **AI** | Summary invents date | AC-AI1 + validator | Compliance incident |
| **Demo vs prod** | Digital routing ON in sales demo | Env table | Champion expects digital in pilot |
| **On Hold** | No reason text | Design only | Requester confusion |
| **Hosting** | PH residency veto Vercel | CEO #3, Finance add-on | Build blocked at W8 cutover |
| **VAT / MSA** | Procurement stall | Finance UNKNOWN | Signature delay |
| **Anonymization** | Client names in proposal | Marketing CEO #1 | Relationship / confidentiality |
| **4-wk crunch** | Sold full AI + import | Tech deferral path | SOW breach / margin |

---

## Quality gates

### Gate A — Send proposal + one-pager to senior paralegal

| # | Gate | Pass criterion |
| --- | --- | --- |
| A1 | Scope parity | One-pager + email copy match product must-haves and explicit exclusions (case trackers, CLM, rankings) |
| A2 | No material overclaims | Fix or footnote **~2 week demo** line; align requester visibility wording with AC-A4 decision or soft language |
| A3 | Pilot footprint | Entities/depts/user cap marked **confirm with champion** (already on one-pager) |
| A4 | Wet-ink / AI | FAQ matches product guardrails (print gate, assistive AI, digital off) |
| A5 | Commercial deferral | No list price on one-pager until CEO picks PHP tier; reference “formal proposal / SOW” |
| A6 | Evidence sensitivity | CEO approves use of workbook filenames / entity list or anonymize |
| A7 | Finance optional insert | If paralegal packet includes price: CEO approves **PHP 1,550,000** (or chosen tier) + VAT treatment |

### Gate B — Start week-1 build (tech plan §5 week 1)

| # | Gate | Pass criterion |
| --- | --- | --- |
| B1 | CEO build authorization | Tech plan §9 #7: approve scaffold repo + preview deploy |
| B2 | Stack default | Next.js + Postgres + Vercel/Neon **or** documented IT veto alternative |
| B3 | Auth v1 | Google OAuth + magic link **or** explicit SSO deferral with seed users |
| B4 | Requester model | Decision: login-only **or** magic-link status — documented for AC-A4 |
| B5 | Hosting path | At minimum **DSSI-hosted preview**; GBPI prod residency **not required for W1** but documented |
| B6 | Feature flags | `digitalRoutingSlipEnabled` OFF in `gbpi-pilot`; demo env strategy written |
| B7 | AI policy default | Metadata-only search; AI5 on-demand only; `AI_ENABLED` kill switch in plan |
| B8 | SOW / champion | **Conditional for prod data:** written champion interest or internal DSSI demo build OK without SOW; **prod GBPI data requires SOW + data handling** |
| B9 | LEG-FORM-5 | Word/template sample available to eng by W4 — not blocking W1 |
| B10 | Import tab | Not blocking W1; required before W5 import |

### Gate C — Execom / manager readout (post-pilot; package readiness)

| # | Gate | Pass criterion |
| --- | --- | --- |
| C1 | AC-P1 champion proceed Y/N | Captured |
| C2 | AC-P2 gap memo ≥5 findings | Delivered |
| C3 | AC-P3 demo ≤25 min | Rehearsed with pilot or seeded data |
| C4 | Success metrics | Leading/lagging metrics measured or marked insufficient n |
| C5 | IT production | GBPI IT sign-off if prod tenant used |
| C6 | Signed SOW + payment | Per Finance terms |
| C7 | AI / indexing | Any Execom-shown capability matches signed policy |

---

## Manual vs automated

| When build exists | Coverage |
| --- | --- |
| **Automated** | Vitest state machine, expiry math, ACL; Playwright AC-A1–A5, B2, R2 golden paths (per tech §7) |
| **Manual** | LEG-FORM-5 PDF visual vs Word; AI n=10 no invented dates; role matrix 403 screens; proposal/legal review of disclaimers |
| **This engagement (pre-build)** | Document traceability, claims audit, commercial-scope parity — **manual only** |

---

## Severity rubric

| Level | Definition | Example in this package |
| --- | --- | --- |
| **Critical** | Wrong legal/commercial promise or security posture | Requester “no login” promised but ACL requires account; IDOR undetected at pilot |
| **Major** | Blocks champion trust or SOW delivery | 2-week demo promises print+expiry+search; missing gap memo AC-P2 |
| **Minor** | Copy/clarity; fix before polish | On Hold reason not in AC; VAT footnote missing |
| **Info** | Assumption labeled | Pilot entity list ASSUMPTION |

---

## Release risks (proposal + delivery)

| Risk | Likelihood | Impact | Mitigation in package |
| --- | --- | --- | --- |
| Marketing timeline overclaim | High | Major — champion expects week-2 full demo | Edit one-pager; use “week-2 vertical slice” language |
| AC-A4 / login inconsistency | Medium | Major | CEO decision; sync proposal-copy proof line |
| IT hosting blocks prod | Medium | High | DSSI demo tenant; Finance add-on; early CEO outreach |
| Excel parallel run fails | High | Medium | Champion commitment in pursuit outline |
| Scope creep in pursuit | High | High | Backlog slide; Finance change-order card |
| Conservative delivery pw vs PHP 1.55M | Medium | Medium | Scope lock; crunch only with written deferrals |
| Demo digital routing confusion | Medium | Medium | Staging banner; training |
| Confidentiality in proposal | Low | Major | CEO anonymization |

---

## CEO blockers — before build vs before Execom

| Decision | Before week-1 build? | Before Execom / manager readout? | Notes |
| --- | --- | --- | --- |
| Approve week-1 scaffold + preview deploy | **Required** | — | Tech §9 #7 |
| Stack / auth v1 (OAuth + magic link vs SSO) | **Required** (defaults OK) | SSO if mandated | |
| Requester: login vs magic-link status (AC-A4) | **Required** before W2 requester UI | Confirm champion expectation | |
| Pilot entities / depts / champion alignment | Recommended W1; **required** before prod seed | **Required** for live pilot | Can use fake seed W1 |
| Hosting: DSSI demo vs GBPI prod + residency | Preview only W1; **required before GBPI prod data** | **Required** for production readout | |
| Digital routing: prod OFF, demo ON | **Required** (defaults) | Reconfirm | |
| AI PDF indexing / AI5 policy | Default off OK for build | **Required** if demo shows AI5 on contracts | Counsel |
| Import source Excel tab | Not W1 | **Required** before W5 / bootstrap demo credibility | |
| Proposal list price + VAT | Not for internal build; **required for signed SOW** | **Required** | Finance |
| Audit credit / payment terms | — | **Required** for signature | |
| Anonymize client filenames in external docs | **Before paralegal send** | — | Marketing CEO #1 |
| Brand line on customer materials | Before PDF proposal | Before Execom deck | |
| Case management expansion | — | Only if scope changes | Out of scope |
| Champion written proceed (AC-P1) | — | **Required** before Execom intro narrative | |
| Gap memo ≥5 findings (AC-P2) | Should start early | **Required** for readout | |
| GBPI IT security / MSA / insurance | Optional W1 | **Required** for prod + enterprise readout | |

---

## Go / no-go

### (1) Sending proposal + one-pager to senior paralegal

**Recommendation: CONDITIONAL GO**

| Status | Condition |
| --- | --- |
| **GO** | Send after **one editorial pass**: fix proposal-one-pager “~2 weeks” demo line to match tech (week-2 = intake/pool/assign/timeline; full AC-P3 path by week 4–8). Soften or align proposal-copy “without Legal login” to match AC-A4 decision (recommend: “status timeline without waiting on Legal email”). |
| **GO** | Wet-ink, AI, exclusions, and pilot footprint are proposal-safe as written. |
| **HOLD** | Do not attach **priced** PDF until CEO sets PHP tier + VAT. One-pager correctly defers pricing. |
| **HOLD** | Do not include confidential workbook filenames until CEO approves or anonymizes. |

**No-go if:** unchanged 2-week full-demo claim or guaranteed outcomes stated as facts.

---

### (2) Starting week-1 build

**Recommendation: CONDITIONAL GO**

| Status | Condition |
| --- | --- |
| **GO** | **DSSI internal / preview-only** scaffold (empty app, fake data, no GBPI production PII): after CEO approves tech plan week-1 exit and stack defaults; digital routing OFF; AI policy as documented. |
| **CONDITIONAL GO** | **Client-named pilot tenant with real intake:** requires champion verbal/written alignment on footprint, **plus** data-handling stance (DSSI-hosted preview acceptable to GBPI counsel/IT). |
| **NO-GO** | Production cutover, real contract attachments at scale, or SSO/on-prem **before** CEO hosting decision and IT path. |
| **NO-GO** | If pursuit sold **4-week full MVP** without SOW deferrals matching tech crunch table. |

---

## Decisions for CEO

1. **Send paralegal packet now?** QA: **yes, conditional** — fix one-pager week-2 demo wording + requester visibility line; resolve anonymization.  
2. **Start week-1 repo?** QA: **yes for DSSI preview build** once CEO signs tech plan §9 #7; gate GBPI prod data on IT + SOW.  
3. **AC-A4:** Choose login-only (simpler) vs magic-link status URL (literal AC); update proposal-copy before wide send.  
4. **Pricing in next email:** Approve PHP **1,550,000** ex-VAT (or other tier) per Finance before attaching commercial PDF.  
5. **Execom path:** Do not schedule Execom until AC-P1 + AC-P2 + measured metrics or explicit pilot n-too-small narrative.

---

## Summary matrix

| Gate | Verdict | Top blocker |
| --- | --- | --- |
| Proposal to senior paralegal | **Conditional GO** | One-pager demo timeline overclaim; AC-A4 copy |
| Week-1 build (preview) | **Conditional GO** | CEO approve scaffold; AC-A4 for W2 |
| Week-1 build (GBPI prod data) | **No-go** | SOW + hosting + IT |
| Execom readout | **Not ready (package OK as plan)** | Champion sign-off, gap memo, metrics, IT prod |

---

*QA — proposal and plan review only. Re-run Gate B integration testing when application scaffold exists.*