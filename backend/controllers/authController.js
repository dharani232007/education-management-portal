/**
 * backend/controllers/authController.js
 * Implements POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
 * exactly as documented in docs/api.md.
 */

const { User, Student, Teacher } = require('../../database/models');
const { signToken } = require('../utils/jwt');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { validateRegisterBody, validateLoginBody } = require('../utils/validators');

/**
 * POST /api/auth/register
 * Public. Creates a User plus the corresponding Student/Teacher academic
 * profile (ADMIN has no additional profile document).
 */
const register = asyncHandler(async (req, res) => {
  const errors = validateRegisterBody(req.body);
  if (errors.length) {
    throw new AppError('Validation failed', 400, errors);
  }

  const { name, email, password, role, profile, studentId, department, year, section, teacherId } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new AppError('Email already registered', 400);
  }

  if (role === 'STUDENT') {
    const existingStudentId = await Student.findOne({ studentId });
    if (existingStudentId) {
      throw new AppError('studentId already in use', 400);
    }
  }
  if (role === 'TEACHER') {
    const existingTeacherId = await Teacher.findOne({ teacherId });
    if (existingTeacherId) {
      throw new AppError('teacherId already in use', 400);
    }
  }

  const user = await User.create({ name, email, password, role, profile });

  try {
    if (role === 'STUDENT') {
      await Student.create({
        user: user._id,
        studentId,
        department,
        year: Number(year),
        section,
      });
    } else if (role === 'TEACHER') {
      await Teacher.create({
        user: user._id,
        teacherId,
        department,
      });
    }
  } catch (err) {
    // Roll back the User document so we never leave an orphaned account
    // with no matching academic profile.
    await User.findByIdAndDelete(user._id);
    throw err;
  }

  const token = signToken(user);
  return sendSuccess(res, { token, user }, 201);
});

/**
 * POST /api/auth/login
 * Public.
 */
const login = asyncHandler(async (req, res) => {
  const errors = validateLoginBody(req.body);
  if (errors.length) {
    throw new AppError('Validation failed', 400, errors);
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid credentials', 401);
  }
  if (!user.isActive) {
    throw new AppError('Invalid credentials', 401);
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user);
  return sendSuccess(res, { token, user }, 200);
});

/**
 * GET /api/auth/me
 * Requires authentication.
 */
const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, { user: req.user }, 200);
});

module.exports = { register, login, me };
