// Unit tests – Category & List Management controller (Aderoju Okunlola)
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createFakeModels, call, newId } = require('../helpers/fakeModel');
const { createCategoryController } = require('../../controllers/categoryController');

let models;
let c;
beforeEach(() => {
  models = createFakeModels();
  c = createCategoryController(models);
});

describe('Category & List Management – CRUD', () => {
  test('CREATE: valid category returns 201 with default colour/icon', async () => {
    const r = await call(c.create, { body: { name: 'Work' } });
    assert.equal(r.status, 201);
    assert.equal(r.body.color, '#4f46e5');
    assert.equal(r.body.icon, '📁');
  });

  test('CREATE: duplicate name (any case) returns 409', async () => {
    await call(c.create, { body: { name: 'Work' } });
    const r = await call(c.create, { body: { name: 'work' } });
    assert.equal(r.status, 409);
  });

  test('CREATE: invalid colour returns 400', async () => {
    assert.equal((await call(c.create, { body: { name: 'X', color: 'red' } })).status, 400);
  });

  test('READ: list includes task counts and uncategorized count', async () => {
    const work = await models.Category.create({ name: 'Work' });
    await models.Category.create({ name: 'Home' });
    await models.Task.create({ title: 'a', categoryId: work._id });
    await models.Task.create({ title: 'b', categoryId: work._id });
    await models.Task.create({ title: 'c' });
    const r = await call(c.list, {});
    assert.deepEqual(r.body.categories.map((x) => [x.name, x.taskCount]), [['Home', 0], ['Work', 2]]);
    assert.equal(r.body.uncategorizedCount, 1);
  });

  test('READ: getOne returns the category with its tasks', async () => {
    const work = await models.Category.create({ name: 'Work' });
    await models.Task.create({ title: 'a', categoryId: work._id });
    const r = await call(c.getOne, { params: { id: work._id } });
    assert.equal(r.body.name, 'Work');
    assert.equal(r.body.tasks.length, 1);
  });

  test('UPDATE: rename and recolour; renaming to an existing name returns 409', async () => {
    const work = await models.Category.create({ name: 'Work' });
    await models.Category.create({ name: 'Home' });
    const ok = await call(c.update, { params: { id: work._id }, body: { name: 'Office', color: '#ff0000', icon: '🏢' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.name, 'Office');
    assert.equal(ok.body.icon, '🏢');
    const clash = await call(c.update, { params: { id: work._id }, body: { name: 'home' } });
    assert.equal(clash.status, 409);
    // Keeping its own name (e.g. only changing case) is allowed
    assert.equal((await call(c.update, { params: { id: work._id }, body: { name: 'OFFICE' } })).status, 200);
  });

  test('DELETE (default unassign): tasks remain but become uncategorized', async () => {
    const work = await models.Category.create({ name: 'Work' });
    await models.Task.create({ title: 'a', categoryId: work._id });
    const r = await call(c.remove, { params: { id: work._id }, query: {} });
    assert.equal(r.body.mode, 'unassign');
    assert.equal(r.body.affectedTasks, 1);
    assert.equal(await models.Task.countDocuments({ categoryId: null }), 1);
    assert.equal(await models.Category.countDocuments(), 0);
  });

  test('DELETE (reassign): tasks move to the target category', async () => {
    const work = await models.Category.create({ name: 'Work' });
    const home = await models.Category.create({ name: 'Home' });
    await models.Task.create({ title: 'a', categoryId: work._id });
    const r = await call(c.remove, { params: { id: work._id }, query: { mode: 'reassign', targetId: home._id } });
    assert.equal(r.status, 200);
    assert.equal(await models.Task.countDocuments({ categoryId: home._id }), 1);
  });

  test('DELETE (reassign): target must exist and differ from the deleted category', async () => {
    const work = await models.Category.create({ name: 'Work' });
    assert.equal((await call(c.remove, { params: { id: work._id }, query: { mode: 'reassign', targetId: work._id } })).status, 400);
    assert.equal((await call(c.remove, { params: { id: work._id }, query: { mode: 'reassign', targetId: newId() } })).status, 400);
    assert.equal(await models.Category.countDocuments(), 1); // nothing was deleted
  });

  test('DELETE (delete): removes tasks and their reminders/subtasks/recurrence', async () => {
    const work = await models.Category.create({ name: 'Work' });
    const t = await models.Task.create({ title: 'a', categoryId: work._id });
    await models.Task.create({ title: 'keep me' });
    await models.ReminderSubtask.create({ taskId: t._id, type: 'subtask', text: 's' });
    await models.RecurrenceRule.create({ taskId: t._id, frequency: 'daily', startDate: new Date() });
    const r = await call(c.remove, { params: { id: work._id }, query: { mode: 'delete' } });
    assert.equal(r.body.affectedTasks, 1);
    assert.equal(await models.Task.countDocuments(), 1);
    assert.equal(await models.ReminderSubtask.countDocuments(), 0);
    assert.equal(await models.RecurrenceRule.countDocuments(), 0);
  });

  test('DELETE: unknown mode returns 400, missing category returns 404', async () => {
    const work = await models.Category.create({ name: 'Work' });
    assert.equal((await call(c.remove, { params: { id: work._id }, query: { mode: 'archive' } })).status, 400);
    assert.equal((await call(c.remove, { params: { id: newId() }, query: {} })).status, 404);
  });
});
