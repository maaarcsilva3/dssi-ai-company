## Objective
Implement the full JPA client `adjustment.pdf` against the AP/AR tracker today: mirror the app into company-workspace, ship all PDF must-haves, enforce Jeanette → Jea (admin) → Crissa → Jeanette status lanes, and leave out-of-scope features untouched.

## What we did
- **COO:** Mirrored `Desktop\New folder (3)\jpa-ap-tracker` → `company-workspace/jpa-ap-tracker`; clarified scope; coordinated PM → Design → Eng → QA.
- **Product Manager:** Product brief + testable AC for every PDF item (AP A–D, AR A–D) and role matrix.
- **Designer:** Minimal UX extensions (PDC schedule, workflow stepper, AR filters/totals/exports) on existing FMCS UI.
- **Engineer:** Implemented migration 035, server enforcement, PDC schedule, AR search/due/totals/Excel exports; typecheck + build + 56 tests pass.
- **QA:** Test plan + readiness review → **CONDITIONAL GO** (code gates pass; manual E2E/smoke not run; needs migration applied on target DB).

## Deliverables
| Title | Kind | Path |
|-------|------|------|
| PDF adjustment product brief | product-brief | `company-workspace/jpa-ap-tracker/product-brief-pdf-adjustment.md` |
| PDF adjustment design brief | design-brief | `company-workspace/jpa-ap-tracker/design-brief-pdf-adjustment.md` |
| PDF adjustment implementation | product-build | `company-workspace/jpa-ap-tracker/` (+ `tech-notes-pdf-adjustment.md`) |
| PDF adjustment QA plan | qa-plan | `company-workspace/jpa-ap-tracker/qa-pdf-adjustment-plan.md` |
| PDF adjustment QA readiness | qa-plan | `company-workspace/jpa-ap-tracker/qa-pdf-adjustment-readiness.md` |

### Shipped (code)
- **AP-A:** Multi-invoice payable + PDC schedule (`payable_pdc_lines`); amounts must sum to net (±₱0.01).
- **AP-B:** Multi-invoice one check via one payable multi-line and/or Upcoming release shared `payment_reference`.
- **AP-C:** Staff create → **For review**; `payable_status_ids` enforced on status PATCH/bulk; Jeanette / Crissa lane seeds; admin display name **Jea**.
- **AP-D:** `formatMoney` comma grouping on in-scope money UI.
- **AR-A–D:** Due range + invoice search + MM/DD/YYYY; invoice count · total; Download monthly summary + Export monthly sales report (Excel).

### Explicitly not touched
Telegram, AI, liquidations, petty cash, truck allowances, Docker/infra, unrelated polish.

## Decisions needed
1. **None blocking** if you accept: Jea = seeded `admin` user; Excel column layouts ASSUMED from current AR fields (no client template).
2. Optional: confirm whether Crissa should also be allowed to set Check Deposited/Released (migration currently allows Crissa + Jeanette on completion statuses) or Jeanette-only for step 4.

## Next steps
1. Start the mirrored app (migrations run on boot) or apply `migrations/035_pdf_adjustment.sql` on the target DB, then **re-login** all users so permissions refresh.
2. Run the ~60 min manual script in `qa-pdf-adjustment-readiness.md` (Jeanette → Jea → Crissa → Jeanette + AR exports).
3. Only after that smoke: promote/deploy from `company-workspace/jpa-ap-tracker` (not the old Desktop folder).

### Local run
```powershell
Set-Location "C:\Users\marc.silva\Desktop\test company\company-workspace\jpa-ap-tracker"
npm install
npm run db:up   # if using docker-compose.dev.yml Postgres
npm run dev
```
Seed logins (from project seed): `msjeanette` / `msjeanette`, `mscrissa` / `mscrissa`, `admin` / `admin123` (Jea).
