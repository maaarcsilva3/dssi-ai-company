/**
 * Calendar period bounds for admin reports.
 * Dates are 'YYYY-MM-DD'; week is Monday–Sunday containing the anchor.
 */

import { addDays, isValidIsoDate, weekdayOf, type IsoDate } from './releaseWindow';

export type ReportPeriodKind = 'week' | 'month' | 'year';

export interface ReportPeriod {
  kind: ReportPeriodKind;
  anchor: IsoDate;
  start: IsoDate;
  end: IsoDate;
  label: string;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function mondayOfWeek(iso: IsoDate): IsoDate {
  const dow = weekdayOf(iso); // 0=Sun … 6=Sat
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  return addDays(iso, -daysFromMonday);
}

function lastDayOfMonth(year: number, month1to12: number): IsoDate {
  // Day 0 of next month = last day of this month
  const d = new Date(Date.UTC(year, month1to12, 0));
  return d.toISOString().slice(0, 10);
}

function formatShort(iso: IsoDate): string {
  const [y, m, d] = iso.split('-').map(Number);
  const mon = MONTHS[m - 1].slice(0, 3);
  return `${mon} ${d}, ${y}`;
}

export function resolveReportPeriod(kind: ReportPeriodKind, anchor: IsoDate): ReportPeriod {
  if (!isValidIsoDate(anchor)) throw new RangeError(`Invalid anchor date: ${anchor}`);
  const [y, m] = anchor.split('-').map(Number);

  if (kind === 'week') {
    const start = mondayOfWeek(anchor);
    const end = addDays(start, 6);
    return { kind, anchor, start, end, label: `${formatShort(start)} – ${formatShort(end)}` };
  }

  if (kind === 'month') {
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const end = lastDayOfMonth(y, m);
    return { kind, anchor, start, end, label: `${MONTHS[m - 1]} ${y}` };
  }

  const start = `${y}-01-01`;
  const end = `${y}-12-31`;
  return { kind, anchor, start, end, label: String(y) };
}

/** Shift anchor to the equivalent day in the previous/next period. */
export function shiftAnchor(kind: ReportPeriodKind, anchor: IsoDate, delta: -1 | 1): IsoDate {
  if (!isValidIsoDate(anchor)) throw new RangeError(`Invalid anchor date: ${anchor}`);
  if (kind === 'week') return addDays(anchor, delta * 7);
  if (kind === 'month') {
    const [y, m, d] = anchor.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
    const maxDay = Number(lastDayOfMonth(dt.getUTCFullYear(), dt.getUTCMonth() + 1).slice(8, 10));
    dt.setUTCDate(Math.min(d, maxDay));
    return dt.toISOString().slice(0, 10);
  }
  const [y, m, d] = anchor.split('-').map(Number);
  return `${y + delta}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
