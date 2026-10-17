/**
 * Shared input-validation helpers used by every controller.
 * Kept free of Express/Mongoose imports so they can be unit-tested in isolation.
 *
 * Each validate* function returns an object:
 *   { errors: string[], value: object }
 * where `value` contains only the cleaned, whitelisted fields.
 * `partial = true` is used for PUT updates, where missing fields are allowed.
 */

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Pending', 'In Progress', 'Completed'];
const ITEM_TYPES = ['reminder', 'subtask'];
const FREQUENCIES = ['daily', 'weekly', 'monthly'];

function isObjectId(value) {
  return typeof value === 'string' && OBJECT_ID_RE.test(value);
}

function isValidDate(value) {
  if (value === null || value === undefined || value === '') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function has(body, key) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

/* ---------- Task Management (Quzhan Johnson) ---------- */
function validateTask(body = {}, { partial = false } = {}) {
  const errors = [];
  const value = {};

  if (!partial || has(body, 'title')) {
    const title = cleanString(body.title);
    if (!title) errors.push('Title is required.');
    else if (title.length > 120) errors.push('Title must be 120 characters or fewer.');
    else value.title = title;
  }
  if (has(body, 'description')) {
    const description = cleanString(body.description) || '';
    if (description.length > 1000) errors.push('Description must be 1000 characters or fewer.');
    else value.description = description;
  }
  if (has(body, 'dueDate')) {
    if (body.dueDate === null || body.dueDate === '') value.dueDate = null;
    else if (!isValidDate(body.dueDate)) errors.push('Due date is not a valid date.');
    else value.dueDate = new Date(body.dueDate);
  }
  if (has(body, 'priority')) {
    if (!PRIORITIES.includes(body.priority)) errors.push(`Priority must be one of: ${PRIORITIES.join(', ')}.`);
    else value.priority = body.priority;
  }
  if (has(body, 'status')) {
    if (!STATUSES.includes(body.status)) errors.push(`Status must be one of: ${STATUSES.join(', ')}.`);
    else value.status = body.status;
  }
  if (has(body, 'categoryId')) {
    if (body.categoryId === null || body.categoryId === '') value.categoryId = null;
    else if (!isObjectId(body.categoryId)) errors.push('Category ID is not valid.');
    else value.categoryId = body.categoryId;
  }
  if (has(body, 'location')) {
    const location = cleanString(body.location) || '';
    if (location.length > 100) errors.push('Location must be 100 characters or fewer.');
    else value.location = location;
  }
  return { errors, value };
}

/* ---------- Category & List Management (Aderoju Okunlola) ---------- */
function validateCategory(body = {}, { partial = false } = {}) {
  const errors = [];
  const value = {};

  if (!partial || has(body, 'name')) {
    const name = cleanString(body.name);
    if (!name) errors.push('Category name is required.');
    else if (name.length > 40) errors.push('Category name must be 40 characters or fewer.');
    else value.name = name;
  }
  if (has(body, 'color')) {
    if (!HEX_COLOR_RE.test(body.color || '')) errors.push('Color must be a hex value such as #4f46e5.');
    else value.color = body.color;
  }
  if (has(body, 'icon')) {
    const icon = cleanString(body.icon) || '';
    if (icon.length > 8) errors.push('Icon must be 8 characters or fewer (an emoji works well).');
    else value.icon = icon;
  }
  if (has(body, 'description')) {
    const description = cleanString(body.description) || '';
    if (description.length > 300) errors.push('Description must be 300 characters or fewer.');
    else value.description = description;
  }
  return { errors, value };
}

/* ---------- Reminder & Subtask Management (Lakshmi Pranathi Priya Ega) ---------- */
function validateReminderSubtask(body = {}, { partial = false } = {}) {
  const errors = [];
  const value = {};

  if (!partial || has(body, 'taskId')) {
    if (!isObjectId(body.taskId)) errors.push('A valid parent task ID is required.');
    else value.taskId = body.taskId;
  }
  if (!partial || has(body, 'type')) {
    if (!ITEM_TYPES.includes(body.type)) errors.push('Type must be "reminder" or "subtask".');
    else value.type = body.type;
  }
  if (!partial || has(body, 'text')) {
    const text = cleanString(body.text);
    if (!text) errors.push('Text is required.');
    else if (text.length > 200) errors.push('Text must be 200 characters or fewer.');
    else value.text = text;
  }
  if (has(body, 'remindAt')) {
    if (body.remindAt === null || body.remindAt === '') value.remindAt = null;
    else if (!isValidDate(body.remindAt)) errors.push('Reminder date/time is not valid.');
    else value.remindAt = new Date(body.remindAt);
  }
  if (has(body, 'completed')) {
    if (typeof body.completed !== 'boolean') errors.push('Completed must be true or false.');
    else value.completed = body.completed;
  }
  // A reminder must always carry a date/time (checked on create only).
  if (!partial && value.type === 'reminder' && !value.remindAt) {
    errors.push('A reminder needs a date and time.');
  }
  return { errors, value };
}

/* ---------- Recurring Task Management (Deborah Cody) ---------- */
function validateRecurrence(body = {}, { partial = false } = {}) {
  const errors = [];
  const value = {};

  if (!partial || has(body, 'taskId')) {
    if (!isObjectId(body.taskId)) errors.push('A valid parent task ID is required.');
    else value.taskId = body.taskId;
  }
  if (!partial || has(body, 'frequency')) {
    if (!FREQUENCIES.includes(body.frequency)) errors.push(`Frequency must be one of: ${FREQUENCIES.join(', ')}.`);
    else value.frequency = body.frequency;
  }
  if (!partial || has(body, 'interval')) {
    const interval = body.interval === undefined ? 1 : Number(body.interval);
    if (!Number.isInteger(interval) || interval < 1 || interval > 365) {
      errors.push('Interval must be a whole number between 1 and 365.');
    } else value.interval = interval;
  }
  if (!partial || has(body, 'startDate')) {
    if (!isValidDate(body.startDate)) errors.push('Start date is required and must be a valid date.');
    else value.startDate = new Date(body.startDate);
  }
  if (has(body, 'endDate')) {
    if (body.endDate === null || body.endDate === '') value.endDate = null;
    else if (!isValidDate(body.endDate)) errors.push('End date is not valid.');
    else value.endDate = new Date(body.endDate);
  }
  if (has(body, 'active')) {
    if (typeof body.active !== 'boolean') errors.push('Active must be true or false.');
    else value.active = body.active;
  }
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    errors.push('End date cannot be before the start date.');
  }
  return { errors, value };
}

/* ---------- Weather (third-party API, project level) ---------- */
function validateWeatherQuery(query = {}) {
  const errors = [];
  const city = cleanString(query.city);
  if (!city) errors.push('City is required.');
  else if (city.length > 100) errors.push('City must be 100 characters or fewer.');
  const date = query.date;
  if (date !== undefined && date !== '' && !ISO_DATE_RE.test(date)) {
    errors.push('Date must use the format YYYY-MM-DD.');
  }
  const units = query.units || 'metric';
  if (!['metric', 'imperial'].includes(units)) errors.push('Units must be "metric" or "imperial".');
  return { errors, value: { city, date: date || undefined, units } };
}

module.exports = {
  PRIORITIES,
  STATUSES,
  ITEM_TYPES,
  FREQUENCIES,
  isObjectId,
  isValidDate,
  validateTask,
  validateCategory,
  validateReminderSubtask,
  validateRecurrence,
  validateWeatherQuery,
};
