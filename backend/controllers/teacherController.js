/**
 * backend/controllers/teacherController.js
 * Implements all /api/teacher/* routes from docs/api.md.
 * The acting teacher is always req.teacherProfile, resolved from the
 * authenticated user. Every write/read is scoped to courses this teacher
 * actually owns -- teachers must not access another teacher's data.
 */

const {
  Course,
  Enrollment,
  Attendance,
  Assignment,
  Submission,
  Exam,
  Result,
  Student,
} = require('../../database/models');
const { calculateAttendancePercentage } = require('../utils/academicAnalytics');
const { generateStudentRecommendation } = require('../services/recommendationService');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { isValidObjectIdLike, isNonEmptyString, ATTENDANCE_STATUS, EXAM_TYPES } = require('../utils/validators');

async function getOwnedCourseIds(teacherId) {
  return Course.distinct('_id', { teacher: teacherId });
}

/** Throws 403/404 unless the given courseId belongs to this teacher. */
async function assertOwnsCourse(teacherId, courseId) {
  if (!isValidObjectIdLike(courseId)) throw new AppError('Invalid courseId', 400);
  const course = await Course.findOne({ _id: courseId, teacher: teacherId });
  if (!course) throw new AppError('Course not found or not owned by this teacher', 404);
  return course;
}

/** GET /api/teacher/dashboard */
const getDashboard = asyncHandler(async (req, res) => {
  const teacher = req.teacherProfile;
  const courseIds = await getOwnedCourseIds(teacher._id);

  const [totalStudents, assignmentIds, attendanceRecords] = await Promise.all([
    Enrollment.distinct('student', { course: { $in: courseIds }, status: 'ACTIVE' }),
    Assignment.distinct('_id', { course: { $in: courseIds } }),
    Attendance.find({ course: { $in: courseIds } }).lean(),
  ]);

  const pendingEvaluations = await Submission.countDocuments({
    assignment: { $in: assignmentIds },
    status: { $in: ['SUBMITTED', 'LATE'] },
  });

  const avgAttendanceAcrossCourses = calculateAttendancePercentage(attendanceRecords);

  return sendSuccess(res, {
    totalCourses: courseIds.length,
    totalStudents: totalStudents.length,
    pendingEvaluations,
    avgAttendanceAcrossCourses,
  });
});

/** GET /api/teacher/courses */
const getCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ teacher: req.teacherProfile._id })
    .select('courseCode courseName credits')
    .lean();
  return sendSuccess(res, courses);
});

/** GET /api/teacher/students?courseId= */
const getStudents = asyncHandler(async (req, res) => {
  const teacher = req.teacherProfile;
  const { courseId } = req.query;

  let courseIds;
  if (courseId) {
    await assertOwnsCourse(teacher._id, courseId);
    courseIds = [courseId];
  } else {
    courseIds = await getOwnedCourseIds(teacher._id);
  }

  const studentIds = await Enrollment.distinct('student', { course: { $in: courseIds }, status: 'ACTIVE' });
  const students = await Student.find({ _id: { $in: studentIds } })
    .populate('user', 'name')
    .lean();

  const data = students.map((s) => ({
    _id: s._id,
    studentId: s.studentId,
    name: s.user ? s.user.name : undefined,
    section: s.section,
    year: s.year,
  }));

  return sendSuccess(res, data);
});

/** POST /api/teacher/attendance */
const markAttendance = asyncHandler(async (req, res) => {
  const teacher = req.teacherProfile;
  const { courseId, classId, date, records } = req.body;

  if (!isValidObjectIdLike(courseId)) throw new AppError('Validation failed', 400, ['courseId is required']);
  if (!isNonEmptyString(date) || Number.isNaN(new Date(date).getTime())) {
    throw new AppError('Validation failed', 400, ['a valid date is required']);
  }
  if (!Array.isArray(records) || records.length === 0) {
    throw new AppError('Validation failed', 400, ['records must be a non-empty array']);
  }
  for (const r of records) {
    if (!isValidObjectIdLike(r.studentId) || !ATTENDANCE_STATUS.includes(r.status)) {
      throw new AppError('Validation failed', 400, ['each record needs a valid studentId and status']);
    }
  }
  if (classId && !isValidObjectIdLike(classId)) throw new AppError('Invalid classId', 400);

  await assertOwnsCourse(teacher._id, courseId);

  const attendanceDate = new Date(date);
  const studentIds = records.map((r) => r.studentId);

  const duplicates = await Attendance.find({
    course: courseId,
    date: attendanceDate,
    student: { $in: studentIds },
  })
    .select('student')
    .lean();

  if (duplicates.length > 0) {
    throw new AppError(
      'Duplicate attendance for one or more students on this date/course',
      400,
      duplicates.map((d) => `Attendance already recorded for student ${d.student}`)
    );
  }

  const docs = records.map((r) => ({
    student: r.studentId,
    course: courseId,
    class: classId || undefined,
    date: attendanceDate,
    status: r.status,
    markedBy: teacher._id,
  }));

  const created = await Attendance.insertMany(docs);
  return sendSuccess(res, { created: created.length }, 201);
});

