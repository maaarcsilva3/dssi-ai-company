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
- `bot/skills/` — run-objective, ceo-report, playbooks
- `bot/extensions/pstack.ts` — Lauren Tan pstack (`plugins/pstack`) → `pstack__*`
- `bot/extensions/cursor-team-kit.ts` — Cursor Team Kit companion (`plugins/cursor-team-kit`) → `cursor-team-kit__*` (deslop, control-ui/cli, …)
- `plugins/` — vendored Cursor plugins (update from upstream; do not edit lightly)
- `bot/channels/ceo.ts` — dashboard HTTP API
- `evals/` — filesystem evals

## Do not

- Grow host TypeScript for formatting or reply composition.
- Add npm deps on a first cut beyond what `@grok/agent-sdk` ships.
- Point `serve` at the parent `test company` folder.
