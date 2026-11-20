# Shared company data

This folder is the **source of truth** for roster and deliverables across machines.

| File | Purpose |
| --- | --- |
| `roster.json` | Employee roles and function briefs |
| `deliverables.json` | All logged work (includes `machine` hostname) |

## How to share across PCs

1. Put the whole `test company` / `ai-company` project in **Git**, or a cloud-synced folder (OneDrive, Dropbox, iCloud, etc.).
2. On each machine: clone/sync the folder, then `cd ai-company && npm install && npm run serve`.
3. After work on one PC, **commit + push** (or wait for cloud sync), then **pull/sync** on the other PC before starting HQ.

Do not put secrets in this folder. Cursor login stays local per machine (`agent-sdk login` on each PC).
