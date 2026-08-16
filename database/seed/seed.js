/**
 * database/seed/seed.js
 *
 * Populates a fresh (or existing) database with enough demo data to
 * demonstrate every feature: auth, courses, classes, enrollments,
 * attendance, assignments, submissions, exams, results, and AI
 * recommendations.
 *
 * SAFE TO RE-RUN: clears its own collections first (does not touch
 * unrelated collections that might exist).
 *
 * Usage:
 *   node database/seed/seed.js
 *
 * Requires MONGO_URI in your environment (see .env.example).
 * Demo passwords are documented, not secret -- do not reuse in production.
 */

require('dotenv').config();
const { connectDB, disconnectDB } = require('../connection');
const {
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
} = require('../models');
const { generateFallbackRecommendation } = require('../../backend/services/fallbackAI');
const {
  calculateAttendancePercentage,
  calculateAssignmentAverage,
  calculateExamAverage,
  calculateSubjectAverages,
} = require('../../backend/utils/academicAnalytics');

const DEMO_PASSWORD = 'Passw0rd!'; // documented demo credential only, never a real secret

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function clearCollections() {
  await Promise.all([
    User.deleteMany({}),
    Student.deleteMany({}),
    Teacher.deleteMany({}),
    Course.deleteMany({}),
    Class.deleteMany({}),
    Enrollment.deleteMany({}),
    Attendance.deleteMany({}),
    Assignment.deleteMany({}),
    Submission.deleteMany({}),
    Exam.deleteMany({}),
    Result.deleteMany({}),
    AIRecommendation.deleteMany({}),
  ]);
  console.log('[seed] Cleared existing collections');
}

