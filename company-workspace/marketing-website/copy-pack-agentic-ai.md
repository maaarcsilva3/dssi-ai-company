# DSSI agentic AI — launch copy pack

**Status:** Public-launch ready messaging (paste into Astro pages).  
**Primary CTA (unchanged):** Start an audit → `/audit`  
**Secondary CTA:** Try the data agent demo → `/agent`  
**CEO-approved capability phrase:** Your team can **ask anything about the data it has** (with guardrails copy on site).

**Audience ASSUMPTION:** Ops and finance leaders at mid-market organizations (roughly $20M–$500M revenue) where day-to-day operations create data; they are evaluating whether the Operational Gap Audit is worth it before a custom build.

---

## Positioning (agentic AI in the DSSI story)

DSSI is **not** selling a standalone AI product. The path stays:

1. **Operational Gap Audit** — name the #1 fix and success metric.  
2. **Custom systems** — software people use daily; data stops leaking in spreadsheets.  
3. **Data warehouse** — one trustworthy layer for reporting.  
4. **Agentic AI** — natural-language access to **your** operational context (warehouse + connected tools), with scope, logging, and escalation defined in the engagement.

**Agentic AI strengthens the audit story** by making the *destination* tangible without skipping steps. Prospects see what “warehouse, then AI” looks like on a distributor-style dataset; the audit still answers “where does your data break today, and what’s the smallest build that fixes it?”

**Positioning statement (internal):**  
For ops and finance leaders tired of exporting spreadsheets to trust a number, DSSI is a founder-led software studio that closes operational gaps with custom systems—then connects agentic AI to the warehouse so teams can ask anything about the data they already have. Unlike generic chatbots or ERP add-ons, our agent is scoped to your data boundary after trustworthy operations data exists; the Operational Gap Audit is still the front door.

---

## 3 key messages + proof points

| # | Message | Proof points (honest) |
|---|---------|------------------------|
| 1 | **AI follows the process, not the other way around.** | Site and audit deliverable already state: gap → build → warehouse → AI. Audit includes “Data & AI readiness view,” not a premature AI pitch. |
| 2 | **Ask operational questions in plain language—on data you control.** | CEO-approved phrasing. Demo shows shipments, fill rate, exceptions, trends on fictional **Northline Supply Co.** data. |
| 3 | **Guardrails are part of the product, not a footnote.** | Copy: agent reasons over connected context, not the open internet; access, logging, escalation scoped per engagement. **NEEDS CEO:** whether to name specific models, hosting, or compliance frameworks on the public site. |

---

# 1. Homepage — agentic AI section (paste-ready)

**Placement:** After “What we do” (Step 3: Warehouse, then AI) or before “Who we work with.”  
**Section eyebrow:** After the warehouse

### Headline
**Agentic AI on your operational data**

### Supporting sentence
Once daily work lives in trustworthy systems, we connect a **data agent** to the warehouse and tools you already use. Your team can **ask anything about the data it has**—shipments, exceptions, fill rate, trends—without exporting five spreadsheets.

### Secondary supporting line (guardrails)
The agent reasons over **your connected context**, not the open internet. We scope access, logging, and escalation with you—not a black box.

### Bullets / proof (homepage)
- **Operational questions, not SQL:** Late shipments by customer, fill rate by site, open exceptions above a dollar threshold, days-to-ship trends.  
- **Grounded in the same path we sell:** Custom system → warehouse → agent—not a chatbot bolted onto a broken process.  
- **Transparent demo:** Interactive preview uses sample distributor data; no API keys on this site.

### CTAs
- **Primary (demo):** Try the interactive demo → `/agent`  
- **Primary offer (audit):** Start an audit → `/audit`  

### Preview card microcopy (static teaser beside section)
- **Label:** Preview  
- **You:** Which customers had the most late shipments last month?  
- **Agent:** Apex Industrial led with 47 late lines—mostly warehouse B pick backlog…  
- **Footnote:** Demo uses sample distributor data. No API keys on this site.

---

# 2. `/agent` page (paste-ready)

**Meta title:** Data agent demo | DSSI  
**Meta description:** Try a thin interactive demo: ask questions about sample operational data—shipments, fill rate, exceptions—see how agentic AI fits after warehouse and custom systems. Start with an Operational Gap Audit when you're ready.

---

## Hero

**Eyebrow:** Practical AI layer  
**H1:** Ask anything about the data you have  
**Subtitle:** This demo shows how a DSSI **data agent** answers operational questions over a **connected warehouse**—sample data from a regional distributor. It’s a preview of step four on our path, not a replacement for fixing the process first.

