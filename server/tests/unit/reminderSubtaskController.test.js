// Unit tests – Reminder & Subtask Management controller (Lakshmi Pranathi Priya Ega)
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createFakeModels, call, newId } = require('../helpers/fakeModel');
const { createReminderSubtaskController } = require('../../controllers/reminderSubtaskController');

let models;
let c;
let task;
beforeEach(async () => {
  models = createFakeModels();
  c = createReminderSubtaskController(models);
  task = await models.Task.create({ title: 'Project report' });
});

describe('Reminder & Subtask Management – CRUD', () => {
  test('CREATE: subtask linked to a task returns 201', async () => {
    const r = await call(c.create, { body: { taskId: task._id, type: 'subtask', text: 'Write intro' } });
    assert.equal(r.status, 201);
    assert.equal(r.body.completed, false);
  });

  test('CREATE: reminder requires remindAt', async () => {
    const bad = await call(c.create, { body: { taskId: task._id, type: 'reminder', text: 'Submit' } });
    assert.equal(bad.status, 400);
    const ok = await call(c.create, { body: { taskId: task._id, type: 'reminder', text: 'Submit', remindAt: '2026-10-05T13:00:00.000Z' } });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.remindAt, '2026-10-05T13:00:00.000Z');
  });

  test('CREATE: parent task must exist', async () => {
    const r = await call(c.create, { body: { taskId: newId(), type: 'subtask', text: 'x' } });
    assert.equal(r.status, 404);
  });

  test('READ: list by task returns items and subtask progress', async () => {
    await models.ReminderSubtask.create({ taskId: task._id, type: 'subtask', text: 'a', completed: true });
    await models.ReminderSubtask.create({ taskId: task._id, type: 'subtask', text: 'b', completed: false });
    await models.ReminderSubtask.create({ taskId: task._id, type: 'reminder', text: 'r', remindAt: new Date() });
    const other = await models.Task.create({ title: 'other' });
    await models.ReminderSubtask.create({ taskId: other._id, type: 'subtask', text: 'z' });

    const r = await call(c.list, { query: { taskId: task._id } });
    assert.equal(r.body.items.length, 3);
    assert.deepEqual(r.body.progress, { subtasksTotal: 2, subtasksDone: 1, percent: 50 });
    const onlyReminders = await call(c.list, { query: { taskId: task._id, type: 'reminder' } });
    assert.equal(onlyReminders.body.items.length, 1);
  });

  test('UPDATE: edit subtask text and status', async () => {
    const item = await models.ReminderSubtask.create({ taskId: task._id, type: 'subtask', text: 'old' });
    const r = await call(c.update, { params: { id: item._id }, body: { text: 'new', completed: true } });
    assert.equal(r.body.text, 'new');
    assert.equal(r.body.completed, true);
  });

  test('UPDATE: edit a reminder date/time; clearing it is rejected', async () => {
    const item = await models.ReminderSubtask.create({ taskId: task._id, type: 'reminder', text: 'r', remindAt: new Date('2026-10-01T10:00:00Z') });
    const ok = await call(c.update, { params: { id: item._id }, body: { remindAt: '2026-10-02T09:30:00.000Z' } });
    assert.equal(ok.body.remindAt, '2026-10-02T09:30:00.000Z');
    const bad = await call(c.update, { params: { id: item._id }, body: { remindAt: null } });
    assert.equal(bad.status, 400);
  });

  test('UPDATE: toggle flips completed', async () => {
    const item = await models.ReminderSubtask.create({ taskId: task._id, type: 'subtask', text: 's' });
    assert.equal((await call(c.toggle, { params: { id: item._id } })).body.completed, true);
    assert.equal((await call(c.toggle, { params: { id: item._id } })).body.completed, false);
  });

  test('DELETE: removes item; second delete returns 404', async () => {
    const item = await models.ReminderSubtask.create({ taskId: task._id, type: 'subtask', text: 's' });
    assert.equal((await call(c.remove, { params: { id: item._id } })).status, 200);
    assert.equal((await call(c.remove, { params: { id: item._id } })).status, 404);
  });
});
