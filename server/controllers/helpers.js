const { HttpError } = require('../middleware/errors');
const { isObjectId } = require('../utils/validators');

/** Throws 400 when an :id route parameter is not a 24-character hex ObjectId. */
function requireObjectId(id, label = 'ID') {
  if (!isObjectId(id)) throw new HttpError(400, `${label} is not valid.`);
}

/** Throws 400 with the list of validation messages when there are any. */
function assertValid(errors) {
  if (errors.length) throw new HttpError(400, 'Validation failed.', errors);
}

/** Escapes user text so it can be used safely inside a RegExp (prevents regex injection). */
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Converts a Mongoose document (or plain object) into a plain object we can extend. */
function toPlain(doc) {
  if (!doc) return doc;
  return typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
}

module.exports = { requireObjectId, assertValid, escapeRegex, toPlain };