**CTAs**
- **Primary:** Start an audit → `/audit`  
- **Secondary:** Try a suggested question (scroll to demo)

**Trust line (below CTAs):** Fictional company **Northline Supply Co.** · Demo answers are scripted from sample tables · No live customer data

---

## How it works (4 steps)

**Section title:** How the agent fits your stack

1. **Operational Gap Audit** — Map where data and trust break; agree the #1 fix and metric.  
2. **Custom system** — Capture work where it happens so events are consistent enough to warehouse.  
3. **Warehouse** — Consolidate orders, shipments, inventory, exceptions into tables leadership can reconcile.  
4. **Data agent** — Natural-language Q&A over that context, with permissions and audit logging defined in scope.

**Bridge sentence:** If you’re not there yet, that’s normal—**the audit is how we decide what to build first.**

---

## Demo chrome labels (for eng UI)

Use these labels verbatim where possible.

| UI element | Label copy |
|------------|------------|
| Page section title | Interactive demo |
| Context panel title | Connected context (demo) |
| Organization | Northline Supply Co. (demo) |
| As of | November 2025 |
| Sources subhead | Data sources |
| Datasets subhead | Warehouse tables |
| Chat input placeholder | Ask about shipments, fill rate, exceptions, inventory… |
| Submit button | Ask |
| Suggested prompts label | Try a question |
| Disconnected / fallback state | I only answer from the connected demo datasets. Try a suggested prompt. |
| Footer of demo panel | **Demo only:** keyword-matched sample answers. A production agent uses your warehouse and tool APIs with your access rules. |
| Sidebar note | No API keys on this site · No data leaves your browser in production—we scope that in the engagement |

### Connected context — sources (match `agentDemo.ts`)
- Operations app (DSSI-built) — synced — 142k events  
- ERP orders & invoices — synced — 38k rows  
- Warehouse WMS — synced — 12k SKUs  
- Carrier tracking feed — synced — 6k shipments  

### Connected context — datasets
- `fact_shipments` — shipment line — refreshed 2h ago  
- `fact_orders` — order line — refreshed 4h ago  
- `dim_customers` — customer — refreshed daily  
- `dim_products` — SKU — refreshed daily  
- `ops_exceptions` — exception event — refreshed 15m ago  

### Suggested prompt chips
- Which customers had the most late shipments last month?  
- What is our fill rate for warehouse B?  
- Show open exceptions over $5k impact.  
- How did average days-to-ship trend in Q3?  

---

## Sample Q&A pairs (demo script — eng `matchDemoAnswer`)

Use for QA, sales talk tracks, and regression tests on the thin mock.

### Q1: Late shipments
**User:** Which customers had the most late shipments last month?  
**Agent:** In October, the top accounts by late shipment lines were: **Apex Industrial** (47 late lines, 18% of their volume), **Riverbend Medical** (31), and **Coastal HVAC** (28). Most delays tied to **warehouse B pick backlog** and **carrier handoff after 4pm**. I can break this down by SKU family if you want.

### Q2: Fill rate
**User:** What is our fill rate for warehouse B?  
**Agent:** **Warehouse B** fill rate (lines shipped complete on first attempt) was **91.2%** last 30 days, down from 93.8% the prior month. The biggest drag is **fasteners & hardware** (86.4%) due to cycle-count variance on aisle F12–F18.

### Q3: Exceptions
**User:** Show open exceptions over $5k impact.  
**Agent:** There are **9 open ops exceptions** with estimated impact above **$5,000**: 4 are **duplicate invoice** mismatches, 3 are **short-ship** disputes awaiting customer reply, 2 are **freight charge** variances. Oldest is **12 days** (order ORD-88412). Want the owner list?

### Q4: Days to ship trend
**User:** How did average days-to-ship trend in Q3?  
**Agent:** Average **order-to-ship days** in Q3: **Jul 2.8**, **Aug 3.1**, **Sep 2.6** (warehouse-weighted). The August spike matches the **WMS outage window (Aug 9–12)**; excluding that week, August would be **2.7**.

### Q5 (bonus script — inventory / revenue)
**User:** What SKUs are below safety stock with backorders?  
**Agent:** **38 SKUs** are below safety stock today; **11** are on customer backorder. Highest revenue-at-risk SKU is **PN-4402** (industrial pump seal kit) — **$42k** open order value waiting on replenishment ETA **Nov 28**.

