// Unit tests – Recurring Task Management scheduling logic (Deborah Cody)
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { getUpcomingOccurrences, nthOccurrence, describeRule } = require('../../utils/recurrence');

const iso = (dates) => dates.map((d) => d.toISOString().slice(0, 10));

describe('recurrence', () => {
  test('daily rule every 2 days', () => {
    const rule = { frequency: 'daily', interval: 2, startDate: '2026-10-01' };
    assert.deepEqual(iso(getUpcomingOccurrences(rule, { count: 3, fromDate: '2026-10-01' })), ['2026-10-01', '2026-10-03', '2026-10-05']);
  });

  test('weekly rule skips past occurrences and starts from the from-date', () => {
    const rule = { frequency: 'weekly', interval: 1, startDate: '2026-09-01' };
    assert.deepEqual(iso(getUpcomingOccurrences(rule, { count: 2, fromDate: '2026-09-20' })), ['2026-09-22', '2026-09-29']);
  });

  test('monthly rule clamps Jan 31 to the end of shorter months', () => {
    const rule = { frequency: 'monthly', interval: 1, startDate: '2027-01-31' };
    assert.deepEqual(iso(getUpcomingOccurrences(rule, { count: 4, fromDate: '2027-01-01' })),
      ['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);
  });

  test('monthly rule crosses the year boundary', () => {
    assert.equal(nthOccurrence({ frequency: 'monthly', interval: 3, startDate: '2026-11-15' }, 1).toISOString().slice(0, 10), '2027-02-15');
  });

  test('end date stops the series', () => {
    const rule = { frequency: 'daily', interval: 1, startDate: '2026-10-01', endDate: '2026-10-03' };
    assert.deepEqual(iso(getUpcomingOccurrences(rule, { count: 10, fromDate: '2026-10-01' })), ['2026-10-01', '2026-10-02', '2026-10-03']);
  });

  test('future start date returns the start date first', () => {
    const rule = { frequency: 'weekly', interval: 2, startDate: '2030-01-07' };
    assert.equal(iso(getUpcomingOccurrences(rule, { count: 1, fromDate: '2026-10-01' }))[0], '2030-01-07');
  });

  test('describeRule produces a readable summary', () => {
    assert.equal(describeRule({ frequency: 'weekly', interval: 1 }), 'Every week');
    assert.equal(describeRule({ frequency: 'monthly', interval: 2, endDate: '2026-12-31' }), 'Every 2 months until Dec 31, 2026');
  });
});
