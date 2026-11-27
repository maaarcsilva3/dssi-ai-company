import { describe, expect, it } from 'vitest';
import { resolveReportPeriod, shiftAnchor } from './reportPeriod';

describe('resolveReportPeriod', () => {
  it('resolves Mon–Sun week containing a Wednesday', () => {
    const p = resolveReportPeriod('week', '2026-10-14');
    expect(p.start).toBe('2026-10-12');
    expect(p.end).toBe('2026-10-18');
  });

  it('resolves week when anchor is Sunday', () => {
    const p = resolveReportPeriod('week', '2026-10-18');
    expect(p.start).toBe('2026-10-12');
    expect(p.end).toBe('2026-10-18');
  });

  it('resolves calendar month', () => {
    const p = resolveReportPeriod('month', '2026-02-15');
    expect(p.start).toBe('2026-02-01');
    expect(p.end).toBe('2026-02-28');
    expect(p.label).toBe('February 2026');
  });

  it('resolves calendar year', () => {
    const p = resolveReportPeriod('year', '2026-10-14');
    expect(p.start).toBe('2026-01-01');
    expect(p.end).toBe('2026-12-31');
    expect(p.label).toBe('2026');
  });
});

describe('shiftAnchor', () => {
  it('shifts week by 7 days', () => {
    expect(shiftAnchor('week', '2026-10-14', 1)).toBe('2026-10-21');
    expect(shiftAnchor('week', '2026-10-14', -1)).toBe('2026-10-07');
  });

  it('shifts month and clamps day', () => {
    expect(shiftAnchor('month', '2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftAnchor('month', '2026-03-31', -1)).toBe('2026-02-28');
  });

  it('shifts year', () => {
    expect(shiftAnchor('year', '2026-10-14', -1)).toBe('2025-10-14');
  });
});
