# Finance — GBPI Legal Contract Ops Pilot Pricing

**Client:** Gardenia Bakeries Philippines Inc. (GBPI) Legal Department  
**Package:** Operational Gap Audit + fixed-scope pilot MVP (thin A + B + light AI) + onboard ≤8 Legal users, 1–2 entities, 2–3 depts + 2–4 week hypercare + Legal Managers / Execom readout deck  
**Phase 2:** Multi-entity rollout priced separately (not in this envelope)  
**Currency:** PHP primary; USD equivalents use **FX ASSUMPTION 58.00 PHP/USD** (Nov 2026 planning rate — not a market quote)  
**Client budget band:** NONE (CEO delegated commercial framing)

---

## Finance brief

### Question

What **proposal price** and **commercial model** should DSSI quote for the GBPI Legal Contract Ops pilot (gap audit + 4–8 week build + hypercare + readout), given **UNKNOWN** Gardenia budget and **UNKNOWN** DSSI actual payroll — while keeping margin defensible and Phase 2 upsell credible?

### Known vs unknown

| Known (from product / tech brief) | Unknown |
| --- | --- |
| Scope: A + B + light AI; wet-ink routing; ≤500 matters; ≤8 users; 1–2 entities; 2–3 depts | Gardenia IT hosting / data residency decision (may add cost) |
| Timeline: 4–8 wk build + 2–4 wk hypercare before readout | Client willingness to pay; procurement process |
| Success path: paralegal champion → Legal Manager demo → Execom intro | DSSI fully loaded labor rates (payroll, benefits, subcontract) |
| Phase 2 = full multi-entity rollout — **excluded** from pilot fee | Scope creep (GDocs API, SSO, case trackers) |
| CEO: no budget band; Finance decides framing | OpenAI / email volume during pilot |
| Tech team assumption: ~1 FTE engineer + part-time design/QA over 6–8 wks | Whether build runs 4-wk crunch vs 8-wk full (affects cost) |

### Cost envelope (DSSI cost-to-serve)

All figures are **DSSI internal planning assumptions**, not audited costs.

#### People effort (person-weeks, pw)

| Workstream | Conservative (pw) | Base (pw) | Aggressive / crunch (pw) | Notes |
| --- | ---: | ---: | ---: | --- |
| Operational Gap Audit | 2.5 | 2.0 | 1.5 | Evidence memo, workflow map, ≥5 findings, backlog |
| Pilot MVP build (A+B+AI+R) | 8.0 | 6.0 | 4.5 | Tech plan weeks 1–7 + buffer |
| Design (flows, LEG-FORM-5 print UX) | 2.0 | 1.5 | 1.0 | Part-time overlay |
| Delivery / PM / client sync | 2.5 | 2.0 | 1.5 | Champion, paralegal, manager touchpoints |
| QA / UAT support | 2.0 | 1.5 | 1.0 | AC traceability, role matrix |
| Import + bootstrap support | 0.5 | 0.5 | 0.25 | One sheet, ≤200 rows |
| Training (2 sessions) + onboarding | 0.5 | 0.5 | 0.5 | ≤8 Legal + requesters |
| Hypercare (2–4 wk supervised use) | 2.0 | 1.5 | 1.0 | Triage, metrics, parallel Excel policy |
| Readout workshop + deck | 0.5 | 0.35 | 0.25 | Legal Managers / Execom |
| **Total person-weeks** | **20.0** | **15.5** | **11.75** | |

#### Loaded cost per person-week

**ASSUMPTION (blended internal team):** PHP **40,000 – 55,000 / pw**  
*(blend of senior engineer, designer, delivery; excludes pure pass-through software licenses)*

**Plain-language formula — labor cost:**

`Labor cost = Total person-weeks × Blended loaded rate (PHP/pw)`

| Scenario | pw | Rate (PHP/pw) | Labor cost (PHP) |
| --- | ---: | ---: | ---: |
| Conservative | 20.0 | 55,000 | **1,100,000** |
| Base | 15.5 | 47,500 | **736,250** |
| Aggressive | 11.75 | 40,000 | **470,000** |

