import { describe, it, expect } from 'vitest';
import { isoDayOfWeek, findDayForDate, findNextDay } from '../domain/program-schedule.js';

// 2026-06-22 is a Monday, so the week below is fully deterministic.
const monday = new Date('2026-06-22T10:00:00');
const wednesday = new Date('2026-06-24T10:00:00');
const sunday = new Date('2026-06-28T10:00:00');

describe('isoDayOfWeek', () => {
  it('maps Monday to 1', () => {
    expect(isoDayOfWeek(monday)).toBe(1);
  });

  it('maps Wednesday to 3', () => {
    expect(isoDayOfWeek(wednesday)).toBe(3);
  });

  it('maps Sunday to 7 (not 0)', () => {
    expect(isoDayOfWeek(sunday)).toBe(7);
  });
});

describe('findDayForDate', () => {
  const days = [
    { dayOfWeek: 1, title: 'Dos' },
    { dayOfWeek: 3, title: 'Pectoraux' },
    { dayOfWeek: 5, title: 'Jambes' },
  ];

  it('returns the day planned for that date', () => {
    expect(findDayForDate(days, monday)?.title).toBe('Dos');
    expect(findDayForDate(days, wednesday)?.title).toBe('Pectoraux');
  });

  it('returns null on a rest day', () => {
    expect(findDayForDate(days, sunday)).toBeNull();
  });

  it('returns null when the program has no days', () => {
    expect(findDayForDate([], monday)).toBeNull();
  });
});

describe('findNextDay', () => {
  const days = [
    { dayOfWeek: 1, title: 'Dos' },
    { dayOfWeek: 3, title: 'Pectoraux' },
    { dayOfWeek: 5, title: 'Jambes' },
  ];

  it('returns the next planned day later in the week', () => {
    expect(findNextDay(days, monday)?.title).toBe('Pectoraux');
  });

  it('wraps around to the first day of the next week', () => {
    expect(findNextDay(days, sunday)?.title).toBe('Dos');
  });

  it('returns null when there is no day at all', () => {
    expect(findNextDay([], monday)).toBeNull();
  });

  it('handles a single-day program by wrapping to itself', () => {
    expect(findNextDay([{ dayOfWeek: 1, title: 'Full body' }], wednesday)?.title).toBe('Full body');
  });
});
