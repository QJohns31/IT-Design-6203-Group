// Unit tests – framework-free helpers (run by the Angular test runner and by Node in CI)
import { canShowWeather, countByStatus, dueLabel, dueReminders, errorMessage, isOverdue } from './task-utils';
import { fromDateTimeLocalInput, toDateInput, toDateTimeLocalInput } from './date-utils';
import { ReminderSubtask } from '../models/models';

const NOW = new Date(2026, 9, 10, 12, 0, 0); // Oct 10 2026, 12:00 local

describe('task-utils', () => {
  it('flags overdue tasks unless completed', () => {
    expect(isOverdue({ dueDate: '2026-10-09T00:00:00.000Z', status: 'Pending' }, NOW)).toBe(true);
    expect(isOverdue({ dueDate: '2026-10-09T00:00:00.000Z', status: 'Completed' }, NOW)).toBe(false);
    expect(isOverdue({ dueDate: '2026-10-10T00:00:00.000Z', status: 'Pending' }, NOW)).toBe(false);
    expect(isOverdue({ dueDate: null, status: 'Pending' }, NOW)).toBe(false);
  });

  it('builds friendly due labels', () => {
    expect(dueLabel({ dueDate: '2026-10-10T00:00:00.000Z', status: 'Pending' }, NOW)).toBe('Due today');
    expect(dueLabel({ dueDate: '2026-10-11T00:00:00.000Z', status: 'Pending' }, NOW)).toBe('Due tomorrow');
    expect(dueLabel({ dueDate: '2026-10-13T00:00:00.000Z', status: 'Pending' }, NOW)).toBe('Due in 3 days');
    expect(dueLabel({ dueDate: '2026-10-08T00:00:00.000Z', status: 'Pending' }, NOW)).toBe('2 days overdue');
  });

  it('offers weather only for tasks with a location due within 5 days', () => {
    expect(canShowWeather({ dueDate: '2026-10-12T00:00:00.000Z', location: 'Nassau' }, NOW)).toBe(true);
    expect(canShowWeather({ dueDate: '2026-10-20T00:00:00.000Z', location: 'Nassau' }, NOW)).toBe(false);
    expect(canShowWeather({ dueDate: '2026-10-12T00:00:00.000Z', location: '' }, NOW)).toBe(false);
  });

  it('counts tasks by status', () => {
    expect(countByStatus([{ status: 'Pending' }, { status: 'Pending' }, { status: 'Completed' }]))
      .toEqual({ Pending: 2, 'In Progress': 0, Completed: 1 });
  });

  it('finds reminders that are due and not dismissed', () => {
    const items: ReminderSubtask[] = [
      { _id: '1', taskId: 't', type: 'reminder', text: 'past', remindAt: '2026-10-10T10:00:00', completed: false },
      { _id: '2', taskId: 't', type: 'reminder', text: 'future', remindAt: '2026-10-11T10:00:00', completed: false },
      { _id: '3', taskId: 't', type: 'reminder', text: 'done', remindAt: '2026-10-01T10:00:00', completed: true },
      { _id: '4', taskId: 't', type: 'subtask', text: 'sub', remindAt: null, completed: false },
    ];
    expect(dueReminders(items, NOW).map((i) => i._id)).toEqual(['1']);
  });

  it('extracts API error messages', () => {
    expect(errorMessage({ status: 0 })).toContain('Cannot reach the server');
    expect(errorMessage({ status: 400, error: { message: 'Validation failed.', details: ['Title is required.'] } }))
      .toBe('Validation failed. Title is required.');
  });

  it('converts between API ISO strings and form input values', () => {
    expect(toDateInput('2026-10-05T00:00:00.000Z')).toBe('2026-10-05');
    expect(toDateInput(null)).toBe('');
    const local = '2026-10-05T09:30';
    expect(toDateTimeLocalInput(fromDateTimeLocalInput(local))).toBe(local);
    expect(fromDateTimeLocalInput('')).toBeNull();
  });
});
