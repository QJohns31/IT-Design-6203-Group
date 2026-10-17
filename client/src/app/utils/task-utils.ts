/**
 * Framework-free task helpers used by the Task Management component (Quzhan Johnson)
 * and the Reminder & Subtask component (Lakshmi Pranathi Priya Ega).
 */
import { Priority, ReminderSubtask, Status, Task } from '../models/models';
import { daysUntil } from './date-utils';

export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];
export const STATUSES: Status[] = ['Pending', 'In Progress', 'Completed'];

/** A task is overdue when it has a due date before today and is not completed. */
export function isOverdue(task: Pick<Task, 'dueDate' | 'status'>, now: Date = new Date()): boolean {
  const days = daysUntil(task.dueDate, now);
  return days !== null && days < 0 && task.status !== 'Completed';
}

/** The weather forecast is only offered for tasks due within the API's 5-day window. */
export function canShowWeather(task: Pick<Task, 'dueDate' | 'location'>, now: Date = new Date()): boolean {
  const days = daysUntil(task.dueDate, now);
  return !!task.location && days !== null && days >= 0 && days <= 5;
}

/** Friendly due label such as "Due today", "Due in 3 days", "2 days overdue". */
export function dueLabel(task: Pick<Task, 'dueDate' | 'status'>, now: Date = new Date()): string {
  const days = daysUntil(task.dueDate, now);
  if (days === null) return 'No due date';
  if (task.status === 'Completed') return 'Done';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 1) return `Due in ${days} days`;
  return days === -1 ? '1 day overdue' : `${-days} days overdue`;
}

/** Counts of tasks per status, used for the summary chips at the top of the Tasks page. */
export function countByStatus(tasks: Pick<Task, 'status'>[]): Record<Status, number> {
  const counts: Record<Status, number> = { Pending: 0, 'In Progress': 0, Completed: 0 };
  for (const t of tasks) counts[t.status] += 1;
  return counts;
}

/** Reminders whose time has passed and that have not been ticked off. */
export function dueReminders(items: ReminderSubtask[], now: Date = new Date()): ReminderSubtask[] {
  return items.filter((i) => i.type === 'reminder' && !i.completed && !!i.remindAt && new Date(i.remindAt) <= now);
}

/** Pulls a readable message out of an HttpErrorResponse-like object. */
export function errorMessage(err: unknown): string {
  const e = err as { status?: number; error?: { message?: string; details?: string[] } };
  if (e && e.status === 0) return 'Cannot reach the server. Is the Express API running on port 3000?';
  const body = e && e.error;
  if (body && body.details && body.details.length) return `${body.message} ${body.details.join(' ')}`;
  if (body && body.message) return body.message;
  return 'Something went wrong. Please try again.';
}