#### Infrastructure & third-party (pilot duration ~3–4 months)

| Item | Monthly range (PHP) | Months | Total range (PHP) |
| --- | ---: | ---: | ---: |
| Vercel + Neon/Supabase + Blob | 2,500 – 8,000 | 3 | 7,500 – 24,000 |
| Resend / email | 500 – 2,000 | 3 | 1,500 – 6,000 |
| OpenAI (gpt-4o-mini, light AI) | 1,000 – 5,000 | 3 | 3,000 – 15,000 |
| Sentry / misc | 0 – 1,500 | 3 | 0 – 4,500 |
| **Infra subtotal** | | | **12,000 – 49,500** |

**ASSUMPTION:** Infra billed to DSSI during pilot; **pass-through to client optional** — recommend **included in fixed fee** for simplicity.

#### Contingency (delivery risk)

**ASSUMPTION:** 10% labor + 15% if GBPI IT forces non-default hosting or extended security review.

| Scenario | Contingency % | On labor + infra base (PHP) | Contingency (PHP) |
| --- | ---: | ---: | ---: |
| Conservative | 15% | 1,149,500 | **172,425** |
| Base | 10% | 748,250 | **74,825** |
| Aggressive | 5% | 482,000 | **24,100** |

#### Total cost-to-serve envelope

**Plain-language formula — total cost:**

`Total cost-to-serve = Labor + Infra + Contingency`

| Scenario | Labor | Infra (mid) | Contingency | **Total cost (PHP)** | **Total cost (USD @58)** |
| --- | ---: | ---: | ---: | ---: | ---: |
| **Conservative** | 1,100,000 | 30,000 | 172,425 | **~1,302,000** | **~22,450** |
| **Base** | 736,250 | 20,000 | 74,825 | **~831,000** | **~14,330** |
| **Aggressive** | 470,000 | 12,000 | 24,100 | **~506,000** | **~8,720** |

---

### Pricing options

| Option | Structure | Client experience | DSSI pros / cons |
| --- | --- | --- | --- |
| **A — Single fixed pilot fee** | One line: Audit + Build + Hypercare + Readout | Simple procurement; matches “pilot package” narrative | **Pros:** Clear scope ceiling, easy Execom story. **Cons:** Scope creep eats margin without change order discipline. |
| **B — Split: fixed audit + capped build** | Audit fixed; build T&M with **not-to-exceed (NTE)** | Transparency on build uncertainty | **Pros:** Protects DSSI if IT delays. **Cons:** Feels “consulting meter”; weaker for champion selling simplicity. |
| **C — Pilot + optional 90-day care extension** | Fixed pilot + separate monthly care retainer post-readout | Continuity hook to Phase 2 | **Pros:** Recurring revenue. **Cons:** Gardenia may defer until Execom funds rollout. |
| **D — Value / outcome-linked** | Fee tied to adoption metrics | Aligns incentives | **Cons:** Legal politics + UNKNOWN volumes; **not recommended** for first GBPI engagement. |

**Commercial framing (recommended narrative):**  
*“Operational Gap Audit with embedded Pilot MVP”* — **not** CLM license, **not** AI replacement. Fixed outcome: evidence-backed gap memo, working pilot tenant, trained cohort, metrics readout for Execom.

---

### Unit economics

**Plain-language formulas (proposal list price = P):**

