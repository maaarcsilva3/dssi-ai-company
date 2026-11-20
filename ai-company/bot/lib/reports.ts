/**
 * Write CEO/company output files into the parent repo's reports/ folder.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPORTS_DIR } from "./paths.js";

export { REPORTS_DIR };

const ALLOWED_EXT = new Set([
  ".md",
  ".txt",
  ".json",
  ".html",
  ".csv",
  ".pdf",
]);

function ensureReportsDir() {
  mkdirSync(REPORTS_DIR, { recursive: true });
}

/** Safe relative filename: no path traversal, must have an allowed extension. */
export function sanitizeReportFilename(name: string): string {
  const base = path.basename(name.replace(/\\/g, "/")).trim();
  if (!base || base === "." || base === "..") {
    throw new Error("Invalid filename");
  }
  const ext = path.extname(base).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(
      `Unsupported extension "${ext}". Use: ${[...ALLOWED_EXT].join(", ")}`,
    );
  }
  return base;
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Minimal single-page (or multi-line) text PDF — no extra npm deps. */
export function textToSimplePdf(text: string): Buffer {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const maxLines = 60;
  const used = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    used.push("…(truncated)");
  }

  const contentLines: string[] = ["BT", "/F1 10 Tf", "50 780 Td", "12 TL"];
  for (let i = 0; i < used.length; i++) {
    const line = escapePdfText(used[i]!.slice(0, 110));
    if (i === 0) {
      contentLines.push(`(${line}) Tj`);
    } else {
      contentLines.push("T*", `(${line}) Tj`);
    }
  }
  contentLines.push("ET");
  const stream = contentLines.join("\n");

  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
  );
  objects.push(
    `4 0 obj<< /Length ${Buffer.byteLength(stream, "utf8")} >>stream\n${stream}\nendstream\nendobj\n`,
  );
  objects.push(
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>endobj\n",
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

export function writeReportFile(
  filename: string,
  body: string,
): { absolutePath: string; relativePath: string; bytes: number } {
  ensureReportsDir();
  const safe = sanitizeReportFilename(filename);
  const absolutePath = path.join(REPORTS_DIR, safe);
  const ext = path.extname(safe).toLowerCase();

  let bytes: number;
  if (ext === ".pdf") {
    const buf = textToSimplePdf(body);
    writeFileSync(absolutePath, buf);
    bytes = buf.length;
  } else {
    const data = ext === ".json" ? body : body.endsWith("\n") ? body : `${body}\n`;
    writeFileSync(absolutePath, data, "utf8");
    bytes = Buffer.byteLength(data, "utf8");
  }

  return {
    absolutePath,
    relativePath: path.join("reports", safe),
    bytes,
  };
}

export function defaultReportStem(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const clean = prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${stamp}-${clean || "report"}`;
}