**User:** What are our top product families by revenue?  
**Agent:** Trailing 90-day **net product revenue** (excludes freight): top SKU families are **Pumps & motors** ($1.42M), **Electrical** ($1.18M), **HVAC controls** ($0.96M). This is from `fact_orders` joined to `dim_products`.

### Fallback (unmatched question)
**Agent:** I only answer from the **connected demo datasets** (shipments, orders, customers, products, ops exceptions). Try one of the suggested prompts, or ask about late shipments, fill rate, exceptions, inventory, or days-to-ship trends.

---

## FAQ (objections) — `/agent` page

**Is this a product I can buy today?**  
No. It’s a **capability we deliver after** a custom operational foundation and warehouse—not a self-serve SaaS. The demo is illustrative.

**Does “ask anything” mean any question on the internet?**  
No. It means **anything answerable from the operational data the agent is connected to**—with permissions and logging. This site’s demo uses **fixed sample tables** and **scripted matching**, not a live model.

**Why start with an audit instead of jumping to AI?**  
Because bad process produces bad data. The **Operational Gap Audit** finds the #1 fix and metric; without that, an agent would confidently summarize noise.

**How is this different from ChatGPT or Copilot?**  
Those are general tools. We scope a **data boundary** (your warehouse and agreed sources), **operational semantics** (what a “late line” means in your business), and **escalation** when the agent shouldn’t guess.

**What about security and compliance?**  
Production design includes access control and audit logging; specifics depend on your stack. **NEEDS CEO:** whether to publish a one-line SOC2/HIPAA stance or keep “discuss in audit.”

**You have no customer logos—why trust this?**  
Same as the rest of the site: we show a **written gap brief and fixed pilot scope** instead of invented social proof. The demo is **clearly labeled fiction**.

---

## Final CTA band (`/agent` bottom)

**Headline:** See the gap before you scale the agent.  
**Body:** Book a fit call or start the **Operational Gap Audit**. We’ll map one critical process, name the #1 fix, and outline when warehouse and agentic AI are worth it—without a premature AI pitch.  
**Primary button:** Start an audit → `/audit`  
**Secondary link:** How we work → `/how-we-work`

---

# 3. Claims matrix

| Claim | Say on site? | Eng mock supports? | NEEDS CEO / other |
|-------|--------------|-------------------|-------------------|
| “Ask anything **about the data it has**” | **Yes** (CEO approved) | **Partially** — demo only answers within scripted datasets + keyword match; must disclose “demo only” | CEO: OK to use on homepage without “in production” qualifier in headline, if body/disclaimer carry it |
| Natural-language Q&A on warehouse ops data | Yes | Yes — 4 primary + 2 bonus scripted Q&As | — |
| Agent uses shipments, orders, exceptions, inventory examples | Yes | Yes — `agentDemo.ts` | — |
| Guardrails: data boundary, no open internet | Yes | **Narrative only** — mock has no network | Eng/CEO: production architecture one-pager for sales (not necessarily public) |
| Access control, logging, escalation in scope | Yes | Not demonstrable in mock | CEO: confirm public wording |
| “Agentic” / autonomous multi-step tool use | Use **sparingly**; prefer “data agent” | **No** — mock is single-turn Q&A | Do not claim autonomous agents or tool-chaining on site until built |
| Real-time refresh (“2h ago”) | Yes in demo chrome | Static labels only | Label as demo UI, not live sync |
| DSSI-built operations app in source list | Yes in demo fiction | Yes | — |
| Faster than “export five spreadsheets” | Yes (brand voice) | Implied by demo | Avoid quantified “X hours saved” without case study |
| Audit fee credits toward build | Yes (existing audit page) | N/A | CEO: confirm credit policy still accurate |
| SOC2 / HIPAA / “enterprise-ready” | **No** unless true | No | **NEEDS CEO** |
| Customer logos / “teams like yours” | **No** — site already disclaims | No | — |
| Pricing for AI layer | **No** on marketing site | No | **NEEDS CEO** — or “scoped in pilot SOW” only |
| Live LLM on marketing site | **No** | Mock is local keyword match | Do not imply GPT calls in browser without eng |

---

# 4. Channel plan ($5k-aware, finance-aligned)

**Principle:** Organic and owned media first; one capped paid test; no invented CAC or logo claims.

### Why these channels