| Metric | Formula | At **recommended P = PHP 1,550,000** |
| --- | --- | ---: |
| Gross margin % (vs base cost) | `(P − Base cost) ÷ P` | **(1,550,000 − 831,000) ÷ 1,550,000 ≈ 46%** |
| Margin vs conservative cost | `(P − Conservative cost) ÷ P` | **≈ 16%** (thin if delivery hits 20 pw) |
| Revenue per legal user onboarded | `P ÷ 8` | **PHP 193,750 / user** (~USD 3,340) |
| Revenue per pilot entity | `P ÷ 2` | **PHP 775,000 / entity** |
| Implied loaded rate to client | `P ÷ Base pw (15.5)` | **~PHP 100,000 / pw** (client-facing realization) |
| Break-even price (base cost, 0% margin) | `Base cost` | **PHP ~831,000** |
| Break-even price (conservative cost) | `Conservative cost` | **PHP ~1,302,000** |

**Contribution (pilot only):**  
`Contribution = P − Variable pass-through (infra) − Direct delivery cost`  
At recommended price and base delivery: contribution **~PHP 700k+** before fixed overhead (office, management, sales time) — **UNKNOWN** DSSI fixed overhead allocation.

**Phase 2 (indicative, not in proposal):**  
**ASSUMPTION** rollout pricing = **per-entity pack** PHP 450,000 – 750,000 (import, ACL, training) + optional annual care PHP 15,000 – 35,000 / month — **needs rescoping after pilot data**.

---

### Scenarios

| Driver | Conservative | Base | Aggressive |
| --- | --- | --- | --- |
| **Delivery duration** | 8 wk build + 4 wk hypercare | 6 wk build + 3 wk hypercare | 4 wk build + 2 wk hypercare |
| **Person-weeks** | 20.0 | 15.5 | 11.75 |
| **DSSI cost-to-serve** | ~PHP 1.30M | ~PHP 0.83M | ~PHP 0.51M |
| **Proposed list price (fixed fee)** | PHP 1,850,000 | **PHP 1,550,000** | PHP 1,150,000 |
| **Implied gross margin on actual cost** | ~30% | ~46% | ~56% |
| **USD equivalent @58** | ~USD 31,900 | **~USD 26,700** | ~USD 19,800 |
| **Win probability (qualitative)** | Lower (sticker shock) | Balanced | Higher; margin risk if scope expands |
| **Phase 2 attach narrative** | Premium positions rollout | Standard enterprise pilot | May underprice strategic logo |

**Optional add-ons (priced separately in SOW):**

| Add-on | ASSUMPTION price (PHP) |
| --- | ---: |
| GBPI on-prem / dedicated VPC setup | 150,000 – 400,000 |
| SAML SSO integration | 120,000 – 250,000 |
| Full PDF corpus indexing for AI5 | 80,000 – 180,000 |
| Extra entity beyond 2 in pilot | 175,000 – 275,000 / entity |
| 90-day post-readout hypercare extension | 280,000 – 420,000 flat |

---

### Default-alive / default-dead

**Definitions (this engagement only):**

- **Default-dead on pilot:** Quoted price **below conservative cost-to-serve** (~PHP 1.30M) **or** delivery expands beyond **22 pw** without change order → DSSI loses cash on delivery and delays other revenue.

| Proposal price | vs Base cost (~831k) | vs Conservative cost (~1.30M) | Verdict |
| --- | --- | --- | --- |
| PHP 1,150,000 | Positive margin if aggressive delivery | **Underwater ~PHP 150k** | **Conditional** — only if 4–5 wk crunch + strict scope |
| PHP 1,550,000 (recommended) | ~46% gross margin | ~16% gross margin | **Default-alive** if base delivery; tight if conservative |
| PHP 1,850,000 | Healthy | ~30% margin | **Default-alive**; harder commercial win |

- **Default-alive (DSSI company level):** **UNKNOWN** without DSSI monthly burn and pipeline. **Qualitative:** One pilot at PHP 1.55M with ~PHP 700k+ contribution is **default-alive** for a boutique delivery shop **if** no other concurrent full builds and team is mostly founder/employee (not 3 parallel FTE hires). If this pilot requires **exclusive 2 FTE for 3 months**, CEO must confirm opportunity cost.

---

### Recommendation

**Go — conditional** on proposal discipline.

