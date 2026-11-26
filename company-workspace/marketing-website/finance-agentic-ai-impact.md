# Agentic AI surface — finance impact brief (DSSI)

**Prepared by:** Finance  
**Scope:** Public launch of homepage agent section + `/agent` UI mock under **$5,000** cap; primary CTA unchanged (**Start an audit**); marketing claim allowed that an agent can answer anything about data it has (engineering ships mock only this pass).  
**Not legal/tax/audit advice.** Numbers are planning assumptions unless cited from repo.

---

## 1. Cost envelope breakdown ($5,000 cap)

| Line item | Conservative | Base | Aggressive | Notes / assumptions |
| --- | ---: | ---: | ---: | --- |
| **Build + design (labor opportunity cost)** | $2,800 | $3,500 | $4,200 | **ASSUMPTION:** 35–60 founder/contractor hours @ **$80/hr** blended (AI-assisted delivery lowers hours toward low end). Scope: copy, homepage section, `/agent` mock, nav, responsive polish, “demo” labeling, deploy. |
| **Hosting (12 mo)** | $0 | $240 | $600 | **ASSUMPTION:** Static Astro on free tier (0) vs paid hobby/pro ($20–50/mo) for custom domain + analytics. |
| **Domain + DNS** | $15 | $25 | $40 | **ASSUMPTION:** $15–25/yr registrar; premium DNS optional. |
| **Business email** | $0 | $84 | $252 | **ASSUMPTION:** Forwarding only (0) vs Google Workspace 1 seat × 12 mo ($7/mo). |
| **Tooling (design, analytics, forms)** | $0 | $150 | $400 | **ASSUMPTION:** Plausible Analytics/Umami (free), optional Figma assets, optional form backend if not mailto-only. |
| **Light paid launch (90 days)** | $0 | $500 | $1,500 | **ASSUMPTION:** Small LinkedIn/boost tests; **UNKNOWN** actual channel plan. |
| **Contingency / compliance copy review** | $0 | $200 | $500 | **ASSUMPTION:** Optional light legal review of “answer anything about the data it has” + demo disclaimer; **NEEDS CEO** if no counsel budgeted. |
| **Total (12 mo planning view)** | **$2,815** | **$4,699** | **$7,592** | Aggressive **exceeds $5k** unless launch spend or hours trimmed. |

**$5k envelope (recommended allocation for this pass)**

| Bucket | $ | % of cap |
| --- | ---: | ---: |
| Build + design (mock + messaging) | 3,500 | 70% |
| Hosting + domain + email (year 1) | 350 | 7% |
| Tooling | 150 | 3% |
| Light paid launch (initial test) | 500 | 10% |
| Contingency (copy/disclaimer polish) | 500 | 10% |
| **Total** | **5,000** | 100% |

**Opportunity cost note:** If labor is purely founder time with no cash outlay, **cash burn** may be **$650–$2,200** (infra + launch + tools) while **economic cost** still approaches **$3.5k–$5k** in forgone billable work.

---

## 2. Offer economics — audit → pilot / custom build

**Current funnel (from site copy):** Fit call → **Operational Gap Audit** (paid, fixed fee **UNKNOWN** on public site) → fixed-scope **pilot SOW** → warehouse/AI later.

**ASSUMPTION (pricing — not on site):** Audit **$7,500–$12,000**; pilot **$40,000–$120,000**; audit fee credits toward build when stated in SOW.

### How the agentic demo changes the offer

| Packaging option | Pros | Cons | Economics |
| --- | --- | --- | --- |
| **A. Narrative only (recommended this pass)** | Demo sets vision; audit scope unchanged; no delivery promise on mock | Some prospects expect live agent in audit | **No COGS change** on audit; same margin; demo is pure marketing |
| **B. “Agent readiness” bullet inside audit deliverable** | Justifies premium vs generic discovery | Adds 4–8h audit labor if you actually assess data/agent fit | **+ $400–$800** cost unless audit price raised **+ $1,500–$2,500** |
| **C. Agentic upsell after audit** | Clean separation; high-margin custom build | Longer sales cycle | New SKU: **$25k–$75k** scoped agent + data integration (**ASSUMPTION**) |
| **D. Include “pilot agent” in first build** | Strong close from demo excitement | Scope creep, support burden | Lowers pilot margin unless priced in |

