---
name: run-objective
description: Turn a CEO objective into clarifying questions first, then a multi-role work plan.
---

# Run a CEO objective

## Gate: ask first

If critical details are missing, **do not delegate yet**.

1. Ask 3–7 clarifying questions in one CEO-facing message.
2. Wait for answers in the next turn.
3. Only then continue with the steps below.

Skip the gate only if the CEO already supplied enough detail in this thread
or said to decide/execute without asking.

## Gate: poteto-mode (ask every time)

If the plan includes non-trivial build / fix / verify work that *could* use
pstack:

1. Ask the CEO: **Use poteto-mode for this?** (yes = `pstack__poteto-mode` +
   companion `cursor-team-kit__*` as needed; no = default eng/QA path).
2. One-line tradeoff: higher rigor / slower & more tokens vs faster default.
3. **Wait for yes/no.** Do not load poteto-mode or instruct specialists to
   until the CEO answers yes (or already said yes in this thread).

Skip only if this thread already answered poteto-mode yes/no for this work.

## Steps (after answers)

1. Extract: goal, constraints, budget/deadline, success criteria, named roles.
2. Call `list_roster` and note relevant function briefs.
3. Write a short plan (3–7 bullets) mapping work to roles.
4. Run the **poteto-mode gate** when eng/QA code rigor is in scope.
5. Delegate with `task` (include CEO answers + “use your output contract”):
   - Product ambiguity → `product-manager` first
   - Build / architecture → `engineer` (only if CEO said yes: load
     `pstack__poteto-mode` / `cursor-team-kit__*`; else normal eng path)
   - UX / landing / UI structure → `designer`
   - Quality / release risk → `qa` (same poteto yes/no as above)
   - Launch / messaging → `marketer`
   - Budget / pricing → `finance`
   - Organizational memory / decisions log / cross-role context / KB curation → `chief-of-staff`
6. Review with `quality-bar` / matching `playbook-*`. Reject thin work.
7. `log_deliverable` only for accepted artifacts.
8. Finish with the `ceo-report` skill and `write_output_file` into `reports/`.

## Defaults

- Mixed software + GTM + money → at least engineer (or PM), marketer, finance.
- Do not invent departments that are not in the roster.
- Prefer parallel `task` calls when roles are independent.
- If a role would have to guess a CEO decision, escalate the question instead.
- Never auto-enable poteto-mode.
