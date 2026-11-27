import { describe, expect, it } from 'vitest';
import {
  addDays,
  classifyDueDate,
  daysBetween,
  isIncluded,
  isValidIsoDate,
  nextReleaseDate,
  releaseWindow,
  todayInTimezone,
  weekdayOf,
} from './releaseWindow';

const FRIDAY = 5;

describe('date helpers', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-10-09', '2026-10-12')).toBe(3);
    expect(daysBetween('2026-10-09', '2026-10-02')).toBe(-7);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });

  it('computes weekdays', () => {
    expect(weekdayOf('2026-10-08')).toBe(4); // Thursday
    expect(weekdayOf('2026-10-09')).toBe(5); // Friday
  });

  it('validates calendar dates', () => {
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('26-01-01')).toBe(false);
  });

  it('resolves today in a timezone', () => {
    // 2026-10-08 20:00 UTC is already 2026-10-09 in Manila (UTC+8).
    const now = new Date('2026-10-08T20:00:00Z');
    expect(todayInTimezone('Asia/Manila', now)).toBe('2026-10-09');
    expect(todayInTimezone('UTC', now)).toBe('2026-10-08');
  });
});

describe('nextReleaseDate', () => {
  it('returns the upcoming Friday from a Thursday', () => {
    expect(nextReleaseDate('2026-10-08', FRIDAY)).toBe('2026-10-09');
  });

  it('returns today when today is the release day', () => {
    expect(nextReleaseDate('2026-10-09', FRIDAY)).toBe('2026-10-09');
  });

  it('rolls to next week after the release day', () => {
    expect(nextReleaseDate('2026-10-10', FRIDAY)).toBe('2026-10-16');
  });

  it('supports any weekday', () => {
    expect(nextReleaseDate('2026-10-08', 1)).toBe('2026-10-12'); // Monday
  });

  it('rejects invalid weekdays', () => {
    expect(() => nextReleaseDate('2026-10-08', 7)).toThrow(RangeError);
  });
});

describe('releaseWindow', () => {
  it('builds a one-week window ending on release day', () => {
    expect(releaseWindow('2026-10-09', 7, 0)).toEqual({
      releaseDate: '2026-10-09',
      windowStart: '2026-10-02',
      windowEnd: '2026-10-09',
    });
  });

  it('builds a two-week window with days after', () => {
    expect(releaseWindow('2026-10-09', 14, 6)).toEqual({
      releaseDate: '2026-10-09',
      windowStart: '2026-09-25',
      windowEnd: '2026-10-15',
    });
  });

  it('classifies and filters due dates', () => {
    const w = releaseWindow('2026-10-09', 7, 0);
    expect(classifyDueDate('2026-09-30', w)).toBe('carried_over');
    expect(classifyDueDate('2026-10-02', w)).toBe('in_window');
    expect(classifyDueDate('2026-10-09', w)).toBe('in_window');
    expect(classifyDueDate('2026-10-10', w)).toBe('outside');

    expect(isIncluded('2026-09-30', w, true)).toBe(true);
    expect(isIncluded('2026-09-30', w, false)).toBe(false);
    expect(isIncluded('2026-10-10', w, true)).toBe(false);
  });
});
