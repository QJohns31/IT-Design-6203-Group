/**
 * Integration tests – full HTTP round trips through Express + Mongoose + a REAL MongoDB.
 *
 * Requirements: `npm install` done and MongoDB running locally.
 * Uses the database in MONGODB_URI_TEST (default mongodb://127.0.0.1:27017/taskflow_test),
 * which is DROPPED at the start and end of the run – never point it at your real data.
 * If MongoDB cannot be reached the tests are reported as skipped, not failed.
 *
 * Optional live check of OpenWeatherMap: set OPENWEATHER_API_KEY in server/.env.
 */
try { process.loadEnvFile(); } catch { /* no .env */ }
process.env.NODE_ENV = 'test';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const TEST_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/taskflow_test';

let mongoose;
let server;
let base;
let available = false;
let skipReason = '';

async function api(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

before(async () => {
  try {
    mongoose = require('mongoose');
  } catch {
    skipReason = 'Run `npm install` first';
    return;
  }
  try {
    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 2500 });
  } catch (err) {
    skipReason = `MongoDB not reachable at ${TEST_URI} (${err.message})`;
    return;
  }
  await mongoose.connection.dropDatabase();

  const { createApp } = require('../../app');
  const models = {
    Task: require('../../models/Task'),
    Category: require('../../models/Category'),
    ReminderSubtask: require('../../models/ReminderSubtask'),
    RecurrenceRule: require('../../models/RecurrenceRule'),
  };
  // Build the unique indexes before testing duplicate rules
  await Promise.all(Object.values(models).map((m) => m.init()));

  // Weather is faked here so the suite does not need an API key; the live test is separate.
  const fakeForecast = async ({ city, date }) => ({ city, requestedDate: date || null, available: true, forecast: { main: 'Clear' }, days: [] });
  const app = createApp({ models, weather: { getForecast: fakeForecast } });

  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}/api`;
  available = true;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose && mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

const ids = {};

describe('Task Flow API (integration, real MongoDB)', () => {
  test('health check', async (t) => {
    if (!available) return t.skip(skipReason);
    const r = await api('GET', '/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'ok');
  });

  // ---------- Category & List Management (Aderoju Okunlola) ----------
  test('categories: create, duplicate (case-insensitive), list, update', async (t) => {
    if (!available) return t.skip(skipReason);
    const work = await api('POST', '/categories', { name: 'Work', color: '#2563eb', icon: '💼' });
    assert.equal(work.status, 201);
    ids.work = work.body._id;

    const home = await api('POST', '/categories', { name: 'Home' });
    ids.home = home.body._id;

    const dup = await api('POST', '/categories', { name: 'WORK' });
    assert.equal(dup.status, 409);

    const upd = await api('PUT', `/categories/${ids.home}`, { name: 'Personal', color: '#16a34a' });
    assert.equal(upd.status, 200);
    assert.equal(upd.body.name, 'Personal');

    const list = await api('GET', '/categories');
    assert.deepEqual(list.body.categories.map((c) => c.name), ['Personal', 'Work']);
  });

  // ---------- Task Management (Quzhan Johnson) ----------
  test('tasks: create, validation, filter, update, get', async (t) => {
    if (!available) return t.skip(skipReason);
    const t1 = await api('POST', '/tasks', { title: 'Write report', priority: 'High', dueDate: '2026-10-05', categoryId: ids.work, location: 'Nassau' });
    assert.equal(t1.status, 201);
    ids.task = t1.body._id;
    await api('POST', '/tasks', { title: 'Buy milk', priority: 'Low', categoryId: ids.home });

    const bad = await api('POST', '/tasks', { title: '', priority: 'Urgent' });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.details.length, 2);

    const high = await api('GET', '/tasks?priority=High');
    assert.equal(high.body.length, 1);
    const search = await api('GET', '/tasks?search=milk');
    assert.equal(search.body[0].title, 'Buy milk');
    const inWork = await api('GET', `/tasks?categoryId=${ids.work}`);
    assert.equal(inWork.body.length, 1);

    const upd = await api('PUT', `/tasks/${ids.task}`, { status: 'In Progress' });
    assert.equal(upd.body.status, 'In Progress');
    assert.equal(upd.body.title, 'Write report');

    const one = await api('GET', `/tasks/${ids.task}`);
    assert.equal(one.body.location, 'Nassau');
    assert.equal((await api('GET', '/tasks/not-an-id')).status, 400);
  });

  // ---------- Reminder & Subtask Management (Lakshmi Pranathi Priya Ega) ----------
  test('reminders/subtasks: create, list with progress, toggle, update, delete', async (t) => {
    if (!available) return t.skip(skipReason);
    const s1 = await api('POST', '/items', { taskId: ids.task, type: 'subtask', text: 'Outline' });
    const s2 = await api('POST', '/items', { taskId: ids.task, type: 'subtask', text: 'Draft' });
    const r1 = await api('POST', '/items', { taskId: ids.task, type: 'reminder', text: 'Submit', remindAt: '2026-10-05T13:00:00.000Z' });
    assert.equal(s1.status, 201);
    assert.equal(r1.status, 201);
    assert.equal((await api('POST', '/items', { taskId: ids.task, type: 'reminder', text: 'no time' })).status, 400);

    const toggled = await api('PATCH', `/items/${s1.body._id}/toggle`);
    assert.equal(toggled.body.completed, true);

    const list = await api('GET', `/items?taskId=${ids.task}`);
    assert.equal(list.body.items.length, 3);
    assert.deepEqual(list.body.progress, { subtasksTotal: 2, subtasksDone: 1, percent: 50 });

    const upd = await api('PUT', `/items/${r1.body._id}`, { remindAt: '2026-10-04T12:00:00.000Z' });
    assert.equal(upd.body.remindAt, '2026-10-04T12:00:00.000Z');

    assert.equal((await api('DELETE', `/items/${s2.body._id}`)).status, 200);
  });

  // ---------- Recurring Task Management (Deborah Cody) ----------
  test('recurrence: create, one-per-task, occurrences, update, delete', async (t) => {
    if (!available) return t.skip(skipReason);
    const rule = await api('POST', '/recurrences', { taskId: ids.task, frequency: 'weekly', interval: 2, startDate: '2026-10-05' });
    assert.equal(rule.status, 201);
    assert.equal(rule.body.summary, 'Every 2 weeks');

    const again = await api('POST', '/recurrences', { taskId: ids.task, frequency: 'daily', startDate: '2026-10-05' });
    assert.equal(again.status, 409);

    const occ = await api('GET', `/recurrences/${rule.body._id}/occurrences?count=3&from=2026-10-01`);
    assert.deepEqual(occ.body.occurrences.map((d) => d.slice(0, 10)), ['2026-10-05', '2026-10-19', '2026-11-02']);

    const upd = await api('PUT', `/recurrences/${rule.body._id}`, { frequency: 'monthly', interval: 1, endDate: '2027-03-31' });
    assert.equal(upd.body.summary, 'Every month until Mar 31, 2027');

    const bad = await api('PUT', `/recurrences/${rule.body._id}`, { endDate: '2026-01-01' });
    assert.equal(bad.status, 400);
    ids.rule = rule.body._id;
  });

  // ---------- Third-party API route ----------
  test('weather route validates input and returns the forecast payload', async (t) => {
    if (!available) return t.skip(skipReason);
    assert.equal((await api('GET', '/weather')).status, 400);
    const r = await api('GET', '/weather?city=Nassau&date=2026-10-05');
    assert.equal(r.status, 200);
    assert.equal(r.body.city, 'Nassau');
  });

  // ---------- Cross-component consistency ----------
  test('deleting a category with mode=reassign moves its tasks', async (t) => {
    if (!available) return t.skip(skipReason);
    const r = await api('DELETE', `/categories/${ids.work}?mode=reassign&targetId=${ids.home}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.affectedTasks, 1);
    const moved = await api('GET', `/tasks/${ids.task}`);
    assert.equal(moved.body.categoryId, ids.home);
  });

  test('deleting a task cascades to its reminders/subtasks and recurrence rule', async (t) => {
    if (!available) return t.skip(skipReason);
    const r = await api('DELETE', `/tasks/${ids.task}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.removedRemindersAndSubtasks, 2);
    assert.equal(r.body.removedRecurrenceRules, 1);
    assert.equal((await api('GET', `/recurrences/${ids.rule}`)).status, 404);
    assert.equal((await api('GET', `/items?taskId=${ids.task}`)).body.items.length, 0);
  });

  test('unknown routes return 404 JSON', async (t) => {
    if (!available) return t.skip(skipReason);
    const r = await api('GET', '/nope');
    assert.equal(r.status, 404);
  });
});

describe('OpenWeatherMap live check (optional)', () => {
  test('real forecast for Nassau', async (t) => {
    if (!process.env.OPENWEATHER_API_KEY) return t.skip('Set OPENWEATHER_API_KEY in server/.env to run');
    const { getForecast } = require('../../utils/weatherService');
    const result = await getForecast({ city: 'Nassau' });
    assert.equal(result.country, 'BS');
    assert.ok(result.days.length >= 5);
    assert.ok(result.forecast.description.length > 0);
  });
});
