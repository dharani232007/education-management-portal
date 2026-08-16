/**
 * backend/controllers/adminController.js
 * Implements all /api/admin/* routes from docs/api.md.
 */

const {
  Student,
  Teacher,
  Course,
  Class,
  Exam,
  Result,
  Attendance,
  Submission,
} = require('../../database/models');
const { calculateAttendancePercentage, calculateAssignmentAverage, calculateExamAverage } = require('../utils/academicAnalytics');
const { generateStudentRecommendation } = require('../services/recommendationService');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { isValidObjectIdLike, isNonEmptyString } = require('../utils/validators');

/** GET /api/admin/dashboard */
const getDashboard = asyncHandler(async (req, res) => {
  const [totalStudents, totalTeachers, totalCourses, totalClasses, attendanceRecords] = await Promise.all([
    Student.countDocuments(),
    Teacher.countDocuments(),
    Course.countDocuments(),
    Class.countDocuments(),
    Attendance.find().lean(),
  ]);

  const avgAttendance = calculateAttendancePercentage(attendanceRecords);

  return sendSuccess(res, { totalStudents, totalTeachers, totalCourses, totalClasses, avgAttendance });
});

/** GET /api/admin/students?department=&year=&section= */
const getStudents = asyncHandler(async (req, res) => {
  const { department, year, section } = req.query;
  const filter = {};
  if (department) filter.department = department;
  if (year) filter.year = Number(year);
  if (section) filter.section = section;

  const students = await Student.find(filter).populate('user', 'name').lean();

  const data = students.map((s) => ({
    _id: s._id,
    studentId: s.studentId,
    name: s.user ? s.user.name : undefined,
    department: s.department,
    year: s.year,
    section: s.section,
    status: s.status,
  }));

  return sendSuccess(res, data);
});

/** GET /api/admin/teachers */
const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await Teacher.find().populate('user', 'name').lean();

  const data = teachers.map((t) => ({
    _id: t._id,
    teacherId: t.teacherId,
    name: t.user ? t.user.name : undefined,
    department: t.department,
    designation: t.designation,
    status: t.status,
  }));

  return sendSuccess(res, data);
});

/** GET /api/admin/courses */
const getCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find()
    .populate({ path: 'teacher', populate: { path: 'user', select: 'name' } })
    .lean();

  const data = courses.map((c) => ({
    _id: c._id,
    courseCode: c.courseCode,
    courseName: c.courseName,
    teacher: c.teacher && c.teacher.user ? c.teacher.user.name : undefined,
    credits: c.credits,
    department: c.department,
    semester: c.semester,
  }));

  return sendSuccess(res, data);
});

/** POST /api/admin/courses */
const createCourse = asyncHandler(async (req, res) => {
  const { courseCode, courseName, teacherId, credits, description } = req.body;

  if (!isNonEmptyString(courseCode)) throw new AppError('Validation failed', 400, ['courseCode is required']);
  if (!isNonEmptyString(courseName)) throw new AppError('Validation failed', 400, ['courseName is required']);
  if (!isValidObjectIdLike(teacherId)) throw new AppError('Validation failed', 400, ['teacherId is required']);

  const teacher = await Teacher.findById(teacherId);
  if (!teacher) throw new AppError('Teacher not found', 404);

  const course = await Course.create({
    courseCode,
    courseName,
    teacher: teacherId,
    credits: credits || undefined,
    description,
    department: teacher.department,
  });

  return sendSuccess(res, course, 201);
});

/** PUT /api/admin/courses/:id */
const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectIdLike(id)) throw new AppError('Invalid course id', 400);

  const allowedFields = ['courseCode', 'courseName', 'description', 'teacher', 'department', 'credits', 'semester', 'isActive'];
  const updates = {};
  Object.entries(req.body || {}).forEach(([key, value]) => {
    const field = key === 'teacherId' ? 'teacher' : key;
    if (allowedFields.includes(field)) updates[field] = value;
  });

  if (updates.teacher && !isValidObjectIdLike(updates.teacher)) {
    throw new AppError('Invalid teacherId', 400);
  }

  const course = await Course.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!course) throw new AppError('Course not found', 404);

  return sendSuccess(res, course, 200);
});

