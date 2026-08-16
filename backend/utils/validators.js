/**
 * backend/utils/validators.js
 *
 * Small, dependency-free request validation helpers. Controllers call
 * these and collect human-readable error strings; if any exist, the
 * controller throws an AppError(400, message, errors) so the response
 * matches the documented error shape:
 *   { success: false, message: "...", errors: ["..."] }
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'];
const ATTENDANCE_STATUS = ['PRESENT', 'ABSENT'];
const EXAM_TYPES = ['INTERNAL', 'MIDTERM', 'FINAL', 'QUIZ'];

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isValidEmail(v) {
  return isNonEmptyString(v) && EMAIL_REGEX.test(v);
}

function isValidObjectIdLike(v) {
  return isNonEmptyString(v) && /^[0-9a-fA-F]{24}$/.test(v);
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function validateRegisterBody(body = {}) {
  const errors = [];
  const { name, email, password, role, studentId, department, year, teacherId } = body;

  if (!isNonEmptyString(name)) errors.push('name is required');
  if (!isValidEmail(email)) errors.push('a valid email is required');
  if (!isNonEmptyString(password) || password.length < 6) {
    errors.push('password is required and must be at least 6 characters');
  }
  if (!ROLES.includes(role)) errors.push(`role must be one of ${ROLES.join(', ')}`);

  if (role === 'STUDENT') {
    if (!isNonEmptyString(studentId)) errors.push('studentId is required for STUDENT role');
    if (!isNonEmptyString(department)) errors.push('department is required for STUDENT role');
    if (year === undefined || year === null || !isFiniteNumber(Number(year))) {
      errors.push('year is required for STUDENT role');
    }
  }

  if (role === 'TEACHER') {
    if (!isNonEmptyString(teacherId)) errors.push('teacherId is required for TEACHER role');
    if (!isNonEmptyString(department)) errors.push('department is required for TEACHER role');
  }

  return errors;
}

function validateLoginBody(body = {}) {
  const errors = [];
  if (!isValidEmail(body.email)) errors.push('a valid email is required');
  if (!isNonEmptyString(body.password)) errors.push('password is required');
  return errors;
}

module.exports = {
  EMAIL_REGEX,
  ROLES,
  ATTENDANCE_STATUS,
  EXAM_TYPES,
  isNonEmptyString,
  isValidEmail,
  isValidObjectIdLike,
  isFiniteNumber,
  validateRegisterBody,
  validateLoginBody,
};