**Primary CTA unchanged:** Demo should **increase qualified audit intent**, not replace audit. Message: *“This is what practical AI looks like after your data layer exists—start with the audit.”*

**Pricing impact summary:** Keep audit price **unchanged** for launch; use demo to improve **lead quality** and **pilot close rate**, not to discount audit.

---

## 3. Unit economics — mock phase vs future real agent

| Driver | UI mock (this pass) | Production agent (later) |
| --- | --- | --- |
| **Marginal cost per site visitor** | ~**$0** (static assets, client-side demo) | **UNKNOWN** traffic to live API if ever exposed publicly |
| **Marginal cost per “conversation”** | **$0** (scripted/canned responses) | **ASSUMPTION:** **$0.05–$0.80** per session (model + retrieval), higher with long context / tools |
| **Infra (monthly)** | **$0–$20** (static host) | **ASSUMPTION:** **$200–$2,000+** (compute, vector DB, observability, staging) |
| **Implementation COGS (one-time per client)** | **$0** (marketing only) | **ASSUMPTION:** **80–400 hrs** integration + governance (**$8k–$40k+** at studio rates) |
| **Ongoing cost-to-serve (per client / mo)** | **$0** | **ASSUMPTION:** **$500–$5,000/mo** (hosting, API, monitoring, light support) + eng fixes |
| **Revenue linkage** | Indirect (audit leads) | Direct (pilot/build + optional retainer **$2k–$8k/mo ASSUMPTION**) |
| **Gross margin (mock)** | ~**100%** on delivery (no variable COGS) | **UNKNOWN** until SKU priced; target **50–70%** on managed agent layer if productized |

**Plain formula (future):**  
`Contribution per client-month ≈ (Agent retainer + alloc. build margin) − (API + infra + support hours × rate)`  
Mock phase skips API/support COGS entirely.

---

## 4. Three scenarios — lead → audit conversion impact from demo

**Definitions (ASSUMPTIONS — no analytics baseline in repo):**

- **Lead** = meaningful inbound (fit call or audit request), not raw unique visitors.
- **Baseline conversion (no demo):** **lead → paid audit = 15%** (**ASSUMPTION**).
- **Baseline volume:** **8 leads / month** (**ASSUMPTION** — early-stage studio).
- **Audit gross revenue per win:** **$9,000** midpoint (**ASSUMPTION**).
- **Demo effect:** Changes **lead→audit** rate and optionally **leads/mo** via credibility/SEO.

| Driver | Conservative | Base | Aggressive |
| --- | --- | --- | --- |
| Leads / month | 8 (flat) | 10 (+25% from messaging/launch) | 14 (+75%) |
| Lead → paid audit | 16% (+1 pp) | 20% (+5 pp) | 28% (+13 pp) |
| **Paid audits / mo** | **1.28** | **2.0** | **3.92** |
| **Audit revenue / mo** | **~$11,500** | **~$18,000** | **~$35,300** |
| **Incremental vs no-demo baseline (1.2 audits/mo, ~$10,800)** | **~+$700/mo** | **~+$7,200/mo** | **~+$24,500/mo** |

**Payback on $5k spend (audit revenue only, ignoring pilot upside):**

| Scenario | Months to recover $5k (incremental audit $ only) |
| --- | ---: |
| Conservative | **~7+** (may not pay back in 90 days) |
| Base | **< 1** (if conversion holds) |
| Aggressive | **< 0.25** |

**Pilot upside (not in table):** **ASSUMPTION** 40% of audits → pilot @ **$60k** average → one incremental audit/month ≈ **$24k expected pilot revenue** over 6–12 months (highly uncertain).

