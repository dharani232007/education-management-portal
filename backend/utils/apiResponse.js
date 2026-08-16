/**
 * backend/utils/apiResponse.js
 *
 * Every response in this API MUST match docs/api.md conventions:
 *   success: { success: true, data: {...} }
 *   error:   { success: false, message: "...", errors: [...] (optional) }
 */

function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function sendError(res, message, statusCode = 400, errors = undefined) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess, sendError };
