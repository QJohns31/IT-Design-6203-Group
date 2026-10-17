/**
 * Category & List Management controller – Aderoju Okunlola
 * CRUD for categories. Deleting a category lets the user choose what happens to its tasks:
 *   ?mode=unassign  (default) tasks stay but become "Uncategorized"
 *   ?mode=reassign&targetId=<categoryId>  tasks move to another category
 *   ?mode=delete    tasks (and their reminders/subtasks/recurrence rules) are removed
 */
const { HttpError } = require('../middleware/errors');
const { validateCategory } = require('../utils/validators');
const { requireObjectId, assertValid, escapeRegex, toPlain } = require('./helpers');

function createCategoryController({ Category, Task, ReminderSubtask, RecurrenceRule }) {
  async function ensureNameIsFree(name, excludeId) {
    const filter = { name: new RegExp(`^${escapeRegex(name)}$`, 'i') };
    if (excludeId) filter._id = { $ne: excludeId };
    const existing = await Category.findOne(filter);
    if (existing) throw new HttpError(409, `A category named "${name}" already exists.`);
  }

  /** GET /api/categories – every category with the number of tasks assigned to it */
  async function list(req, res) {
    const categories = await Category.find({}).sort({ name: 1 });
    const withCounts = await Promise.all(
      categories.map(async (c) => ({
        ...toPlain(c),
        taskCount: await Task.countDocuments({ categoryId: c._id }),
      }))
    );
    const uncategorizedCount = await Task.countDocuments({ categoryId: null });
    res.json({ categories: withCounts, uncategorizedCount });
  }

  /** GET /api/categories/:id – one category and the tasks assigned to it */
  async function getOne(req, res) {
    requireObjectId(req.params.id, 'Category ID');
    const category = await Category.findById(req.params.id);
    if (!category) throw new HttpError(404, 'Category not found.');
    const tasks = await Task.find({ categoryId: req.params.id }).sort({ dueDate: 1 });
    res.json({ ...toPlain(category), tasks });
  }

  /** POST /api/categories */
  async function create(req, res) {
    const { errors, value } = validateCategory(req.body);
    assertValid(errors);
    await ensureNameIsFree(value.name);
    const category = await Category.create(value);
    res.status(201).json(category);
  }

  /** PUT /api/categories/:id – rename or change colour/icon/description */
  async function update(req, res) {
    requireObjectId(req.params.id, 'Category ID');
    const { errors, value } = validateCategory(req.body, { partial: true });
    assertValid(errors);
    if (Object.keys(value).length === 0) throw new HttpError(400, 'No valid fields were provided to update.');
    if (value.name) await ensureNameIsFree(value.name, req.params.id);

    const category = await Category.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
    if (!category) throw new HttpError(404, 'Category not found.');
    res.json(category);
  }

  /** DELETE /api/categories/:id?mode=unassign|reassign|delete&targetId= */
  async function remove(req, res) {
    const { id } = req.params;
    requireObjectId(id, 'Category ID');
    const mode = req.query.mode || 'unassign';
    if (!['unassign', 'reassign', 'delete'].includes(mode)) {
      throw new HttpError(400, 'Mode must be "unassign", "reassign" or "delete".');
    }

    const category = await Category.findById(id);
    if (!category) throw new HttpError(404, 'Category not found.');

    let affectedTasks = 0;
    if (mode === 'reassign') {
      const { targetId } = req.query;
      requireObjectId(targetId, 'Target category ID');
      if (targetId === id) throw new HttpError(400, 'Choose a different category to move the tasks into.');
      const target = await Category.findById(targetId);
      if (!target) throw new HttpError(400, 'The target category does not exist.');
      const result = await Task.updateMany({ categoryId: id }, { $set: { categoryId: targetId } });
      affectedTasks = result.modifiedCount || 0;
    } else if (mode === 'delete') {
      const tasks = await Task.find({ categoryId: id });
      const taskIds = tasks.map((t) => t._id);
      if (taskIds.length) {
        await ReminderSubtask.deleteMany({ taskId: { $in: taskIds } });
        await RecurrenceRule.deleteMany({ taskId: { $in: taskIds } });
      }
      const result = await Task.deleteMany({ categoryId: id });
      affectedTasks = result.deletedCount || 0;
    } else {
      const result = await Task.updateMany({ categoryId: id }, { $set: { categoryId: null } });
      affectedTasks = result.modifiedCount || 0;
    }

    await Category.findByIdAndDelete(id);
    res.json({ message: 'Category deleted.', id, mode, affectedTasks });
  }

  return { list, getOne, create, update, remove };
}

module.exports = { createCategoryController };