/** POST /api/teacher/assignments */
const createAssignment = asyncHandler(async (req, res) => {
  const teacher = req.teacherProfile;
  const { courseId, title, description, dueDate, maxMarks, attachmentUrl } = req.body;

  if (!isValidObjectIdLike(courseId)) throw new AppError('Validation failed', 400, ['courseId is required']);
  if (!isNonEmptyString(title)) throw new AppError('Validation failed', 400, ['title is required']);
  if (!isNonEmptyString(dueDate) || Number.isNaN(new Date(dueDate).getTime())) {
    throw new AppError('Validation failed', 400, ['a valid dueDate is required']);
  }

  await assertOwnsCourse(teacher._id, courseId);

  const assignment = await Assignment.create({
    course: courseId,
    teacher: teacher._id,
    title,
    description,
    dueDate: new Date(dueDate),
    maxMarks: maxMarks || undefined,
    attachmentUrl,
  });

  return sendSuccess(res, assignment, 201);
});

/** GET /api/teacher/assignments?courseId= */
const getAssignments = asyncHandler(async (req, res) => {
  const teacher = req.teacherProfile;
  const { courseId } = req.query;

  const filter = { teacher: teacher._id };
  if (courseId) {
    if (!isValidObjectIdLike(courseId)) throw new AppError('Invalid courseId', 400);
    filter.course = courseId;
  }

  const assignments = await Assignment.find(filter)
    .populate('course', 'courseCode courseName')
    .sort({ dueDate: -1 })
    .lean();

  return sendSuccess(res, assignments);
});

/** GET /api/teacher/assignments/:id/submissions */
const getAssignmentSubmissions = asyncHandler(async (req, res) => {
  const teacher = req.teacherProfile;
  const { id } = req.params;

  if (!isValidObjectIdLike(id)) throw new AppError('Invalid assignment id', 400);

  const assignment = await Assignment.findOne({ _id: id, teacher: teacher._id });
  if (!assignment) throw new AppError('Assignment not found', 404);

  const submissions = await Submission.find({ assignment: id })
    .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
    .lean();

  const data = submissions.map((s) => ({
    _id: s._id,
    student: s.student && s.student.user ? s.student.user.name : undefined,
    submittedAt: s.submittedAt,
    marks: s.marks,
    status: s.status,
  }));

  return sendSuccess(res, data);
});

/** PUT /api/teacher/submissions/:id/evaluate */
const evaluateSubmission = asyncHandler(async (req, res) => {
  const teacher = req.teacherProfile;
  const { id } = req.params;
  const { marks, feedback } = req.body;

  if (!isValidObjectIdLike(id)) throw new AppError('Invalid submission id', 400);
  if (typeof marks !== 'number' || Number.isNaN(marks) || marks < 0) {
    throw new AppError('Validation failed', 400, ['marks must be a non-negative number']);
  }

  const submission = await Submission.findById(id).populate('assignment');
  if (!submission) throw new AppError('Submission not found', 404);
  if (!submission.assignment || submission.assignment.teacher.toString() !== teacher._id.toString()) {
    throw new AppError('Not authorized to evaluate this submission', 403);
  }
  if (marks > submission.assignment.maxMarks) {
    throw new AppError('Validation failed', 400, [`marks cannot exceed maxMarks (${submission.assignment.maxMarks})`]);
  }

  submission.marks = marks;
  submission.feedback = feedback || '';
  submission.status = 'EVALUATED';
  submission.evaluatedAt = new Date();
  await submission.save();

  return sendSuccess(res, submission, 200);
});

/** POST /api/teacher/exams */
const createExam = asyncHandler(async (req, res) => {
  const teacher = req.teacherProfile;
  const { courseId, title, examType, date, maxMarks } = req.body;

  if (!isValidObjectIdLike(courseId)) throw new AppError('Validation failed', 400, ['courseId is required']);
  if (!isNonEmptyString(title)) throw new AppError('Validation failed', 400, ['title is required']);
  if (!isNonEmptyString(date) || Number.isNaN(new Date(date).getTime())) {
    throw new AppError('Validation failed', 400, ['a valid date is required']);
  }
  if (examType && !EXAM_TYPES.includes(examType)) {
    throw new AppError('Validation failed', 400, [`examType must be one of ${EXAM_TYPES.join(', ')}`]);
  }

  await assertOwnsCourse(teacher._id, courseId);

  const exam = await Exam.create({
    course: courseId,
    title,
    examType: examType || undefined,
    date: new Date(date),
    maxMarks: maxMarks || undefined,
  });

  return sendSuccess(res, exam, 201);
});

