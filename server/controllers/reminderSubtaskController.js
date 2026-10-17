/**
 * Reminder & Subtask Management controller – Lakshmi Pranathi Priya Ega
 * CRUD for reminders (date/time alerts) and subtasks (checklist items) that belong to a task.
 */
const { HttpError } = require('../middleware/errors');
const { validateReminderSubtask, ITEM_TYPES } = require('../utils/validators');
const { requireObjectId, assertValid } = require('./helpers');

function createReminderSubtaskController({ ReminderSubtask, Task }) {
  async function ensureTaskExists(taskId) {
    const task = await Task.findById(taskId);
    if (!task) throw new HttpError(404, 'Parent task not found.');
  }

  /** GET /api/items?taskId=&type=reminder|subtask */
  async function list(req, res) {
    const { taskId, type } = req.query;
    const filter = {};
    if (taskId) {
      requireObjectId(taskId, 'Task ID');
      filter.taskId = taskId;
    }
    if (type) {
      if (!ITEM_TYPES.includes(type)) throw new HttpError(400, 'Type must be "reminder" or "subtask".');
      filter.type = type;
    }
    const items = await ReminderSubtask.find(filter).sort({ type: 1, completed: 1, remindAt: 1, createdAt: 1 });

    const subtasks = items.filter((i) => i.type === 'subtask');
    const done = subtasks.filter((i) => i.completed).length;
    res.json({
      items,
      progress: {
        subtasksTotal: subtasks.length,
        subtasksDone: done,
        percent: subtasks.length ? Math.round((done / subtasks.length) * 100) : 0,
      },
    });
  }

  /** GET /api/items/:id */
  async function getOne(req, res) {
    requireObjectId(req.params.id, 'Item ID');
    const item = await ReminderSubtask.findById(req.params.id);
    if (!item) throw new HttpError(404, 'Reminder/subtask not found.');
    res.json(item);
  }

  /** POST /api/items */
  async function create(req, res) {
    const { errors, value } = validateReminderSubtask(req.body);
    assertValid(errors);
    await ensureTaskExists(value.taskId);
    const item = await ReminderSubtask.create(value);
    res.status(201).json(item);
  }

  /** PUT /api/items/:id – edit text, reminder date/time, or completed status */
  async function update(req, res) {
    requireObjectId(req.params.id, 'Item ID');
    const { errors, value } = validateReminderSubtask(req.body, { partial: true });
    assertValid(errors);
    if (Object.keys(value).length === 0) throw new HttpError(400, 'No valid fields were provided to update.');

    const existing = await ReminderSubtask.findById(req.params.id);
    if (!existing) throw new HttpError(404, 'Reminder/subtask not found.');
    if (value.taskId) await ensureTaskExists(value.taskId);

    // Business rule: the resulting item must still be valid as a whole.
    const finalType = value.type || existing.type;
    const finalRemindAt = 'remindAt' in value ? value.remindAt : existing.remindAt;
    if (finalType === 'reminder' && !finalRemindAt) {
      throw new HttpError(400, 'Validation failed.', ['A reminder needs a date and time.']);
    }

    const item = await ReminderSubtask.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
    res.json(item);
  }

  /** PATCH /api/items/:id/toggle – quick check/uncheck */
  async function toggle(req, res) {
    requireObjectId(req.params.id, 'Item ID');
    const existing = await ReminderSubtask.findById(req.params.id);
    if (!existing) throw new HttpError(404, 'Reminder/subtask not found.');
    const item = await ReminderSubtask.findByIdAndUpdate(
      req.params.id,
      { completed: !existing.completed },
      { new: true, runValidators: true }
    );
    res.json(item);
  }

  /** DELETE /api/items/:id */
  async function remove(req, res) {
    requireObjectId(req.params.id, 'Item ID');
    const item = await ReminderSubtask.findByIdAndDelete(req.params.id);
    if (!item) throw new HttpError(404, 'Reminder/subtask not found.');
    res.json({ message: 'Item deleted.', id: req.params.id });
  }

  return { list, getOne, create, update, toggle, remove };
}

module.exports = { createReminderSubtaskController };
