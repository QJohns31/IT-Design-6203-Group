/**
 * Recurring Task Management controller – Deborah Cody
 * CRUD for recurrence rules linked to a task, plus upcoming-occurrence previews.
 */
const { HttpError } = require('../middleware/errors');
const { validateRecurrence } = require('../utils/validators');
const { getUpcomingOccurrences, describeRule } = require('../utils/recurrence');
const { requireObjectId, assertValid, toPlain } = require('./helpers');

function withSchedule(rule, count = 3) {
  const plain = toPlain(rule);
  return {
    ...plain,
    summary: describeRule(plain),
    nextOccurrences: plain.active === false ? [] : getUpcomingOccurrences(plain, { count }),
  };
}

function createRecurrenceController({ RecurrenceRule, Task }) {
  async function ensureTaskExists(taskId) {
    const task = await Task.findById(taskId);
    if (!task) throw new HttpError(404, 'Parent task not found.');
  }

  /** GET /api/recurrences?taskId= */
  async function list(req, res) {
    const filter = {};
    if (req.query.taskId) {
      requireObjectId(req.query.taskId, 'Task ID');
      filter.taskId = req.query.taskId;
    }
    const rules = await RecurrenceRule.find(filter).sort({ startDate: 1 });
    res.json(rules.map((r) => withSchedule(r)));
  }

  /** GET /api/recurrences/:id */
  async function getOne(req, res) {
    requireObjectId(req.params.id, 'Recurrence ID');
    const rule = await RecurrenceRule.findById(req.params.id);
    if (!rule) throw new HttpError(404, 'Recurrence rule not found.');
    res.json(withSchedule(rule, 5));
  }

  /** GET /api/recurrences/:id/occurrences?count=10&from=YYYY-MM-DD */
  async function occurrences(req, res) {
    requireObjectId(req.params.id, 'Recurrence ID');
    const rule = await RecurrenceRule.findById(req.params.id);
    if (!rule) throw new HttpError(404, 'Recurrence rule not found.');

    const count = req.query.count === undefined ? 10 : Number(req.query.count);
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      throw new HttpError(400, 'Count must be a whole number between 1 and 50.');
    }
    const from = req.query.from ? new Date(req.query.from) : new Date();
    if (Number.isNaN(from.getTime())) throw new HttpError(400, 'From must be a valid date.');

    res.json({ id: req.params.id, occurrences: getUpcomingOccurrences(toPlain(rule), { count, fromDate: from }) });
  }

  /** POST /api/recurrences */
  async function create(req, res) {
    const { errors, value } = validateRecurrence(req.body);
    assertValid(errors);
    await ensureTaskExists(value.taskId);
    const existing = await RecurrenceRule.findOne({ taskId: value.taskId });
    if (existing) throw new HttpError(409, 'This task already has a recurrence rule. Edit the existing rule instead.');
    const rule = await RecurrenceRule.create(value);
    res.status(201).json(withSchedule(rule));
  }

  /** PUT /api/recurrences/:id – change frequency, interval, start/end date, or pause/resume */
  async function update(req, res) {
    requireObjectId(req.params.id, 'Recurrence ID');
    const { errors, value } = validateRecurrence(req.body, { partial: true });
    assertValid(errors);
    if (Object.keys(value).length === 0) throw new HttpError(400, 'No valid fields were provided to update.');

    const existing = await RecurrenceRule.findById(req.params.id);
    if (!existing) throw new HttpError(404, 'Recurrence rule not found.');
    if (value.taskId && String(value.taskId) !== String(existing.taskId)) {
      throw new HttpError(400, 'A rule cannot be moved to a different task. Delete it and create a new one.');
    }

    const start = value.startDate || existing.startDate;
    const end = 'endDate' in value ? value.endDate : existing.endDate;
    if (end && new Date(end) < new Date(start)) {
      throw new HttpError(400, 'Validation failed.', ['End date cannot be before the start date.']);
    }

    const rule = await RecurrenceRule.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
    res.json(withSchedule(rule));
  }

  /** DELETE /api/recurrences/:id */
  async function remove(req, res) {
    requireObjectId(req.params.id, 'Recurrence ID');
    const rule = await RecurrenceRule.findByIdAndDelete(req.params.id);
    if (!rule) throw new HttpError(404, 'Recurrence rule not found.');
    res.json({ message: 'Recurrence rule deleted.', id: req.params.id });
  }

  return { list, getOne, occurrences, create, update, remove };
}

module.exports = { createRecurrenceController, withSchedule };
