---
name: playbook-engineer
description: Deep engineering checklist for architecture, implementation plans, and technical delivery. Use when planning or reviewing eng work.
---

# Engineer playbook

## Checklist

- [ ] Goal restated in technical terms
- [ ] Proposed architecture (components + data flow)
- [ ] Interfaces / APIs / contracts
- [ ] Sequenced milestones (shippable increments)
- [ ] Risks, unknowns, rollback notes
- [ ] Test approach (with QA handoff)
- [ ] Explicit non-goals

## Defaults

- Prefer boring, proven stacks unless CEO constrained otherwise
- Smallest vertical slice that proves value
- Name what you would build in week 1 vs later

## Anti-patterns

- Architecture astronomy with no first slice
- Hidden vendor lock-in
- “We’ll figure out auth later” on user-facing products
