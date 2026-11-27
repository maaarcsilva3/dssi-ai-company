import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArExcelBuffer, parseCoverage } from './arExcelImport';
import { computeArTotals } from './arTotals';

describe('parseCoverage', () => {
  it('parses month ranges', () => {
    expect(parseCoverage('SEPTEMBER 16-30, 2026')).toEqual({
      start: '2026-09-16',
      end: '2026-09-30',
    });
  });

  it('parses cross-day TO ranges', () => {
    expect(parseCoverage('AUGUST 01, 2026 TO AUGUST 15, 2026')).toEqual({
      start: '2026-08-01',
      end: '2026-08-15',
    });
  });
});

describe('computeArTotals', () => {
  it('matches SI sample math for 108500 VATinc', () => {
    const t = computeArTotals(108500, 0);
    expect(t.total_sales_vatinc).toBe('108500.00');
    expect(t.total_sales_vatex).toBe('96875.00');
    expect(t.vat_amount).toBe('11625.00');
    expect(t.ewt_amount).toBe('1937.50');
    expect(t.total_after_ewt).toBe('106562.50');
    expect(t.grand_total).toBe('106562.50');
  });
});

describe('parseArExcelBuffer sample file', () => {
  const samples = [
    path.resolve(
      '/Users/marcsilva/Downloads/1811_SPX_PHILIPPINES,_INC_10_10_2026_MSPX201202610_120980_MM_INTRA.xlsx',
    ),
    path.resolve(
      'C:/Users/marcf/Downloads/Telegram Desktop/1811_SPX_PHILIPPINES,_INC_10_10_2026_MSPX201202610_120980_MM_INTRA.xlsx',
    ),
  ];

  const variantDir = '/Users/marcsilva/Downloads/Sample Invoices - Excel';

  it('imports SI + invoice sheet', () => {
    let buf: Buffer | null = null;
    for (const sample of samples) {
      try {
        buf = readFileSync(sample);
        break;
      } catch {
        // try next path
      }
    }
    if (!buf) return; // Sample may be absent in CI
    const parsed = parseArExcelBuffer(buf);
    expect(parsed.invoiceNo).toBe('1811');
    expect(parsed.clientName.toLowerCase()).toContain('spx');
    expect(parsed.details.length).toBeGreaterThan(10);
    expect(parsed.billingReference).toMatch(/MSPX/i);
    expect(parsed.tripType).toBe('LUZON');
    expect(parsed.fleetType).toBe('6W');
    expect(parsed.serviceType).toBe('WETLEASE');
    expect(parsed.invoiceDate).toBe('2026-10-23');
    expect(parsed.details.every((d) => d.billing_date === '2026-10-23')).toBe(true);
    expect(parsed.details[0]!.entry_date).toMatch(/^2026-09-/);
    const sum = parsed.details.reduce((s, d) => s + d.amount, 0);
    expect(sum).toBeCloseTo(108500, 0);
  });

  it('imports alternate layouts and fills missing columns with N/A', () => {
    const files = [
      '1769. SHOPEE PHILIPPINES, INC. (09-22-2026) JPAFLI MM INTRA-LUZON 10W WETLEASE AUGUST 01-15, 2026 PASSWAY 0292.xlsx',
      '1796. DECOARTS MARKETING INC. (10-21-2026) SASA & CARMEN DISTRIBUTION - OCT 13, 2026 TO OCT 21, 2026.xlsx',
      '1906. DIZON FARMS PRODUCE INC. (11-09-2026) NOVEMBER 03, 2026 TO NOVEMBER 06, 2026.xlsx',
      '1910. CA LOGISTICS CORPORATION (11-13-2026) OCTOBER 28, 2026 TO NOVEMBER 03, 2026.xlsx',
    ];
    for (const file of files) {
      let buf: Buffer;
      try {
        buf = readFileSync(path.join(variantDir, file));
      } catch {
        return; // samples absent in CI
      }
      const parsed = parseArExcelBuffer(buf);
      expect(parsed.details.length).toBeGreaterThan(0);
      expect(parsed.clientName.length).toBeGreaterThan(3);
      for (const d of parsed.details) {
        expect(d.reference).toBeTruthy();
        expect(d.origin).toBeTruthy();
        expect(d.destination).toBeTruthy();
      }
    }

    const dizon = parseArExcelBuffer(
      readFileSync(path.join(variantDir, files[2]!)),
    );
    expect(dizon.details.every((d) => d.origin === 'N/A' && d.destination === 'N/A')).toBe(true);
    expect(dizon.details[0]!.reference).not.toBe('N/A'); // plate used as reference

    const ca = parseArExcelBuffer(readFileSync(path.join(variantDir, files[3]!)));
    expect(ca.invoiceNo).toBe('1910');
  });
});
