/**
 * backend/utils/asyncHandler.js
 * Wraps an async Express route/middleware handler so any thrown error or
 * rejected promise is forwarded to next(err) instead of crashing the
 * process or being silently swallowed.
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
