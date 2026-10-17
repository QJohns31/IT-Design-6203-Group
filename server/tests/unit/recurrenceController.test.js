// Unit tests – Recurring Task Management controller (Deborah Cody)
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createFakeModels, call, newId } = require('../helpers/fakeModel');
const { createRecurrenceController } = require('../../controllers/recurrenceController');

let models;
let c;
let task;
const future = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

beforeEach(async () => {
  models = createFakeModels();
  c = createRecurrenceController(models);
  task = await models.Task.create({ title: 'Water plants' });
});

describe('Recurring Task Management – CRUD', () => {
  test('CREATE: weekly rule returns 201 with summary and next occurrences', async () => {
    const r = await call(c.create, { body: { taskId: task._id, frequency: 'weekly', interval: 1, startDate: future(1) } });
    assert.equal(r.status, 201);
    assert.equal(r.body.summary, 'Every week');
    assert.equal(r.body.nextOccurrences.length, 3);
    assert.equal(r.body.nextOccurrences[0].slice(0, 10), future(1));
  });

  test('CREATE: only one rule per task (409) and task must exist (404)', async () => {
    await call(c.create, { body: { taskId: task._id, frequency: 'daily', startDate: future(0) } });
    assert.equal((await call(c.create, { body: { taskId: task._id, frequency: 'daily', startDate: future(0) } })).status, 409);
    assert.equal((await call(c.create, { body: { taskId: newId(), frequency: 'daily', startDate: future(0) } })).status, 404);
  });

  test('CREATE: invalid frequency/interval returns 400', async () => {
    const r = await call(c.create, { body: { taskId: task._id, frequency: 'hourly', interval: -1, startDate: future(0) } });
    assert.equal(r.status, 400);
    assert.equal(r.body.details.length, 2);
  });

  test('READ: list by task and occurrences endpoint', async () => {
    const rule = await models.RecurrenceRule.create({ taskId: task._id, frequency: 'daily', interval: 2, startDate: new Date('2026-10-01'), endDate: null, active: true });
    const list = await call(c.list, { query: { taskId: task._id } });
    assert.equal(list.body.length, 1);
    const occ = await call(c.occurrences, { params: { id: rule._id }, query: { count: '3', from: '2026-10-02' } });
    assert.deepEqual(occ.body.occurrences.map((d) => d.slice(0, 10)), ['2026-10-03', '2026-10-05', '2026-10-07']);
    assert.equal((await call(c.occurrences, { params: { id: rule._id }, query: { count: '0' } })).status, 400);
  });

  test('READ: paused rule shows no upcoming occurrences', async () => {
    const rule = await models.RecurrenceRule.create({ taskId: task._id, frequency: 'daily', startDate: new Date(), active: false });
    const r = await call(c.getOne, { params: { id: rule._id } });
    assert.deepEqual(r.body.nextOccurrences, []);
  });

  test('UPDATE: change frequency, interval and end date', async () => {
    const rule = await models.RecurrenceRule.create({ taskId: task._id, frequency: 'daily', interval: 1, startDate: new Date('2026-10-01') });
    const r = await call(c.update, { params: { id: rule._id }, body: { frequency: 'monthly', interval: 2, endDate: '2027-06-30' } });
    assert.equal(r.status, 200);
    assert.equal(r.body.frequency, 'monthly');
    assert.equal(r.body.summary, 'Every 2 months until Jun 30, 2027');
  });

  test('UPDATE: end date before the stored start date is rejected', async () => {
    const rule = await models.RecurrenceRule.create({ taskId: task._id, frequency: 'daily', startDate: new Date('2026-10-10') });
    const r = await call(c.update, { params: { id: rule._id }, body: { endDate: '2026-10-01' } });
    assert.equal(r.status, 400);
  });

  test('DELETE: removes the rule; unknown id returns 404', async () => {
    const rule = await models.RecurrenceRule.create({ taskId: task._id, frequency: 'daily', startDate: new Date() });
    assert.equal((await call(c.remove, { params: { id: rule._id } })).status, 200);
    assert.equal((await call(c.remove, { params: { id: rule._id } })).status, 404);
  });
});
