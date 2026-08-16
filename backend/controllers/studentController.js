/**
 * backend/controllers/studentController.js
 * Implements all GET/POST /api/student/* routes from docs/api.md.
 * The acting student is always req.studentProfile, resolved from the
 * authenticated user by middleware/resolveProfile.js -- never from a
 * client-supplied id.
 */

const {
  Enrollment,
  Attendance,
  Assignment,
  Submission,
  Exam,
  Result,
} = require('../../database/models');
const {
  calculateAttendancePercentage,
  calculateAssignmentAverage,
  calculateExamAverage,
  calculateSubjectAverages,
  calculateRiskLevel,
} = require('../utils/academicAnalytics');
const { generateStudentRecommendation } = require('../services/recommendationService');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { isValidObjectIdLike, isNonEmptyString } = require('../utils/validators');

async function getEnrolledCourseIds(studentId) {
  return Enrollment.distinct('course', { student: studentId, status: 'ACTIVE' });
}

/** GET /api/student/dashboard */
const getDashboard = asyncHandler(async (req, res) => {
  const student = req.studentProfile;
  const now = new Date();

  const [attendanceRecords, submissions, results, courseIds] = await Promise.all([
    Attendance.find({ student: student._id }).lean(),
    Submission.find({ student: student._id })
      .populate({ path: 'assignment', populate: { path: 'course', select: 'courseName' } })
      .lean(),
    Result.find({ student: student._id })
      .populate({ path: 'exam', populate: { path: 'course', select: 'courseName' } })
      .lean(),
    getEnrolledCourseIds(student._id),
  ]);

  const attendancePercentage = calculateAttendancePercentage(attendanceRecords);
  const assignmentAverage = calculateAssignmentAverage(submissions);
  const examAverage = calculateExamAverage(results);
  const riskLevel = calculateRiskLevel({ attendancePercentage, assignmentAverage, examAverage });

  const [upcomingAssignments, upcomingExams] = await Promise.all([
    Assignment.countDocuments({ course: { $in: courseIds }, isActive: true, dueDate: { $gte: now } }),
    Exam.countDocuments({ course: { $in: courseIds }, date: { $gte: now } }),
  ]);

  return sendSuccess(res, {
    attendancePercentage,
    assignmentAverage,
    examAverage,
    upcomingAssignments,
    upcomingExams,
    riskLevel,
  });
});

/** GET /api/student/profile */
const getProfile = asyncHandler(async (req, res) => {
  const student = await req.studentProfile.populate('user', 'name email profile role');

  return sendSuccess(res, {
    _id: student._id,
    studentId: student.studentId,
    department: student.department,
    year: student.year,
    section: student.section,
    user: {
      name: student.user.name,
      email: student.user.email,
      profile: student.user.profile,
    },
  });
});

/** GET /api/student/courses */
const getCourses = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.studentProfile._id, status: 'ACTIVE' })
    .populate({
      path: 'course',
      populate: { path: 'teacher', populate: { path: 'user', select: 'name' } },
    })
    .lean();

  const courses = enrollments
    .filter((e) => e.course)
    .map((e) => ({
      _id: e.course._id,
      courseCode: e.course.courseCode,
      courseName: e.course.courseName,
      teacher: { name: e.course.teacher && e.course.teacher.user ? e.course.teacher.user.name : undefined },
      credits: e.course.credits,
    }));

  return sendSuccess(res, courses);
});