/** POST /api/teacher/results */
const createResults = asyncHandler(async (req, res) => {
  const teacher = req.teacherProfile;
  const { examId, results } = req.body;

  if (!isValidObjectIdLike(examId)) throw new AppError('Validation failed', 400, ['examId is required']);
  if (!Array.isArray(results) || results.length === 0) {
    throw new AppError('Validation failed', 400, ['results must be a non-empty array']);
  }
  for (const r of results) {
    if (!isValidObjectIdLike(r.studentId) || typeof r.marks !== 'number' || r.marks < 0) {
      throw new AppError('Validation failed', 400, ['each result needs a valid studentId and non-negative marks']);
    }
  }

  const exam = await Exam.findById(examId).populate('course');
  if (!exam) throw new AppError('Exam not found', 404);
  if (!exam.course || exam.course.teacher.toString() !== teacher._id.toString()) {
    throw new AppError('Not authorized to record results for this exam', 403);
  }
  if (results.some((r) => r.marks > exam.maxMarks)) {
    throw new AppError('Validation failed', 400, [`marks cannot exceed exam maxMarks (${exam.maxMarks})`]);
  }

  const studentIds = results.map((r) => r.studentId);
  const existing = await Result.find({ exam: examId, student: { $in: studentIds } }).select('student').lean();
  if (existing.length > 0) {
    throw new AppError(
      'Results already recorded for one or more students on this exam',
      400,
      existing.map((e) => `Result already exists for student ${e.student}`)
    );
  }

  // Use create() (not insertMany) with an array so each document's
  // pre('save') grade-auto-derivation hook actually runs.
  const created = await Result.create(
    results.map((r) => ({ exam: examId, student: r.studentId, marks: r.marks }))
  );

  return sendSuccess(res, { created: created.length }, 201);
});

/** GET /api/teacher/analytics?courseId= */
const getAnalytics = asyncHandler(async (req, res) => {
  const teacher = req.teacherProfile;
  const { courseId } = req.query;

  let courseIds;
  if (courseId) {
    await assertOwnsCourse(teacher._id, courseId);
    courseIds = [courseId];
  } else {
    courseIds = await getOwnedCourseIds(teacher._id);
  }

  const studentIds = await Enrollment.distinct('student', { course: { $in: courseIds }, status: 'ACTIVE' });

  // Attendance distribution across the scoped students/courses.
  const attendanceDistribution = { above90: 0, between75and90: 0, below75: 0 };
  for (const studentId of studentIds) {
    const records = await Attendance.find({ student: studentId, course: { $in: courseIds } }).lean();
    if (records.length === 0) continue;
    const pct = calculateAttendancePercentage(records);
    if (pct >= 90) attendanceDistribution.above90 += 1;
    else if (pct >= 75) attendanceDistribution.between75and90 += 1;
    else attendanceDistribution.below75 += 1;
  }

  // Grade distribution across exams in the scoped courses.
  const examIds = await Exam.distinct('_id', { course: { $in: courseIds } });
  const results = await Result.find({ exam: { $in: examIds }, student: { $in: studentIds } }).lean();
  const gradeDistribution = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
  results.forEach((r) => {
    if (r.grade && gradeDistribution[r.grade] !== undefined) gradeDistribution[r.grade] += 1;
  });

  // At-risk students (MEDIUM/HIGH), computed from the same real data.
  const atRiskStudents = [];
  for (const studentId of studentIds) {
    const { riskLevel } = await generateStudentRecommendation(studentId);
    if (riskLevel === 'MEDIUM' || riskLevel === 'HIGH') {
      const student = await Student.findById(studentId).populate('user', 'name').lean();
      atRiskStudents.push({
        studentId: student.studentId,
        name: student.user ? student.user.name : undefined,
        riskLevel,
      });
    }
  }

  return sendSuccess(res, { attendanceDistribution, gradeDistribution, atRiskStudents });
});

module.exports = {
  getDashboard,
  getCourses,
  getStudents,
  markAttendance,
  createAssignment,
  getAssignments,
  getAssignmentSubmissions,
  evaluateSubmission,
  createExam,
  createResults,
  getAnalytics,
};
