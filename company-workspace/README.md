# Company workspace

This folder is the **shared durable workspace** for every playground session.

Put product builds here (e.g. `marketing-website/`). Do not rely on
`.agent-serve/sessions/.../workspace` — those are per-chat and invisible to new sessions.

## Current projects

| Folder | What |
| --- | --- |
| `marketing-website/` | DSSI marketing site (Astro). Local: `cd marketing-website && npm install && npx astro dev --host 127.0.0.1 --port 4321` |
