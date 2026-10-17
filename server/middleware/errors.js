/**
 * Centralised error handling.
 * Express error-handling middleware signature (err, req, res, next) per
 * https://expressjs.com/en/guide/error-handling.html
 */

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Wraps an async route handler so rejected promises reach the error middleware (Express 4). */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Unexpected server error.';
  let details = err.details;

  // Mongoose / MongoDB errors translated to friendly HTTP responses
  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    details = Object.values(err.errors).map((e) => e.message);
    message = 'Validation failed.';
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}.`;
  } else if (err.code === 11000) {
    status = 409;
    message = 'A record with that value already exists.';
  }

  if (status >= 500 && process.env.NODE_ENV !== 'test') console.error(err);
  res.status(status).json(details ? { message, details } : { message });
}

module.exports = { HttpError, asyncHandler, notFound, errorHandler };
