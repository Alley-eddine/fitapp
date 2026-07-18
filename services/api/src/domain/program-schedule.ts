/**
 * Pure scheduling helpers for weekly training programs — no infrastructure
 * imports, so they stay unit testable.
 */

/** ISO weekday: 1 = Monday … 7 = Sunday (JS getDay() returns 0 for Sunday). */
export const isoDayOfWeek = (date: Date): number => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

export interface ScheduledDay {
  dayOfWeek: number;
}

/** The program day planned for `date`, or null when it is a rest day. */
export const findDayForDate = <T extends ScheduledDay>(days: T[], date: Date): T | null =>
  days.find((d) => d.dayOfWeek === isoDayOfWeek(date)) ?? null;

/** The next planned day strictly after `date`, wrapping to the following week. */
export const findNextDay = <T extends ScheduledDay>(days: T[], date: Date): T | null => {
  if (days.length === 0) return null;
  const today = isoDayOfWeek(date);
  const sorted = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  return sorted.find((d) => d.dayOfWeek > today) ?? sorted[0] ?? null;
};
