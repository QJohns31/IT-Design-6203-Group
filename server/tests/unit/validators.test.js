// Unit tests – shared validation rules for all four components
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const v = require('../../utils/validators');

describe('validators', () => {
  test('isObjectId accepts 24-hex strings only', () => {
    assert.equal(v.isObjectId('66f1a2b3c4d5e6f708192a3b'), true);
    assert.equal(v.isObjectId('123'), false);
    assert.equal(v.isObjectId(null), false);
  });

  test('validateTask requires a title and trims it', () => {
    assert.deepEqual(v.validateTask({}).errors, ['Title is required.']);
    assert.equal(v.validateTask({ title: '  Buy milk  ' }).value.title, 'Buy milk');
  });

  test('validateTask rejects bad priority, status, date and category', () => {
    const { errors } = v.validateTask({ title: 'x', priority: 'Urgent', status: 'Done', dueDate: 'not-a-date', categoryId: 'abc' });
    assert.equal(errors.length, 4);
  });

  test('validateTask partial mode allows a status-only update', () => {
    const { errors, value } = v.validateTask({ status: 'Completed' }, { partial: true });
    assert.deepEqual(errors, []);
    assert.deepEqual(value, { status: 'Completed' });
  });

  test('validateTask converts empty categoryId/dueDate to null (un-assign)', () => {
    const { value } = v.validateTask({ title: 't', categoryId: '', dueDate: '' });
    assert.equal(value.categoryId, null);
    assert.equal(value.dueDate, null);
  });

  test('validateCategory checks name and hex colour', () => {
    assert.deepEqual(v.validateCategory({ name: '' }).errors, ['Category name is required.']);
    assert.equal(v.validateCategory({ name: 'Work', color: 'blue' }).errors.length, 1);
    assert.deepEqual(v.validateCategory({ name: 'Work', color: '#ABC' }).errors, []);
  });

  test('validateReminderSubtask requires remindAt for reminders but not subtasks', () => {
    const taskId = '66f1a2b3c4d5e6f708192a3b';
    assert.ok(v.validateReminderSubtask({ taskId, type: 'reminder', text: 'Call' }).errors.includes('A reminder needs a date and time.'));
    assert.deepEqual(v.validateReminderSubtask({ taskId, type: 'subtask', text: 'Step 1' }).errors, []);
  });

  test('validateRecurrence enforces frequency, interval range and end >= start', () => {
    const taskId = '66f1a2b3c4d5e6f708192a3b';
    const bad = v.validateRecurrence({ taskId, frequency: 'yearly', interval: 0, startDate: '2026-10-10', endDate: '2026-10-01' });
    assert.ok(bad.errors.some((e) => e.startsWith('Frequency')));
    assert.ok(bad.errors.some((e) => e.startsWith('Interval')));
    assert.ok(bad.errors.includes('End date cannot be before the start date.'));
    const good = v.validateRecurrence({ taskId, frequency: 'weekly', startDate: '2026-10-10' });
    assert.deepEqual(good.errors, []);
    assert.equal(good.value.interval, 1); // default interval
  });

  test('validateWeatherQuery requires city and YYYY-MM-DD date', () => {
    assert.ok(v.validateWeatherQuery({}).errors.includes('City is required.'));
    assert.ok(v.validateWeatherQuery({ city: 'Nassau', date: '10/05/2026' }).errors.length === 1);
    assert.deepEqual(v.validateWeatherQuery({ city: 'Nassau', date: '2026-10-05' }).errors, []);
  });
});