---

## 5. Default-alive vs default-dead under $5k

**Framing:** DSSI is a **founder-led studio**; this initiative is a **bounded marketing/build spend**, not a standalone SaaS burn. **Runway from this line item alone:** N/A unless **cash** is drawn from operating balance.

| Test | Math | Call |
| --- | --- | --- |
| Cash outlay within cap | Planned **$650–$5,000** cash (depending on labor cash vs sweat) | **Survivable** at cap |
| Revenue to break even on **cash** launch ($1,150 w/o paid labor) | **$1,150 / $9,000 ≈ 0.13 audits** | **Default-alive** on cash |
| Revenue to break even on **full economic** $5k | **$5,000 / $9,000 ≈ 0.56 audits** | **Default-alive** if ≥1 audit in ~2–3 months |
| Conservative scenario payback | Incremental **~$700/mo** | **Borderline** in quarter one — **marketing still rational** if pilot pipeline improves |

**Default-dead would require:** Aggressive paid acquisition **without** conversion lift, **plus** legal/reputational cost from claim mismatch, **plus** second build to ship real agent before revenue — **not implied** if scope stays mock + clear labeling.

**Verdict:** Under **$5k cap** and **mock-only engineering**, project is **default-alive** for a studio model (**<1 audit** covers economic cost; **<0.2 audits** covers infra-only cash).

---

## 6. Recommendation — public launch of mock + strong claim

| Decision | **Conditional GO** |
| --- | --- |

**Go if (CEO/engineering/marketing alignment):**

1. **Demo is unmistakably labeled** (e.g., sample data, illustrative agent, not customer systems).
2. **Claim scoped in copy:** “Answer anything about **the data it has**” tied to **warehouse/ops data after integration**, not this static demo’s dataset presented as live client data.
3. **Primary CTA** remains **Start an audit** above the fold on `/agent` and homepage section.
4. **$5k guardrail:** No scope creep to real API/LLM this pass; paid launch ≤ **$500** until baseline conversion measured (**ASSUMPTION** 30–60 days).

**No-go if:**

- Public copy implies **production AI on prospect data** today.
- No bandwidth for **inbound** from launch (audit delivery backlog).
- **UNKNOWN** audit price on fit call — if audit is under **$5k**, economic payback math worsens (**NEEDS CEO** actual audit fee).

**Risks**

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Claim vs mock gap (trust/regulatory) | High | Scoped claim + demo disclaimer + “what we build after audit” |
| Scope creep to real agent | High | Finance cap; phase-2 budget gate |
| Low traffic (conversion lift irrelevant) | Medium | Light launch + outbound; measure 8–12 weeks |
| Poor-fit leads wanting cheap chatbot | Medium | Audit CTA + qualify on fit call |
| **UNKNOWN** baseline leads/conversion | Medium | Install analytics day 0 |

**UNKNOWN**

- Actual **audit fee**, **pilot close rate**, **monthly lead volume**, **CAC** by channel.
- Whether **domain/hosting** already paid elsewhere.
- **Legal** review budget and appetite for forward-looking AI claims.

**NEEDS CEO**

1. Confirm **audit list price** (or floor) for payback messaging internally.  
2. Approve **exact claim language** and demo disclaimer (conditional GO hinge).  
3. Cap **paid launch** spend for first 90 days (recommend **$500** inside $5k).  
4. Choose packaging **A vs B** for audit deliverable (recommend **A** this pass).

---

## 7. Decisions for CEO (summary)

1. **Audit price** for internal ROI tracking.  
2. **Sign-off on strong claim** with mock-only shipping.  
3. **Launch spend sub-cap** ($0 / $500 / other).  
4. **Phase-2 budget** for real agent (separate **$15k–$75k ASSUMPTION** — not part of this $5k).

---

*Saved path:* `company-workspace/marketing-website/finance-agentic-ai-impact.md`