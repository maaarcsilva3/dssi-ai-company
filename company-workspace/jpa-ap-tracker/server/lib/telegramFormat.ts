/** Shared markdown → Telegram-friendly text helpers (no network). */

const MAX_MESSAGE_CHARS = 3900;

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c.replace(/\s/g, '')));
}

/** Turn a GFM table into a mobile-friendly labeled list. */
export function formatMarkdownTable(lines: string[]): string {
  const rows = lines.map(splitTableRow).filter((cells) => cells.some((c) => c.length > 0));
  if (rows.length === 0) return '';

  let header = rows[0]!;
  let dataStart = 1;
  if (rows[1] && isSeparatorRow(rows[1])) {
    dataStart = 2;
  } else if (isSeparatorRow(header)) {
    return '';
  }

  const data = rows.slice(dataStart).filter((r) => !isSeparatorRow(r));
  if (data.length === 0) return '';

  // If first row looked like a separator-only table, treat first data row as header when lengths match.
  const colCount = Math.max(header.length, ...data.map((r) => r.length));
  while (header.length < colCount) header.push(`Col ${header.length + 1}`);

  const blocks = data.map((row) => {
    const title = (row[0] ?? '').trim() || '—';
    const details: string[] = [];
    for (let i = 1; i < colCount; i++) {
      const label = (header[i] ?? `Col ${i + 1}`).trim() || `Col ${i + 1}`;
      const value = (row[i] ?? '').trim();
      if (!value) continue;
      details.push(`${label}: ${value}`);
    }
    return details.length ? `${title}\n${details.join('\n')}` : title;
  });

  return blocks.join('\n\n');
}

/**
 * Replace GFM pipe tables with labeled lists so Telegram (no table support) stays readable.
 */
export function rewriteMarkdownTables(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('|')) {
        tableLines.push(lines[i]!);
        i++;
      }
      const formatted = formatMarkdownTable(tableLines);
      if (formatted) {
        if (out.length && out[out.length - 1] !== '') out.push('');
        out.push(formatted);
        out.push('');
      }
      continue;
    }
    out.push(line);
    i++;
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Soften markdown that Telegram HTML does not support (headings, hr). */
export function normalizeMarkdownForTelegram(md: string): string {
  let text = rewriteMarkdownTables(md);
  // ATX headings → bold emphasis markers for the HTML converter
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '**$1**');
  // Horizontal rules
  text = text.replace(/^(\s*[-*_]\s*){3,}\s*$/gm, '');
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Convert a subset of markdown to Telegram HTML.
 * Order: code fences → inline code → links → bold → italic, then escape leftovers.
 */
export function markdownToTelegramHtml(md: string): string {
  const text = normalizeMarkdownForTelegram(md);
  const placeholders: string[] = [];
  const hold = (html: string) => {
    const idx = placeholders.length;
    placeholders.push(html);
    return `\u0000${idx}\u0000`;
  };

  let out = text.replace(/```[\w]*\n?([\s\S]*?)```/g, (_m, code: string) =>
    hold(`<pre><code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`),
  );

  out = out.replace(/`([^`]+)`/g, (_m, code: string) => hold(`<code>${escapeHtml(code)}</code>`));

  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, label: string, url: string) =>
    hold(`<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`),
  );

  out = out.replace(/\*\*([^*]+)\*\*/g, (_m, inner: string) => hold(`<b>${escapeHtml(inner)}</b>`));
  out = out.replace(/__([^_]+)__/g, (_m, inner: string) => hold(`<b>${escapeHtml(inner)}</b>`));

  out = out.replace(/(^|[^*\n])\*([^*\n]+)\*/g, (_m, pre: string, inner: string) =>
    `${pre}${hold(`<i>${escapeHtml(inner)}</i>`)}`,
  );

  out = escapeHtml(out);
  out = out.replace(/\u0000(\d+)\u0000/g, (_m, idx: string) => placeholders[Number(idx)] ?? '');
  return out;
}

export function truncateTelegramText(text: string, max = MAX_MESSAGE_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 20)}\n\n… (truncated)`;
}

/** Split long replies into Telegram-safe chunks (prefer paragraph / line breaks). */
export function chunkTelegramText(text: string, max = MAX_MESSAGE_CHARS): string[] {
  const src = text.trim();
  if (!src) return ['No answer.'];
  if (src.length <= max) return [src];

  const chunks: string[] = [];
  let rest = src;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n\n', max);
    if (cut < max * 0.4) cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.4) cut = max;
    chunks.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).replace(/^\n+/, '');
  }
  if (rest.trim()) chunks.push(rest.trim());
  return chunks.length ? chunks : ['No answer.'];
}

/** Format AI markdown explanation for Telegram; falls back to plain text. */
export function formatAiReplyForTelegram(explanation: string): {
  html: string;
  plain: string;
  htmlParts: string[];
  plainParts: string[];
} {
  const normalized = normalizeMarkdownForTelegram(explanation.trim() || 'No answer.');
  const plainParts = chunkTelegramText(normalized);
  const htmlParts = plainParts.map((part) => markdownToTelegramHtml(part));
  return {
    html: htmlParts[0]!,
    plain: plainParts[0]!,
    htmlParts,
    plainParts,
  };
}
