// Unit tests – Recurring Task form helpers (Deborah Cody)
import { describeSchedule, endsBeforeStart } from './recurrence-utils';

describe('recurrence-utils', () => {
  it('describes a schedule in plain English', () => {
    expect(describeSchedule('weekly', 1)).toBe('Every week');
    expect(describeSchedule('daily', 3)).toBe('Every 3 days');
    expect(describeSchedule('monthly', 2, '2026-12-31')).toBe('Every 2 months until Dec 31, 2026');
  });

  it('detects an end date before the start date', () => {
    expect(endsBeforeStart('2026-10-10', '2026-10-01')).toBe(true);
    expect(endsBeforeStart('2026-10-10', '2026-10-10')).toBe(false);
    expect(endsBeforeStart('2026-10-10', '')).toBe(false);
  });
});
