import { describe, expect, it } from 'vitest';
import {
  chunkTelegramText,
  formatAiReplyForTelegram,
  rewriteMarkdownTables,
} from './telegramFormat';

describe('rewriteMarkdownTables', () => {
  it('converts pipe tables into labeled rows', () => {
    const md = `
### Upcoming Payments

| Client Name | Amount | Due Date |
|-------------|--------|----------|
| MURAHAMA TRUCKPARTS CENTER | ₱112,000.00 | 2026-11-09 |
| TYRE OPTION ENTERPRISES | ₱33,600.00 | 2026-11-12 |

Total is ₱145,600.00.
`.trim();

    const out = rewriteMarkdownTables(md);
    expect(out).toContain('MURAHAMA TRUCKPARTS CENTER');
    expect(out).toContain('Amount: ₱112,000.00');
    expect(out).toContain('Due Date: 2026-11-09');
    expect(out).toContain('TYRE OPTION ENTERPRISES');
    expect(out).not.toContain('|---');
    expect(out).toContain('Total is ₱145,600.00.');
  });
});

describe('formatAiReplyForTelegram', () => {
  it('renders headings and tables as Telegram HTML without pipes', () => {
    const md = `
### Upcoming Payments for November 2026

| Client Name | Amount | Due Date |
|--------------------------------|------|------------|
| MURAHAMA TRUCKPARTS CENTER | ₱112,000.00 | 2026-11-09 |

The total upcoming payment for this month is ₱112,000.00.
`.trim();

    const { html, plain, plainParts } = formatAiReplyForTelegram(md);
    expect(plain).toContain('Amount: ₱112,000.00');
    expect(plain).not.toMatch(/^\|/m);
    expect(html).toContain('<b>Upcoming Payments for November 2026</b>');
    expect(html).toContain('Amount: ₱112,000.00');
    expect(html).not.toContain('<table');
    expect(plainParts.length).toBe(1);
  });

  it('chunks long replies instead of a single truncated message', () => {
    const long = Array.from({ length: 80 }, (_, i) => `Row ${i + 1}: invoice and amount`).join('\n\n');
    const parts = chunkTelegramText(long, 500);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= 500)).toBe(true);
    expect(parts.join('\n\n')).toContain('Row 1:');
    expect(parts.join('\n\n')).toContain('Row 80:');
  });
});
