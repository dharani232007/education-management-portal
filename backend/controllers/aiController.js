/**
 * backend/controllers/aiController.js
 * Implements GET /api/ai/student/:id, /api/ai/class/:id, /api/ai/overview.
 */

const { Student, Class, Enrollment, Course } = require('../../database/models');
const { generateStudentRecommendation } = require('../services/recommendationService');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { isValidObjectIdLike } = require('../utils/validators');

/** Throws 403 unless the requesting TEACHER teaches at least one course this student is enrolled in. ADMIN always passes. */
async function assertTeacherCanViewStudent(req, studentId) {
  if (req.user.role === 'ADMIN') return;
  const teacherCourseIds = await Course.distinct('_id', { teacher: req.teacherProfile._id });
  const isEnrolled = await Enrollment.findOne({
    student: studentId,
    course: { $in: teacherCourseIds },
    status: 'ACTIVE',
  });
  if (!isEnrolled) {
    throw new AppError('Not authorized to view this student', 403);
  }
}

/** GET /api/ai/student/:id */
const getStudentAI = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectIdLike(id)) throw new AppError('Invalid student id', 400);

  const student = await Student.findById(id);
  if (!student) throw new AppError('Student not found', 404);

  await assertTeacherCanViewStudent(req, id);

  const data = await generateStudentRecommendation(id);
  return sendSuccess(res, data);
});

/** GET /api/ai/class/:id */
const getClassAI = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectIdLike(id)) throw new AppError('Invalid class id', 400);

  const classDoc = await Class.findById(id).populate({ path: 'students', populate: { path: 'user', select: 'name' } });
  if (!classDoc) throw new AppError('Class not found', 404);

  if (req.user.role === 'TEACHER' && classDoc.teacher.toString() !== req.teacherProfile._id.toString()) {
    throw new AppError('Not authorized to view this class', 403);
  }

  const riskDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  const students = [];

  for (const student of classDoc.students) {
    const { riskLevel, weakSubjects } = await generateStudentRecommendation(student._id);
    riskDistribution[riskLevel] = (riskDistribution[riskLevel] || 0) + 1;
    students.push({
      studentId: student.studentId,
      name: student.user ? student.user.name : undefined,
      riskLevel,
      weakSubjects,
    });
  }

  return sendSuccess(res, { classId: classDoc._id, riskDistribution, students });
});

/** GET /api/ai/overview */
const getOverview = asyncHandler(async (req, res) => {
  const students = await Student.find().lean();

  const riskDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  const weakSubjectCounts = new Map();

  for (const student of students) {
    const { riskLevel, weakSubjects } = await generateStudentRecommendation(student._id);
    riskDistribution[riskLevel] = (riskDistribution[riskLevel] || 0) + 1;
    weakSubjects.forEach((subject) => {
      weakSubjectCounts.set(subject, (weakSubjectCounts.get(subject) || 0) + 1);
    });
  }

  const topWeakSubjects = Array.from(weakSubjectCounts.entries())
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return sendSuccess(res, {
    totalStudentsAnalyzed: students.length,
    riskDistribution,
    topWeakSubjects,
  });
});

module.exports = { getStudentAI, getClassAI, getOverview };
