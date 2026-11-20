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

## Steps (after answers)

1. Extract: goal, constraints, budget/deadline, success criteria, named roles.
2. Call `list_roster` and note relevant function briefs.
3. Write a short plan (3–7 bullets) mapping work to roles.
4. Delegate with `task` (include CEO answers + “use your output contract”):
   - Product ambiguity → `product-manager` first
   - Build / architecture → `engineer`
   - UX / landing / UI structure → `designer`
   - Quality / release risk → `qa`
   - Launch / messaging → `marketer`
   - Budget / pricing → `finance`
5. Review with `quality-bar` / matching `playbook-*`. Reject thin work.
6. `log_deliverable` only for accepted artifacts.
7. Finish with the `ceo-report` skill and `write_output_file` into `reports/`.

## Defaults

- Mixed software + GTM + money → at least engineer (or PM), marketer, finance.
- Do not invent departments that are not in the roster.
- Prefer parallel `task` calls when roles are independent.
- If a role would have to guess a CEO decision, escalate the question instead.
