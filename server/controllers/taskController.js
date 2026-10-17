/**
 * Task Management controller – Quzhan Johnson
 * CRUD for tasks plus search/filter. Models are injected so the logic can be
 * unit-tested with an in-memory fake (see tests/helpers/fakeModel.js).
 */
const { HttpError } = require('../middleware/errors');
const { validateTask, PRIORITIES, STATUSES } = require('../utils/validators');
const { requireObjectId, assertValid, escapeRegex } = require('./helpers');

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

function createTaskController({ Task, Category, ReminderSubtask, RecurrenceRule }) {
  async function ensureCategoryExists(categoryId) {
    if (!categoryId) return;
    const category = await Category.findById(categoryId);
    if (!category) throw new HttpError(400, 'The selected category does not exist.');
  }

  /** GET /api/tasks?search=&categoryId=&priority=&status=&dueFrom=&dueTo=&sort= */
  async function list(req, res) {
    const { search, categoryId, priority, status, dueFrom, dueTo, sort } = req.query;
    const filter = {};

    if (categoryId === 'none') filter.categoryId = null;
    else if (categoryId) {
      requireObjectId(categoryId, 'Category ID');
      filter.categoryId = categoryId;
    }
    if (priority) {
      if (!PRIORITIES.includes(priority)) throw new HttpError(400, 'Unknown priority filter.');
      filter.priority = priority;
    }
    if (status) {
      if (!STATUSES.includes(status)) throw new HttpError(400, 'Unknown status filter.');
      filter.status = status;
    }
    if (search) {
      const re = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ title: re }, { description: re }];
    }
    if (dueFrom || dueTo) {
      filter.dueDate = {};
      if (dueFrom) filter.dueDate.$gte = new Date(dueFrom);
      if (dueTo) filter.dueDate.$lte = new Date(`${dueTo}T23:59:59.999Z`);
      if (Object.values(filter.dueDate).some((d) => Number.isNaN(d.getTime()))) {
        throw new HttpError(400, 'Due date filters must be valid dates (YYYY-MM-DD).');
      }
    }

    const sortMap = {
      dueDate: { dueDate: 1, createdAt: -1 },
      title: { title: 1 },
      createdAt: { createdAt: -1 },
    };
    let tasks = await Task.find(filter).sort(sortMap[sort] || sortMap.createdAt);

    // Priority has a business order (High > Medium > Low), so it is sorted in code.
    if (sort === 'priority') {
      tasks = [...tasks].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    }
    res.json(tasks);
  }

  /** GET /api/tasks/:id */
  async function getOne(req, res) {
    requireObjectId(req.params.id, 'Task ID');
    const task = await Task.findById(req.params.id);
    if (!task) throw new HttpError(404, 'Task not found.');
    res.json(task);
  }

  /** POST /api/tasks */
  async function create(req, res) {
    const { errors, value } = validateTask(req.body);
    assertValid(errors);
    await ensureCategoryExists(value.categoryId);
    const task = await Task.create(value);
    res.status(201).json(task);
  }

  /** PUT /api/tasks/:id */
  async function update(req, res) {
    requireObjectId(req.params.id, 'Task ID');
    const { errors, value } = validateTask(req.body, { partial: true });
    assertValid(errors);
    if (Object.keys(value).length === 0) throw new HttpError(400, 'No valid fields were provided to update.');
    await ensureCategoryExists(value.categoryId);

    const task = await Task.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
    if (!task) throw new HttpError(404, 'Task not found.');
    res.json(task);
  }

  /** DELETE /api/tasks/:id – also removes the task's reminders/subtasks and recurrence rule. */
  async function remove(req, res) {
    requireObjectId(req.params.id, 'Task ID');
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) throw new HttpError(404, 'Task not found.');

    const items = await ReminderSubtask.deleteMany({ taskId: req.params.id });
    const rules = await RecurrenceRule.deleteMany({ taskId: req.params.id });
    res.json({
      message: 'Task deleted.',
      id: req.params.id,
      removedRemindersAndSubtasks: items.deletedCount || 0,
      removedRecurrenceRules: rules.deletedCount || 0,
    });
  }

  return { list, getOne, create, update, remove };
}

module.exports = { createTaskController };
