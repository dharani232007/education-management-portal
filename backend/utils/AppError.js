/**
 * backend/utils/AppError.js
 *
 * Thrown deliberately by controllers/middleware for expected error cases
 * (validation, not found, forbidden, conflict, etc). The global error
 * handler (backend/middleware/errorHandler.js) recognizes instances of
 * this class and uses their statusCode/message/errors directly, instead
 * of falling back to a generic 500.
 */

class AppError extends Error {
  constructor(message, statusCode = 400, errors = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    if (errors) this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
