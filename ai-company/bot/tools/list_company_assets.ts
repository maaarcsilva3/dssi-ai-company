import { defineTool } from "@grok/agent-sdk/tools";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import path from "node:path";
import {
  COMPANY_DATA_DIR,
  COMPANY_WORKSPACE,
  REPORTS_DIR,
} from "../lib/paths.js";
import { loadDeliverables } from "../lib/store.js";

function listTopLevel(dir: string): { name: string; kind: "file" | "dir" }[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name !== "node_modules" && name !== ".git" && name !== "README.md")
    .map((name) => {
      const full = path.join(dir, name);
      let kind: "file" | "dir" = "file";
      try {
        kind = statSync(full).isDirectory() ? "dir" : "file";
      } catch {
        /* ignore */
      }
      return { name, kind };
    });
}

function readProjectHint(projectDir: string): string | undefined {
  for (const candidate of ["README.md", "package.json"]) {
    const p = path.join(projectDir, candidate);
    if (!existsSync(p)) continue;
    try {
      if (candidate === "package.json") {
        const pkg = JSON.parse(readFileSync(p, "utf8")) as { name?: string; description?: string };
        return [pkg.name, pkg.description].filter(Boolean).join(" — ");
      }
      return readFileSync(p, "utf8").split(/\r?\n/).slice(0, 3).join(" ").slice(0, 160);
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

export default defineTool({
  description:
    "Inventory durable company assets across company-workspace/, reports/, and company-data/. Call this before saying the company has nothing, or when the CEO asks what we have / whether a website or project exists.",
  effect: "read",
  async execute() {
    const workspaceItems = listTopLevel(COMPANY_WORKSPACE);
    const projects = workspaceItems
      .filter((i) => i.kind === "dir")
      .map((i) => {
        const dir = path.join(COMPANY_WORKSPACE, i.name);
        return {
          name: i.name,
          path: dir,
          hint: readProjectHint(dir),
        };
      });

    const reports = listTopLevel(REPORTS_DIR).filter((i) => i.kind === "file");
    const deliverables = loadDeliverables();

    return {
      companyWorkspace: COMPANY_WORKSPACE,
      reportsDir: REPORTS_DIR,
      companyDataDir: COMPANY_DATA_DIR,
      projects,
      reports: reports.map((r) => r.name),
      deliverableCount: deliverables.length,
      recentDeliverables: deliverables.slice(-10).map((d) => ({
        id: d.id,
        title: d.title,
        kind: d.kind,
        role: d.role,
        createdAt: d.createdAt,
        machine: d.machine,
      })),
      guidance:
        projects.length === 0 && reports.length === 0 && deliverables.length === 0
          ? "No durable assets yet. New work should be created under company-workspace/ and logged."
          : "These assets persist across playground sessions. Prefer this inventory over assuming a blank slate.",
    };
  },
});
