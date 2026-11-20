import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  defaultReportStem,
  writeReportFile,
} from "../lib/reports.js";

export default defineTool({
  description:
    "Write a company output file into the parent reports/ folder (.md, .pdf, .txt, .json, .html, .csv). Use for CEO reports and any file the CEO asks for. Prefer .md unless they ask for another format.",
  effect: "write",
  inputSchema: z.object({
    filename: z
      .string()
      .min(1)
      .optional()
      .describe(
        "File name with extension, e.g. ceo-report.md or launch-plan.pdf. If omitted, a timestamped name is generated from title + format.",
      ),
    title: z
      .string()
      .min(1)
      .optional()
      .describe("Used to build a default filename when filename is omitted"),
    format: z
      .enum(["md", "pdf", "txt", "json", "html", "csv"])
      .optional()
      .describe("Used with title when filename is omitted. Default md."),
    body: z.string().min(1).describe("Full file contents (plain text; PDF is text-rendered)"),
  }),
  async execute({ filename, title, format, body }) {
    const fmt = format ?? "md";
    const name =
      filename?.trim() ||
      `${defaultReportStem(title ?? "ceo-report")}.${fmt}`;
    const written = writeReportFile(name, body);
    return {
      ok: true as const,
      ...written,
      hint: "Open this path on disk (parent folder → reports/).",
    };
  },
});