/** GET /api/student/attendance?courseId= */
const getAttendance = asyncHandler(async (req, res) => {
  const { courseId } = req.query;
  const student = req.studentProfile;

  if (courseId && !isValidObjectIdLike(courseId)) {
    throw new AppError('Invalid courseId', 400);
  }

  // Overall percentage + byCourse breakdown always reflect ALL of the
  // student's courses; `records` respects the optional courseId filter.
  const allRecords = await Attendance.find({ student: student._id })
    .populate('course', 'courseName')
    .sort({ date: -1 })
    .lean();

  const overallPercentage = calculateAttendancePercentage(allRecords);

  const byCourseMap = new Map();
  allRecords.forEach((r) => {
    if (!r.course) return;
    const key = r.course._id.toString();
    if (!byCourseMap.has(key)) {
      byCourseMap.set(key, { courseId: key, courseName: r.course.courseName, present: 0, absent: 0 });
    }
    const bucket = byCourseMap.get(key);
    if (r.status === 'PRESENT') bucket.present += 1;
    else bucket.absent += 1;
  });
  const byCourse = Array.from(byCourseMap.values()).map((c) => ({
    ...c,
    percentage: c.present + c.absent > 0 ? Math.round((c.present / (c.present + c.absent)) * 1000) / 10 : 0,
  }));

  const filteredRecords = courseId
    ? allRecords.filter((r) => r.course && r.course._id.toString() === courseId)
    : allRecords;

  const records = filteredRecords.map((r) => ({
    date: r.date,
    course: r.course ? r.course.courseName : undefined,
    status: r.status,
  }));

  return sendSuccess(res, { overallPercentage, byCourse, records });
});

/** GET /api/student/assignments?courseId=&status= */
const getAssignments = asyncHandler(async (req, res) => {
  const { courseId, status } = req.query;
  const student = req.studentProfile;

  if (courseId && !isValidObjectIdLike(courseId)) {
    throw new AppError('Invalid courseId', 400);
  }
  if (status && !['PENDING', 'SUBMITTED', 'EVALUATED'].includes(status)) {
    throw new AppError('Invalid status filter', 400);
  }

  const enrolledCourseIds = await getEnrolledCourseIds(student._id);
  const scopedCourseIds = courseId
    ? enrolledCourseIds.filter((id) => id.toString() === courseId)
    : enrolledCourseIds;

  const assignments = await Assignment.find({ course: { $in: scopedCourseIds }, isActive: true })
    .populate('course', 'courseName')
    .sort({ dueDate: 1 })
    .lean();

  const submissions = await Submission.find({
    student: student._id,
    assignment: { $in: assignments.map((a) => a._id) },
  }).lean();
  const submissionByAssignment = new Map(submissions.map((s) => [s.assignment.toString(), s]));

  let data = assignments.map((a) => {
    const submission = submissionByAssignment.get(a._id.toString()) || null;
    const derivedStatus = !submission ? 'PENDING' : submission.status === 'EVALUATED' ? 'EVALUATED' : 'SUBMITTED';
    return {
      _id: a._id,
      title: a.title,
      course: a.course ? a.course.courseName : undefined,
      dueDate: a.dueDate,
      maxMarks: a.maxMarks,
      submission: submission
        ? {
            _id: submission._id,
            status: submission.status,
            marks: submission.marks,
            submittedAt: submission.submittedAt,
          }
        : null,
      _derivedStatus: derivedStatus,
    };
  });

  if (status) {
    data = data.filter((a) => a._derivedStatus === status);
  }
  data = data.map(({ _derivedStatus, ...rest }) => rest);

  return sendSuccess(res, data);
});

/** POST /api/student/assignments/:id/submit */
const submitAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, fileUrl } = req.body;
  const student = req.studentProfile;

  if (!isValidObjectIdLike(id)) {
    throw new AppError('Invalid assignment id', 400);
  }
  if (!isNonEmptyString(content) && !isNonEmptyString(fileUrl)) {
    throw new AppError('Validation failed', 400, ['content or fileUrl is required']);
  }

  const assignment = await Assignment.findById(id);
  if (!assignment || !assignment.isActive) {
    throw new AppError('Assignment not found', 404);
  }

  const enrolled = await Enrollment.findOne({ student: student._id, course: assignment.course, status: 'ACTIVE' });
  if (!enrolled) {
    throw new AppError('You are not enrolled in this course', 403);
  }

  const existing = await Submission.findOne({ assignment: id, student: student._id });
  if (existing) {
    throw new AppError('Assignment already submitted', 400);
  }

  const now = new Date();
  const status = now > assignment.dueDate ? 'LATE' : 'SUBMITTED';

  const submission = await Submission.create({
    assignment: id,
    student: student._id,
    content: content || '',
    fileUrl,
    submittedAt: now,
    status,
  });

  return sendSuccess(
    res,
    { _id: submission._id, status: submission.status, submittedAt: submission.submittedAt },
    201
  );
});

