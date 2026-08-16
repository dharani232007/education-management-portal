/**
 * database/models/index.js
 * Single entry point so backend code can do:
 *   const { User, Student, Teacher, ... } = require('../database/models');
 * instead of importing each model file individually.
 */

const User = require('./User');
const Student = require('./Student');
const Teacher = require('./Teacher');
const Course = require('./Course');
const Class = require('./Class');
const Enrollment = require('./Enrollment');
const Attendance = require('./Attendance');
const Assignment = require('./Assignment');
const Submission = require('./Submission');
const Exam = require('./Exam');
const Result = require('./Result');
const AIRecommendation = require('./AIRecommendation');

module.exports = {
  User,
  Student,
  Teacher,
  Course,
  Class,
  Enrollment,
  Attendance,
  Assignment,
  Submission,
  Exam,
  Result,
  AIRecommendation,
};
