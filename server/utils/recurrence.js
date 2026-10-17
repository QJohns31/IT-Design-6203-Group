/**
 * Recurrence scheduling helpers – Recurring Task Management (Deborah Cody).
 *
 * All recurrence dates are treated as calendar dates in UTC (time portion ignored),
 * matching how the Angular <input type="date"> values are stored.
 *
 * Monthly rules clamp to the last day of shorter months, so a rule that starts on
 * Jan 31 produces Feb 28/29, Mar 31, Apr 30, ... (it always aims for the original day).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDateOnly(value) {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysInMonthUtc(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Returns the n-th occurrence (n = 0 is the start date) of a rule.
 */
function nthOccurrence(rule, n) {
  const start = toUtcDateOnly(rule.startDate);
  const interval = rule.interval || 1;

  switch (rule.frequency) {
    case 'daily':
      return new Date(start.getTime() + n * interval * DAY_MS);
    case 'weekly':
      return new Date(start.getTime() + n * interval * 7 * DAY_MS);
    case 'monthly': {
      const totalMonths = start.getUTCMonth() + n * interval;
      const year = start.getUTCFullYear() + Math.floor(totalMonths / 12);
      const month = totalMonths % 12;
      const day = Math.min(start.getUTCDate(), daysInMonthUtc(year, month));
      return new Date(Date.UTC(year, month, day));
    }
    default:
      throw new Error(`Unknown frequency: ${rule.frequency}`);
  }
}

/**
 * Lists the next `count` occurrences of a rule on or after `fromDate`
 * (defaults to today), stopping at the rule's endDate if it has one.
 *
 * @param {{frequency:string, interval:number, startDate:Date|string, endDate?:Date|string|null}} rule
 * @param {{count?:number, fromDate?:Date|string}} [options]
 * @returns {Date[]}
 */
function getUpcomingOccurrences(rule, { count = 5, fromDate = new Date() } = {}) {
  const safeCount = Math.max(0, Math.min(Number(count) || 0, 50));
  const from = toUtcDateOnly(fromDate);
  const end = rule.endDate ? toUtcDateOnly(rule.endDate) : null;
  const results = [];

  if (safeCount === 0) return results;

  // Jump close to `from` instead of iterating from the start date one step at a time.
  let n = 0;
  const start = toUtcDateOnly(rule.startDate);
  if (from > start) {
    const interval = rule.interval || 1;
    const diffDays = Math.floor((from - start) / DAY_MS);
    if (rule.frequency === 'daily') n = Math.floor(diffDays / interval);
    else if (rule.frequency === 'weekly') n = Math.floor(diffDays / (7 * interval));
    else if (rule.frequency === 'monthly') {
      const months = (from.getUTCFullYear() - start.getUTCFullYear()) * 12
        + (from.getUTCMonth() - start.getUTCMonth());
      n = Math.max(0, Math.floor(months / interval) - 1);
    }
  }

  // Safety cap prevents an infinite loop on bad data.
  for (let guard = 0; results.length < safeCount && guard < 10000; guard += 1, n += 1) {
    const occurrence = nthOccurrence(rule, n);
    if (end && occurrence > end) break;
    if (occurrence >= from) results.push(occurrence);
  }
  return results;
}

/**
 * Human-readable summary, e.g. "Every 2 weeks until Dec 31, 2026".
 */
function describeRule(rule) {
  const unit = { daily: 'day', weekly: 'week', monthly: 'month' }[rule.frequency] || rule.frequency;
  const interval = rule.interval || 1;
  let text = interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;
  if (rule.endDate) {
    const end = toUtcDateOnly(rule.endDate);
    text += ` until ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
  }
  return text;
}

module.exports = { toUtcDateOnly, nthOccurrence, getUpcomingOccurrences, describeRule };
