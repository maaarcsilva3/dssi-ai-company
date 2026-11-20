import path from "node:path";
import { fileURLToPath } from "node:url";

/** Parent `test company` folder (repo root). */
export const COMPANY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

/** Shared workspace for every playground session (durable company files). */
export const COMPANY_WORKSPACE = path.join(COMPANY_ROOT, "company-workspace");

/** CEO output files. */
export const REPORTS_DIR = path.join(COMPANY_ROOT, "reports");

/** Roster + deliverable JSON. */
export const COMPANY_DATA_DIR = path.join(COMPANY_ROOT, "ai-company", "company-data");
