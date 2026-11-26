# Agentic AI mock — tech notes (DSSI marketing site)

## Architecture

- **Stack unchanged:** Astro 7 + Tailwind 4, static pages, no backend.
- **Demo logic:** `src/lib/agentDemo.ts` holds fictional warehouse context, suggested prompts, and keyword-scored scripted answers. `matchDemoAnswer()` runs entirely in the browser inside `AgentDemo.astro` `<script>` (no LLM, no API keys).
- **Rendering:** Assistant replies pass through `formatDemoReply()` for minimal `**bold**` and `` `code` `` → HTML (escaped user text on user bubbles).
- **Site CTAs:** `src/lib/site.ts` — primary **Start an audit** → `/audit`; secondary **Try the data agent demo** → `/agent`.

## Data flow (mock)

```text
User types / clicks suggestion
  → client submit handler
  → matchDemoAnswer(question) scores keywords against scriptedAnswers
  → formatDemoReply(answer) → append to #agent-transcript
```

## Files touched / added

| Path | Role |
|------|------|
| `src/lib/site.ts` | Primary/secondary CTA update |
| `src/lib/agentDemo.ts` | Demo context, Q&A matcher, formatting |
| `src/components/AgenticAiSection.astro` | Homepage section + CTAs |
| `src/components/AgentDemo.astro` | Interactive chat + data context panel |
| `src/pages/agent.astro` | Dedicated `/agent` page |
| `src/pages/index.astro` | Inserts `AgenticAiSection` after “What we do” |
| `src/components/Header.astro` | Nav link “Data agent” |

## How to run

```bash
cd marketing-website
npm install
npm run dev      # http://localhost:4321 — homepage section + /agent
npm run build    # static output in dist/
npm run preview  # serve dist/
```

## Non-goals (this pass)

- Live LLM / embeddings / vector DB
- Auth, persistence, or real warehouse connectors
- Replacing Operational Gap Audit offer or homepage hero (DSSI name remains hero-level)
- Production agent hosting, model choice, or pricing

## Risks

| Risk | Mitigation |
|------|------------|
| Visitors confuse demo with production AI | Labels: “Demo only — scripted replies”; `/agent` “What this demo is not” |
| Keyword matcher misses paraphrases | Suggested prompts + fallback message |
| Contact email placeholder | Still `hello@dssi.example` — **NEEDS CEO** for real inbox + booking |

## Public-launch checklist (engineer)

- [x] `npm run build` succeeds (2025-11-26, exit 0, `/agent` in route list)
- [x] `/agent` loads demo; suggestions + free-text wired in `AgentDemo.astro`
- [x] Homepage hero unchanged; `AgenticAiSection` after “What we do”
- [x] Header nav + site CTAs: `/audit`, `/agent`
- [x] Mobile layout: demo grid stacks (`lg:grid-cols` breakpoint)
- [x] No secrets in repo