/**
 * backend/middleware/errorHandler.js
 *
 * Single place that turns any thrown/forwarded error into the documented
 * error response shape: { success: false, message, errors? }.
 * Stack traces are NEVER sent to the client, only logged server-side.
 */

const { env } = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors;

  // Mongoose validation error -> 400 with field-level details.
  if (err.name === 'ValidationError' && err.errors && !err.statusCode) {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // Mongoose duplicate key error -> 409 Conflict.
  if (err.code === 11000 && !err.statusCode) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {}).join(', ') || 'field';
    message = `Duplicate value for ${field}`;
  }

  // Invalid ObjectId cast (e.g. malformed :id param) -> 400 Bad Request.
  if (err.name === 'CastError' && !err.statusCode) {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  }

  // JWT errors that slip through (defensive; auth.js already handles most).
  if ((err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') && !err.statusCode) {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
    // Never leak internals for unexpected errors.
    message = env.NODE_ENV === 'production' ? 'Internal server error' : message;
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  res.status(statusCode).json(body);
}

module.exports = errorHandler;
