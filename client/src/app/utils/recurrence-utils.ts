/**
 * Framework-free helpers for the Recurring Task form (Deborah Cody).
 * Mirrors the wording of the server's describeRule() so the live preview matches what is saved.
 */
import { Frequency } from '../models/models';

const UNITS: Record<Frequency, string> = { daily: 'day', weekly: 'week', monthly: 'month' };

/** "Every week", "Every 2 months until Dec 31, 2026". Dates are YYYY-MM-DD strings from the form. */
export function describeSchedule(frequency: Frequency, interval: number, endDate?: string | null): string {
  const unit = UNITS[frequency] ?? frequency;
  const n = Number(interval) || 1;
  let text = n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
  if (endDate) {
    const d = new Date(`${endDate.slice(0, 10)}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      text += ` until ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
    }
  }
  return text;
}

/** True when an end date is set and falls before the start date (YYYY-MM-DD strings compare correctly). */
export function endsBeforeStart(startDate: string, endDate: string): boolean {
  return !!startDate && !!endDate && endDate < startDate;
}