/** DELETE /api/admin/courses/:id */
const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectIdLike(id)) throw new AppError('Invalid course id', 400);

  const course = await Course.findByIdAndDelete(id);
  if (!course) throw new AppError('Course not found', 404);

  return sendSuccess(res, { deleted: true }, 200);
});

/** GET /api/admin/classes */
const getClasses = asyncHandler(async (req, res) => {
  const classes = await Class.find()
    .populate('course', 'courseName')
    .populate({ path: 'teacher', populate: { path: 'user', select: 'name' } })
    .lean();

  const data = classes.map((c) => ({
    _id: c._id,
    name: c.name,
    course: c.course ? c.course.courseName : undefined,
    teacher: c.teacher && c.teacher.user ? c.teacher.user.name : undefined,
    studentCount: (c.students || []).length,
  }));

  return sendSuccess(res, data);
});

/** GET /api/admin/exams */
const getExams = asyncHandler(async (req, res) => {
  const exams = await Exam.find().populate('course', 'courseName').sort({ date: -1 }).lean();

  const data = exams.map((e) => ({
    _id: e._id,
    title: e.title,
    course: e.course ? e.course.courseName : undefined,
    date: e.date,
  }));

  return sendSuccess(res, data);
});

/** GET /api/admin/analytics */
const getAnalytics = asyncHandler(async (req, res) => {
  const students = await Student.find().lean();

  const byDept = new Map();
  students.forEach((s) => {
    byDept.set(s.department, (byDept.get(s.department) || 0) + 1);
  });
  const enrollmentByDepartment = Array.from(byDept.entries()).map(([department, count]) => ({ department, count }));

  const riskDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const student of students) {
    const { riskLevel } = await generateStudentRecommendation(student._id);
    riskDistribution[riskLevel] = (riskDistribution[riskLevel] || 0) + 1;
  }

  const courses = await Course.find().lean();
  const avgPerformanceByCourse = [];
  for (const course of courses) {
    const examIds = await Exam.distinct('_id', { course: course._id });
    const results = await Result.find({ exam: { $in: examIds } }).populate('exam', 'maxMarks').lean();
    const examAverage = calculateExamAverage(results);
    avgPerformanceByCourse.push({ courseName: course.courseName, average: examAverage });
  }

  return sendSuccess(res, { enrollmentByDepartment, riskDistribution, avgPerformanceByCourse });
});

/** GET /api/admin/reports?type=&department= */
const getReports = asyncHandler(async (req, res) => {
  const { type, department } = req.query;
  if (!['attendance', 'performance', 'risk'].includes(type)) {
    throw new AppError('Validation failed', 400, ['type must be one of attendance, performance, risk']);
  }

  const studentFilter = {};
  if (department) studentFilter.department = department;
  const students = await Student.find(studentFilter).populate('user', 'name').lean();

  let rows = [];

  if (type === 'attendance') {
    for (const student of students) {
      const records = await Attendance.find({ student: student._id }).lean();
      rows.push({
        studentId: student.studentId,
        name: student.user ? student.user.name : undefined,
        percentage: calculateAttendancePercentage(records),
      });
    }
  } else if (type === 'performance') {
    for (const student of students) {
      const submissions = await Submission.find({ student: student._id })
        .populate({ path: 'assignment', select: 'maxMarks' })
        .lean();
      const results = await Result.find({ student: student._id }).populate('exam', 'maxMarks').lean();
      rows.push({
        studentId: student.studentId,
        name: student.user ? student.user.name : undefined,
        assignmentAverage: calculateAssignmentAverage(submissions),
        examAverage: calculateExamAverage(results),
      });
    }
  } else if (type === 'risk') {
    for (const student of students) {
      const { riskLevel, weakSubjects } = await generateStudentRecommendation(student._id);
      rows.push({
        studentId: student.studentId,
        name: student.user ? student.user.name : undefined,
        riskLevel,
        weakSubjects,
      });
    }
  }

  return sendSuccess(res, { type, generatedAt: new Date(), rows });
});

module.exports = {
  getDashboard,
  getStudents,
  getTeachers,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getClasses,
  getExams,
  getAnalytics,
  getReports,
};
