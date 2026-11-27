/**
 * Pure, date-only helpers for the payment release schedule.
 * All dates are 'YYYY-MM-DD' strings; arithmetic is done in UTC so DST/timezones never shift a day.
 */

export type IsoDate = string;

export interface ReleaseWindow {
  releaseDate: IsoDate;
  windowStart: IsoDate;
  windowEnd: IsoDate;
}

function toUtc(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function isValidIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return fromUtc(toUtc(iso)) === iso;
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(iso: IsoDate): number {
  return toUtc(iso).getUTCDay();
}

/** Calendar date "today" as seen in the given IANA timezone. */
export function todayInTimezone(timeZone: string, now: Date = new Date()): IsoDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Next date on or after `today` that falls on `weekday`. Today counts if it is the release day. */
export function nextReleaseDate(today: IsoDate, weekday: number): IsoDate {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new RangeError(`weekday must be 0-6, got ${weekday}`);
  }
  const diff = (weekday - weekdayOf(today) + 7) % 7;
  return addDays(today, diff);
}

/** Inclusive window [releaseDate - daysBefore, releaseDate + daysAfter]. */
export function releaseWindow(releaseDate: IsoDate, daysBefore: number, daysAfter: number): ReleaseWindow {
  if (daysBefore < 0 || daysAfter < 0) throw new RangeError('daysBefore/daysAfter must be >= 0');
  return {
    releaseDate,
    windowStart: addDays(releaseDate, -daysBefore),
    windowEnd: addDays(releaseDate, daysAfter),
  };
}

export type DueBucket = 'carried_over' | 'in_window' | 'outside';

/**
 * Where a due date falls relative to a window.
 * 'carried_over' = due before the window start (still unpaid from an earlier cycle).
 */
export function classifyDueDate(dueDate: IsoDate, window: ReleaseWindow): DueBucket {
  if (dueDate < window.windowStart) return 'carried_over';
  if (dueDate <= window.windowEnd) return 'in_window';
  return 'outside';
}

export function isIncluded(dueDate: IsoDate, window: ReleaseWindow, includeOverdue: boolean): boolean {
  const bucket = classifyDueDate(dueDate, window);
  return bucket === 'in_window' || (includeOverdue && bucket === 'carried_over');
}