| Channel | Role | Rough spend (ASSUMPTION) |
|---------|------|-------------------------|
| **Owned site + SEO** | Launch surface; `/agent` for shareable demo link | $0 marginal |
| **Founder LinkedIn** | Reach ops/finance leaders; story = audit first, demo second | $0 |
| **Email to warm network** | CEO/founder personal list; fit-call and audit CTA | $0 |
| **Light LinkedIn ads** | Retarget site visitors + narrow job-title test | **$1,500–2,000** of $5k |
| **Google Search (branded + problem)** | Capture “operational gap / custom ops software” intent | **$800–1,200** |
| **Creative / landing polish** | OG image for `/agent`, one short screen capture for social | **$300–500** (design contractor or tool) |
| **Reserve** | A/B headline test or one industry micro-landing | **$1,000–1,500** buffer |

**Total:** Stays at or under **$5k** with finance sign-off on exact split.

**Cut first if budget tightens:** Paid search before paid social; keep founder LinkedIn + site launch.

**Success metrics (launch window, not CAC promises):**
- Unique `/agent` sessions and demo interactions (suggested prompt clicks / asks)  
- Audit CTA clicks from `/agent` and homepage section  
- Fit-call / audit form starts (contact + mailto)  
- **ASSUMPTION:** 8–15 audit inquiries in 2 weeks = strong for pre-logo studio; do not publish externally

### Coordination with finance
- Treat **$5k as hard cap** for 30-day launch window.  
- Paid CPC **ASSUMPTION:** $12–25 B2B; plan for **~150–250 clicks**, not “fill the funnel.”  
- No performance guarantees in copy.

---

# 5. Two-week launch outline

### Week 1 — Ship messaging & seed

| Day | Activity | Owner |
|-----|----------|-------|
| Mon | Eng ships homepage section + `/agent` page with disclaimer + `agentDemo.ts` | Eng |
| Mon | QA: all suggested prompts return expected answers; audit CTAs on both surfaces | QA |
| Tue | Publish `copy-pack` deltas if any; update `site.ts` meta if needed | Eng |
| Tue | Founder post #1: “We don’t sell AI—we sell gaps closed; here’s what the data agent looks like after warehouse” + link `/agent` | CEO |
| Wed | Founder post #2: screenshot of exception / late-shipment Q&A; CTA audit | CEO |
| Thu | Email warm network (short, honest, no logos) | CEO |
| Fri | Turn on LinkedIn retargeting pixel **ASSUMPTION**; audience: site visitors 30d | Marketing/CEO |

### Week 2 — Measure & tighten

| Day | Activity | Owner |
|-----|----------|-------|
| Mon | Review `/agent` engagement vs audit CTA clicks; note top prompts | Marketing |
| Tue | Small Google ad test: 2–3 problem phrases (“operational data spreadsheet”, “custom warehouse reporting”) → `/audit` | CEO + finance |
| Wed | Founder post #3: FAQ objection “why audit before AI” | CEO |
| Thu | If paid live: pause low CTR creatives; reallocate to retargeting | Marketing |
| Fri | Launch retro: claims still accurate? any user confused demo = product? | COO + QA |

---

# 6. Cross-links (consistency)

- Homepage FAQ “How does AI show up in practice?” — add line: “**Try the demo** on our [data agent page](/agent) for a fictional distributor.”  
- `/audit` — optional one-liner under Data & AI readiness: “Want to see the end state? [Preview the data agent demo](/agent).”  
- Header/nav: **ASSUMPTION** add “Data agent” or keep secondary CTA only until CEO decides nav clutter.

---

# 7. NEEDS CEO (blockers)

1. **Public security/compliance one-liner** (or stay generic).  
2. **Audit fee credit** wording still accurate for launch.  
3. **Nav:** expose `/agent` in main nav vs footer-only.  
4. **Production agent architecture** for sales calls—not required for launch if demo disclaimers stay visible.  
5. **Pricing** for AI layer on any public page (recommend: defer to SOW).  
6. Confirm **hello@dssi.example** → production email before paid traffic.

---

# 8. Handoffs

| Role | Next step |
|------|-----------|
| **Engineer** | Implement copy from sections 1–2; ensure demo disclaimer visible above fold on `/agent`. |
| **Designer** | OG image: “Ask your operational data” + DSSI brand; demo screenshot frame. |
| **QA** | Verify claims matrix rows marked “eng mock supports.” |
| **Finance** | Approve channel spend table within $5k. |
| **COO** | Paste output contract into orchestration; no code in marketer deliverable. |