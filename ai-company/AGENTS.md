# ai-company

Agent SDK project (`@grok/agent-sdk`). The served agent's prompt is
`bot/instructions.md`.

## Loop

```bash
agent-sdk validate --dir .
agent-sdk info --dir . --json
agent-sdk run --dir . --message "Objective: ..."
agent-sdk eval --dir .
npm run check
```

Run the CLI under Node, never Bun.

## Layout

- `bot/instructions.md` — COO always-on prompt
- `bot/subagents/<role>/` — employee specialists (task tool)
- `bot/tools/` — roster + deliverable storage
- `bot/skills/` — run-objective, ceo-report
- `bot/channels/ceo.ts` — dashboard HTTP API
- `evals/` — filesystem evals

## Do not

- Grow host TypeScript for formatting or reply composition.
- Add npm deps on a first cut beyond what `@grok/agent-sdk` ships.
- Point `serve` at the parent `test company` folder.
