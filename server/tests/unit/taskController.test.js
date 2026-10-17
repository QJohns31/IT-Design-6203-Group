// Unit tests – Task Management controller (Quzhan Johnson)
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createFakeModels, call, newId } = require('../helpers/fakeModel');
const { createTaskController } = require('../../controllers/taskController');

let models;
let c;
beforeEach(() => {
  models = createFakeModels();
  c = createTaskController(models);
});

describe('Task Management – CRUD', () => {
  test('CREATE: valid task returns 201 with defaults', async () => {
    const r = await call(c.create, { body: { title: 'Write report', dueDate: '2026-10-05' } });
    assert.equal(r.status, 201);
    assert.equal(r.body.title, 'Write report');
    assert.equal(r.body.priority, 'Medium');
    assert.equal(r.body.status, 'Pending');
    assert.equal(r.body.dueDate, '2026-10-05T00:00:00.000Z');
  });

  test('CREATE: missing title returns 400 with message', async () => {
    const r = await call(c.create, { body: { description: 'no title' } });
    assert.equal(r.status, 400);
    assert.deepEqual(r.body.details, ['Title is required.']);
  });

  test('CREATE: unknown category returns 400', async () => {
    const r = await call(c.create, { body: { title: 'x', categoryId: newId() } });
    assert.equal(r.status, 400);
    assert.match(r.body.message, /category does not exist/);
  });

  test('READ: list filters by priority, status, category and search text', async () => {
    const work = await models.Category.create({ name: 'Work' });
    await models.Task.create({ title: 'Email client', priority: 'High', status: 'Pending', categoryId: work._id });
    await models.Task.create({ title: 'Buy groceries', description: 'milk and eggs', priority: 'Low', status: 'Completed' });
    await models.Task.create({ title: 'Plan sprint', priority: 'High', status: 'In Progress', categoryId: work._id });

    assert.equal((await call(c.list, { query: { priority: 'High' } })).body.length, 2);
    assert.equal((await call(c.list, { query: { status: 'Completed' } })).body.length, 1);
    assert.equal((await call(c.list, { query: { categoryId: work._id } })).body.length, 2);
    assert.equal((await call(c.list, { query: { categoryId: 'none' } })).body.length, 1);
    assert.equal((await call(c.list, { query: { search: 'MILK' } })).body[0].title, 'Buy groceries');
  });

  test('READ: search text with regex characters is treated literally', async () => {
    await models.Task.create({ title: 'Fix (urgent) bug' });
    const r = await call(c.list, { query: { search: '(urgent)' } });
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 1);
  });

  test('READ: sort=priority orders High, Medium, Low', async () => {
    await models.Task.create({ title: 'a', priority: 'Low' });
    await models.Task.create({ title: 'b', priority: 'High' });
    await models.Task.create({ title: 'c', priority: 'Medium' });
    const r = await call(c.list, { query: { sort: 'priority' } });
    assert.deepEqual(r.body.map((t) => t.priority), ['High', 'Medium', 'Low']);
  });

  test('READ: due date range filter', async () => {
    await models.Task.create({ title: 'early', dueDate: new Date('2026-10-01') });
    await models.Task.create({ title: 'mid', dueDate: new Date('2026-10-05') });
    await models.Task.create({ title: 'late', dueDate: new Date('2026-10-20') });
    const r = await call(c.list, { query: { dueFrom: '2026-10-02', dueTo: '2026-10-05' } });
    assert.deepEqual(r.body.map((t) => t.title), ['mid']);
  });

  test('READ: getOne returns 404 for missing and 400 for malformed id', async () => {
    assert.equal((await call(c.getOne, { params: { id: newId() } })).status, 404);
    assert.equal((await call(c.getOne, { params: { id: 'bad' } })).status, 400);
  });

  test('UPDATE: changes only the provided fields', async () => {
    const t = await models.Task.create({ title: 'Draft', priority: 'Low' });
    const r = await call(c.update, { params: { id: t._id }, body: { status: 'Completed' } });
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'Completed');
    assert.equal(r.body.title, 'Draft');
    assert.equal(r.body.priority, 'Low');
  });

  test('UPDATE: invalid status returns 400, empty body returns 400', async () => {
    const t = await models.Task.create({ title: 'Draft' });
    assert.equal((await call(c.update, { params: { id: t._id }, body: { status: 'Done' } })).status, 400);
    assert.equal((await call(c.update, { params: { id: t._id }, body: {} })).status, 400);
  });

  test('DELETE: removes the task and its reminders/subtasks and recurrence rule', async () => {
    const t = await models.Task.create({ title: 'Groceries' });
    await models.ReminderSubtask.create({ taskId: t._id, type: 'subtask', text: 'Milk' });
    await models.RecurrenceRule.create({ taskId: t._id, frequency: 'weekly', startDate: new Date() });
    const r = await call(c.remove, { params: { id: t._id } });
    assert.equal(r.status, 200);
    assert.equal(r.body.removedRemindersAndSubtasks, 1);
    assert.equal(r.body.removedRecurrenceRules, 1);
    assert.equal(await models.Task.countDocuments(), 0);
  });

  test('DELETE: missing task returns 404', async () => {
    assert.equal((await call(c.remove, { params: { id: newId() } })).status, 404);
  });
});