async function seed() {
  await connectDB();
  await clearCollections();

  // ---------- Users: Admin ----------
  const adminUser = await User.create({
    name: 'Ananya Rao',
    email: 'admin@edumanage.com',
    password: DEMO_PASSWORD,
    role: 'ADMIN',
  });

  // ---------- Users + Teachers ----------
  const teacherDefs = [
    { name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@edumanage.com', department: 'Computer Science', teacherId: 'TCH001' },
    { name: 'Dr. Priya Sharma', email: 'priya.sharma@edumanage.com', department: 'Mathematics', teacherId: 'TCH002' },
  ];

  const teachers = [];
  for (const def of teacherDefs) {
    const user = await User.create({
      name: def.name,
      email: def.email,
      password: DEMO_PASSWORD,
      role: 'TEACHER',
    });
    const teacher = await Teacher.create({
      user: user._id,
      teacherId: def.teacherId,
      department: def.department,
      designation: 'Associate Professor',
    });
    teachers.push(teacher);
  }
  const [teacherCS, teacherMath] = teachers;

  // ---------- Users + Students ----------
  const studentDefs = [
    { name: 'Arjun Mehta', email: 'arjun.mehta@student.edumanage.com', studentId: 'STU001', year: 2, section: 'A' },
    { name: 'Sneha Iyer', email: 'sneha.iyer@student.edumanage.com', studentId: 'STU002', year: 2, section: 'A' },
    { name: 'Vikram Singh', email: 'vikram.singh@student.edumanage.com', studentId: 'STU003', year: 2, section: 'B' },
    { name: 'Divya Nair', email: 'divya.nair@student.edumanage.com', studentId: 'STU004', year: 2, section: 'B' },
    { name: 'Karthik Reddy', email: 'karthik.reddy@student.edumanage.com', studentId: 'STU005', year: 3, section: 'A' },
    { name: 'Meera Pillai', email: 'meera.pillai@student.edumanage.com', studentId: 'STU006', year: 3, section: 'A' },
    { name: 'Rohan Das', email: 'rohan.das@student.edumanage.com', studentId: 'STU007', year: 3, section: 'B' },
    { name: 'Ishita Verma', email: 'ishita.verma@student.edumanage.com', studentId: 'STU008', year: 1, section: 'A' },
  ];

  const students = [];
  for (const def of studentDefs) {
    const user = await User.create({
      name: def.name,
      email: def.email,
      password: DEMO_PASSWORD,
      role: 'STUDENT',
    });
    const student = await Student.create({
      user: user._id,
      studentId: def.studentId,
      department: 'Computer Science',
      year: def.year,
      section: def.section,
    });
    students.push(student);
  }

  // ---------- Courses ----------
  const courseDefs = [
    { courseCode: 'CS201', courseName: 'Data Structures', teacher: teacherCS._id, credits: 4 },
    { courseCode: 'CS301', courseName: 'Database Systems', teacher: teacherCS._id, credits: 4 },
    { courseCode: 'MA201', courseName: 'Mathematics', teacher: teacherMath._id, credits: 3 },
    { courseCode: 'CS401', courseName: 'Operating Systems', teacher: teacherCS._id, credits: 4 },
  ];
  const courses = [];
  for (const def of courseDefs) {
    courses.push(await Course.create({ ...def, department: 'Computer Science' }));
  }
  const [dataStructures, databaseSystems, mathematics, operatingSystems] = courses;

  // ---------- Classes ----------
  const classDataStructures = await Class.create({
    name: 'Data Structures - Sec A',
    course: dataStructures._id,
    teacher: teacherCS._id,
    students: students.slice(0, 6).map((s) => s._id),
    schedule: { days: ['MON', 'WED', 'FRI'], startTime: '09:00', endTime: '10:00' },
    room: 'CS-101',
  });

  const classMathematics = await Class.create({
    name: 'Mathematics - Sec A',
    course: mathematics._id,
    teacher: teacherMath._id,
    students: students.slice(0, 6).map((s) => s._id),
    schedule: { days: ['TUE', 'THU'], startTime: '11:00', endTime: '12:00' },
    room: 'MA-201',
  });

  // ---------- Enrollments ----------
  // Every student enrolls in Data Structures and Mathematics; some also in Database Systems.
  for (const student of students) {
    await Enrollment.create({ student: student._id, course: dataStructures._id });
    await Enrollment.create({ student: student._id, course: mathematics._id });
  }
  for (const student of students.slice(0, 5)) {
    await Enrollment.create({ student: student._id, course: databaseSystems._id });
  }
  for (const student of students.slice(4, 8)) {
    await Enrollment.create({ student: student._id, course: operatingSystems._id });
  }

  // ---------- Attendance ----------
  // Give each of the first 6 students a spread of attendance over the last 20 class days,
  // deliberately varying so at least one student is a clear HIGH-risk / low-attendance case.
  const attendancePatternByIndex = [
    0.95, // Arjun - excellent
    0.88, // Sneha - good
    0.6, // Vikram - poor (will drive HIGH risk)
    0.82, // Divya - good
    0.75, // Karthik - moderate
    0.9, // Meera - excellent
  ];

  for (let i = 0; i < 6; i += 1) {
    const student = students[i];
    const presentRate = attendancePatternByIndex[i];
    for (let day = 20; day >= 1; day -= 1) {
      const isPresent = Math.random() < presentRate;
      await Attendance.create({
        student: student._id,
        course: dataStructures._id,
        class: classDataStructures._id,
        date: daysAgo(day),
        status: isPresent ? 'PRESENT' : 'ABSENT',
        markedBy: teacherCS._id,
      });
    }
  }

  // ---------- Assignments ----------
  const assignmentDS1 = await Assignment.create({
    course: dataStructures._id,
    teacher: teacherCS._id,
    title: 'Linked List Implementation',
    description: 'Implement singly and doubly linked lists with insert/delete operations.',
    dueDate: daysAgo(10),
    maxMarks: 100,
  });

  const assignmentDS2 = await Assignment.create({
    course: dataStructures._id,
    teacher: teacherCS._id,
    title: 'Binary Search Trees',
    description: 'Implement BST insert, delete, and traversal operations.',
    dueDate: daysFromNow(5),
    maxMarks: 100,
  });

  const assignmentMath1 = await Assignment.create({
    course: mathematics._id,
    teacher: teacherMath._id,
    title: 'Linear Algebra Problem Set',
    description: 'Solve the attached matrix and vector-space problems.',
    dueDate: daysAgo(7),
    maxMarks: 50,
  });

  // ---------- Submissions ----------
  // Deliberately weak marks for Vikram (index 2) to reinforce the HIGH-risk demo case.
  const assignmentMarksByIndex = [88, 76, 45, 70, 60, 92];

  for (let i = 0; i < 6; i += 1) {
    const student = students[i];
    const marks = assignmentMarksByIndex[i];
    await Submission.create({
      assignment: assignmentDS1._id,
      student: student._id,
      content: 'Submitted implementation with test cases.',
      submittedAt: daysAgo(11),
      marks,
      feedback: marks >= 70 ? 'Well structured, good edge-case handling.' : 'Revisit pointer handling and edge cases.',
      status: 'EVALUATED',
      evaluatedAt: daysAgo(9),
    });

    await Submission.create({
      assignment: assignmentMath1._id,
      student: student._id,
      content: 'Submitted solutions for all problems.',
      submittedAt: daysAgo(8),
      marks: Math.round((marks / 100) * 50 * (0.9 + Math.random() * 0.2)),
      feedback: 'Reviewed.',
      status: 'EVALUATED',
      evaluatedAt: daysAgo(6),
    });
  }

  // ---------- Exams ----------
  const examDSMidterm = await Exam.create({
    course: dataStructures._id,
    title: 'Data Structures Midterm',
    examType: 'MIDTERM',
    date: daysAgo(15),
    maxMarks: 100,
  });

  const examMathMidterm = await Exam.create({
    course: mathematics._id,
    title: 'Mathematics Midterm',
    examType: 'MIDTERM',
    date: daysAgo(14),
    maxMarks: 100,
  });

  // ---------- Results ----------
  const examMarksByIndex = [85, 70, 42, 68, 58, 90];
  for (let i = 0; i < 6; i += 1) {
    const student = students[i];
    const marks = examMarksByIndex[i];
    await Result.create({ exam: examDSMidterm._id, student: student._id, marks });
    await Result.create({
      exam: examMathMidterm._id,
      student: student._id,
      marks: Math.max(0, marks - 5 + Math.round(Math.random() * 10)),
    });
  }

  // ---------- AI Recommendations ----------
  // Generate a real recommendation (via fallback engine, deterministic for demo)
  // for each of the 6 students with data, using the exact same analytics helpers
  // the live AI endpoints will use.
  for (let i = 0; i < 6; i += 1) {
    const student = students[i];

    const attendanceRecords = await Attendance.find({ student: student._id }).lean();
    const attendancePercentage = calculateAttendancePercentage(attendanceRecords);

    const submissions = await Submission.find({ student: student._id })
      .populate({ path: 'assignment', populate: { path: 'course', select: 'courseName' } })
      .lean();
    const assignmentAverage = calculateAssignmentAverage(submissions);

    const results = await Result.find({ student: student._id })
      .populate({ path: 'exam', populate: { path: 'course', select: 'courseName' } })
      .lean();
    const examAverage = calculateExamAverage(results);

    const subjectAverages = calculateSubjectAverages(submissions, results);

    const recommendation = generateFallbackRecommendation({
      attendancePercentage,
      assignmentAverage,
      examAverage,
      subjectAverages,
    });

    await AIRecommendation.create({
      student: student._id,
      ...recommendation,
      metrics: { attendancePercentage, assignmentAverage, examAverage },
      generatedAt: new Date(),
    });
  }

  console.log('[seed] Seed complete.');
  console.log('[seed] Demo login credentials (password for all: %s):', DEMO_PASSWORD);
  console.log('[seed]   Admin:   admin@edumanage.com');
  console.log('[seed]   Teacher: rajesh.kumar@edumanage.com');
  console.log('[seed]   Student: arjun.mehta@student.edumanage.com');
  console.log(`[seed] Created: 1 admin, ${teachers.length} teachers, ${students.length} students, ${courses.length} courses`);

  await disconnectDB();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
