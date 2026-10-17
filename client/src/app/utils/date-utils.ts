/**
 * Date helpers shared by the components. Kept framework-free so they can be unit-tested
 * with plain Node.js as well as with the Angular test runner.
 *
 * Date-only fields (task due date, recurrence start/end) are stored as UTC midnight,
 * so they are always read back with UTC getters to avoid "off by one day" bugs.
 */

/** Today's date in the browser's local time zone as YYYY-MM-DD. */
export function todayLocalIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** ISO string from the API -> value for <input type="date"> (YYYY-MM-DD). */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

/** ISO string from the API -> value for <input type="datetime-local"> in local time. */
export function toDateTimeLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value (local time) -> ISO string in UTC for the API. */
export function fromDateTimeLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Whole days from today (local) until a date-only ISO value; negative = in the past. */
export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const due = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  const today = Date.parse(`${todayLocalIso(now)}T00:00:00Z`);
  return Math.round((due - today) / 86400000);
}
