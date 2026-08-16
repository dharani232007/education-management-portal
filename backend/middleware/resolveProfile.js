/**
 * backend/middleware/resolveProfile.js
 *
 * Resolves the Student/Teacher academic profile document for the
 * currently authenticated user. This is the mechanism that satisfies
 * "never trust user IDs coming from the frontend" for student/teacher
 * routes: the acting identity always comes from req.user (set by
 * authenticateToken), never from a route param or request body.
 */

const { Student, Teacher } = require('../../database/models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const resolveStudentProfile = asyncHandler(async (req, res, next) => {
  const student = await Student.findOne({ user: req.user._id });
  if (!student) {
    throw new AppError('Student profile not found for this account', 404);
  }
  req.studentProfile = student;
  next();
});

const resolveTeacherProfile = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findOne({ user: req.user._id });
  if (!teacher) {
    throw new AppError('Teacher profile not found for this account', 404);
  }
  req.teacherProfile = teacher;
  next();
});

/**
 * Like resolveTeacherProfile, but only runs for TEACHER-role users --
 * used on shared TEACHER|ADMIN routes (e.g. AI routes) where an ADMIN
 * has no Teacher profile and shouldn't be required to have one.
 */
const resolveTeacherProfileIfTeacher = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'TEACHER') return next();
  const teacher = await Teacher.findOne({ user: req.user._id });
  if (!teacher) {
    throw new AppError('Teacher profile not found for this account', 404);
  }
  req.teacherProfile = teacher;
  next();
});

module.exports = { resolveStudentProfile, resolveTeacherProfile, resolveTeacherProfileIfTeacher };