/** GET /api/student/exams */
const getExams = asyncHandler(async (req, res) => {
  const courseIds = await getEnrolledCourseIds(req.studentProfile._id);
  const exams = await Exam.find({ course: { $in: courseIds } })
    .populate('course', 'courseName')
    .sort({ date: 1 })
    .lean();

  const data = exams.map((e) => ({
    _id: e._id,
    title: e.title,
    course: e.course ? e.course.courseName : undefined,
    date: e.date,
    maxMarks: e.maxMarks,
  }));

  return sendSuccess(res, data);
});

/** GET /api/student/results */
const getResults = asyncHandler(async (req, res) => {
  const results = await Result.find({ student: req.studentProfile._id })
    .populate({ path: 'exam', populate: { path: 'course', select: 'courseName' } })
    .sort({ createdAt: -1 })
    .lean();

  const data = results
    .filter((r) => r.exam)
    .map((r) => ({
      _id: r._id,
      exam: r.exam.title,
      course: r.exam.course ? r.exam.course.courseName : undefined,
      marks: r.marks,
      maxMarks: r.exam.maxMarks,
      grade: r.grade,
    }));

  return sendSuccess(res, data);
});

/** GET /api/student/progress */
const getProgress = asyncHandler(async (req, res) => {
  const student = req.studentProfile;

  const [attendanceRecords, submissions, results] = await Promise.all([
    Attendance.find({ student: student._id }).sort({ date: 1 }).lean(),
    Submission.find({ student: student._id })
      .populate({ path: 'assignment', populate: { path: 'course', select: 'courseName' } })
      .lean(),
    Result.find({ student: student._id })
      .populate({ path: 'exam', populate: { path: 'course', select: 'courseName' } })
      .lean(),
  ]);

  // attendanceTrend: percentage per calendar month (YYYY-MM), chronological.
  const byMonth = new Map();
  attendanceRecords.forEach((r) => {
    const month = new Date(r.date).toISOString().slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, { present: 0, total: 0 });
    const bucket = byMonth.get(month);
    bucket.total += 1;
    if (r.status === 'PRESENT') bucket.present += 1;
  });
  const attendanceTrend = Array.from(byMonth.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([month, { present, total }]) => ({
      month,
      percentage: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
    }));

  // examTrend: percentage per exam, in exam date order.
  const examTrend = results
    .filter((r) => r.exam && r.exam.maxMarks)
    .sort((a, b) => new Date(a.exam.date) - new Date(b.exam.date))
    .map((r) => ({
      exam: r.exam.title,
      percentage: Math.round((r.marks / r.exam.maxMarks) * 1000) / 10,
    }));

  const subjectAverages = calculateSubjectAverages(submissions, results).map((s) => ({
    courseName: s.courseName,
    average: s.average,
  }));

  return sendSuccess(res, { attendanceTrend, examTrend, subjectAverages });
});

/** GET /api/student/ai-recommendations */
const getAIRecommendations = asyncHandler(async (req, res) => {
  const data = await generateStudentRecommendation(req.studentProfile._id);
  return sendSuccess(res, data);
});

module.exports = {
  getDashboard,
  getProfile,
  getCourses,
  getAttendance,
  getAssignments,
  submitAssignment,
  getExams,
  getResults,
  getProgress,
  getAIRecommendations,
};
