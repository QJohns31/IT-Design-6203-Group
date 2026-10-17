/**
 * In-memory stand-in for a Mongoose model, used ONLY by the unit tests.
 * It supports the small subset of the Mongoose API the controllers use:
 *   find().sort(), findOne, findById, create, findByIdAndUpdate, findByIdAndDelete,
 *   deleteMany, updateMany, countDocuments
 * and the query operators: equality, RegExp, $ne, $in, $gte, $lte, $or.
 * The integration tests (tests/integration) exercise the real Mongoose models against MongoDB.
 */
const crypto = require('node:crypto');

const newId = () => crypto.randomBytes(12).toString('hex');
const same = (a, b) => (a === null || a === undefined ? b === null || b === undefined : String(a) === String(b));

function matchValue(docValue, cond) {
  if (cond instanceof RegExp) return typeof docValue === 'string' && cond.test(docValue);
  if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
    return Object.entries(cond).every(([op, v]) => {
      switch (op) {
        case '$ne': return !same(docValue, v);
        case '$in': return v.some((x) => same(docValue, x));
        case '$gte': return docValue != null && docValue >= v;
        case '$lte': return docValue != null && docValue <= v;
        default: throw new Error(`fakeModel: unsupported operator ${op}`);
      }
    });
  }
  if (cond instanceof Date) return docValue instanceof Date && docValue.getTime() === cond.getTime();
  return same(docValue, cond);
}

function matches(doc, filter = {}) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return cond.some((sub) => matches(doc, sub));
    return matchValue(doc[key], cond);
  });
}

function compare(a, b, sortSpec) {
  for (const [key, dir] of Object.entries(sortSpec)) {
    const x = a[key];
    const y = b[key];
    if (x == null && y == null) continue;
    if (x == null) return -1 * dir; // MongoDB sorts null first in ascending order
    if (y == null) return 1 * dir;
    if (x < y) return -1 * dir;
    if (x > y) return 1 * dir;
  }
  return 0;
}

class FakeQuery {
  constructor(rows) { this.rows = rows; }
  sort(spec) { this.rows = [...this.rows].sort((a, b) => compare(a, b, spec)); return this; }
  then(resolve, reject) { return Promise.resolve(this.rows.map((r) => structuredClone(r))).then(resolve, reject); }
}

class FakeModel {
  /**
   * @param {object} defaults  default field values applied on create (like a schema)
   */
  constructor(defaults = {}) {
    this.defaults = defaults;
    this.docs = [];
  }

  find(filter = {}) { return new FakeQuery(this.docs.filter((d) => matches(d, filter))); }

  async findOne(filter = {}) {
    const doc = this.docs.find((d) => matches(d, filter));
    return doc ? structuredClone(doc) : null;
  }

  async findById(id) { return this.findOne({ _id: id }); }

  async create(data) {
    if (Array.isArray(data)) return Promise.all(data.map((d) => this.create(d)));
    const now = new Date();
    const doc = { _id: newId(), ...structuredClone(this.defaults), ...data, createdAt: now, updatedAt: now };
    this.docs.push(doc);
    return structuredClone(doc);
  }

  async findByIdAndUpdate(id, update, { new: returnNew = false } = {}) {
    const doc = this.docs.find((d) => same(d._id, id));
    if (!doc) return null;
    const before = structuredClone(doc);
    Object.assign(doc, update.$set || update, { updatedAt: new Date() });
    return structuredClone(returnNew ? doc : before);
  }

  async findByIdAndDelete(id) {
    const index = this.docs.findIndex((d) => same(d._id, id));
    if (index === -1) return null;
    return this.docs.splice(index, 1)[0];
  }

  async deleteMany(filter = {}) {
    const before = this.docs.length;
    this.docs = this.docs.filter((d) => !matches(d, filter));
    return { deletedCount: before - this.docs.length };
  }

  async updateMany(filter, update) {
    let modifiedCount = 0;
    for (const doc of this.docs) {
      if (matches(doc, filter)) {
        Object.assign(doc, update.$set || update, { updatedAt: new Date() });
        modifiedCount += 1;
      }
    }
    return { modifiedCount };
  }

  async countDocuments(filter = {}) { return this.docs.filter((d) => matches(d, filter)).length; }
}

/** A fresh set of the four Task Flow models with the same defaults as the Mongoose schemas. */
function createFakeModels() {
  return {
    Category: new FakeModel({ color: '#4f46e5', icon: '📁', description: '' }),
    Task: new FakeModel({ description: '', dueDate: null, priority: 'Medium', status: 'Pending', categoryId: null, location: '' }),
    ReminderSubtask: new FakeModel({ remindAt: null, completed: false }),
    RecurrenceRule: new FakeModel({ interval: 1, endDate: null, active: true }),
  };
}

/** Minimal Express-like request/response objects for calling a controller directly. */
function mockReqRes({ params = {}, query = {}, body = {} } = {}) {
  const req = { params, query, body };
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = JSON.parse(JSON.stringify(payload)); return this; },
  };
  return { req, res };
}

/** Calls a controller handler and returns { status, body }, converting thrown HttpErrors. */
async function call(handler, reqInit) {
  const { req, res } = mockReqRes(reqInit);
  try {
    await handler(req, res);
    return { status: res.statusCode, body: res.body };
  } catch (err) {
    if (err.status) return { status: err.status, body: { message: err.message, details: err.details } };
    throw err;
  }
}

module.exports = { FakeModel, createFakeModels, mockReqRes, call, newId };