1. **Pricing model:** **Option A — single fixed fee** with explicit exclusions (case trackers, GDocs API, SSO, extra entities) and a **written change-order rate card** (PHP 12,000 – 15,000 / day or PHP 60,000 – 75,000 / pw).
2. **Recommended proposal list price:** **PHP 1,550,000** (USD **~26,700** @ 58) — includes gap audit, MVP build, import support for one sheet, 2 training sessions, 3-week hypercare (mid), readout deck + workshop.
3. **Commercial packaging on SOW:**
   - **Line 1:** Operational Gap Audit — PHP 350,000 (non-refundable after memo delivery; crediting logic optional ASSUMPTION: 100% credited to pilot if they proceed within 60 days — **CEO choice**).
   - **Line 2:** Pilot MVP Implementation — PHP 950,000.
   - **Line 3:** Hypercare & Success Readout — PHP 250,000.
   - **Total:** PHP 1,550,000 (presentation only; single signature amount).
4. **Floor (walk-away):** **PHP 1,250,000** — only if 6-week scope lock, digital routing OFF prod, no IT-driven hosting migration in pilot, and champion signs parallel-run policy week 1.
5. **Stretch:** **PHP 1,850,000** if GBPI requires dedicated security questionnaire, custom domain, or on-prem connectivity in pilot window.
6. **Phase 2:** Quote **“from PHP 1.2M”** multi-entity rollout in appendix only — **no number in main pilot page** until Execom meeting.

**Payment terms ASSUMPTION:** 40% on SOW signature / 40% on UAT start / 20% on readout delivery (net 30).

---

### Risks

| Risk | Financial impact |
| --- | --- |
| Delivery runs 8 wk + 4 wk hypercare (conservative pw) | Margin compresses toward **16%** at PHP 1.55M; may need change order |
| GBPI IT blocks Vercel → Azure PH / private link | +PHP 150k–400k cost; must be additive SOW |
| Scope creep (case management, rankings, GDocs sync) | Unbounded pw; enforce backlog + CO |
| Champion does not sign proceed → no Phase 2 | Pilot contribution still positive if price ≥ PHP 1.25M and base delivery |
| AI5 full indexing approved mid-pilot | +PHP 80k–180k; exclude unless add-on signed |
| FX drift on USD discussion | Re-quote USD using spot at signature |
| **UNKNOWN** DSSI true payroll above PHP 55k/pw | Break-even list price rises toward **PHP 1.0–1.1M** minimum |

### UNKNOWN (gather before final PDF proposal)

1. DSSI actual blended loaded rate (finance/payroll).  
2. Whether Gardenia expects **VAT-inclusive** pricing (12% VAT ASSUMPTION in PH B2B — clarify gross vs net).  
3. Exclusive engineer allocation vs bench sharing.  
4. Gardenia procurement: PO threshold, MSA requirement, insurance.  
5. Pass-through AI caps: include **PHP 15k/mo** LLM ceiling in SOW or unlimited at DSSI risk.

---

### Decisions for CEO

| # | Decision | Finance recommendation |
| --- | --- | --- |
| 1 | **Proposal list price** | **PHP 1,550,000** fixed (USD ~26.7k indicative) |
| 2 | **Floor / walk-away** | **PHP 1,250,000** with strict scope + schedule |
| 3 | **Model** | Single fixed fee (Option A), not T&M |
| 4 | **Audit credit** | Offer memo standalone at PHP 350k credited to pilot if proceed ≤60d — **optional sales lever** |
| 5 | **Phase 2 in proposal** | Appendix “indicative from PHP 1.2M” only |
| 6 | **VAT** | State whether quoted PHP is **exclusive of 12% VAT** |
| 7 | **Change orders** | Pre-publish rate card in SOW annex |
| 8 | **Go/no-go to send proposal** | **GO** at PHP 1.55M if scope exclusions signed in brief; **CONDITIONAL GO** at PHP 1.25–1.4M only with delivery cap in contract |

---

*Planning support only — not tax, legal, or audited financial advice.*