/**
 * backend/utils/academicAnalytics.js
 *
 * Pure, dependency-light helper functions that turn raw records
 * (Attendance, Submission, Result) into the metrics the AI service
 * and analytics endpoints need. Kept separate from aiService.js so
 * both the "real" AI path and the fallback path can reuse the exact
 * same numbers (no drift between the two).
 *
 * All functions are pure (no DB calls) -- pass in already-fetched
 * arrays of plain objects or Mongoose documents.
 */

/**
 * @param {Array} attendanceRecords - [{ status: 'PRESENT' | 'ABSENT', course, ... }]
 * @returns {number} percentage 0-100, rounded to 1 decimal
 */
function calculateAttendancePercentage(attendanceRecords = []) {
  if (!attendanceRecords.length) return 0;
  const present = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
  return round1((present / attendanceRecords.length) * 100);
}

/**
 * @param {Array} submissions - [{ marks, assignment: { maxMarks } }]
 * Only submissions that have been evaluated (marks != null) count.
 * @returns {number} percentage average 0-100
 */
function calculateAssignmentAverage(submissions = []) {
  const evaluated = submissions.filter(
    (s) => s.marks !== null && s.marks !== undefined && s.assignment && s.assignment.maxMarks
  );
  if (!evaluated.length) return 0;
  const total = evaluated.reduce((sum, s) => sum + (s.marks / s.assignment.maxMarks) * 100, 0);
  return round1(total / evaluated.length);
}

/**
 * @param {Array} results - [{ marks, exam: { maxMarks, title } }]
 * @returns {number} percentage average 0-100
 */
function calculateExamAverage(results = []) {
  const valid = results.filter((r) => r.exam && r.exam.maxMarks);
  if (!valid.length) return 0;
  const total = valid.reduce((sum, r) => sum + (r.marks / r.exam.maxMarks) * 100, 0);
  return round1(total / valid.length);
}

/**
 * Per-subject (course) breakdown, used to find weak subjects.
 * Combines assignment + exam percentage per course into one average.
 *
 * @param {Array} submissions - each with populated `assignment.course.courseName`
 * @param {Array} results - each with populated `exam.course.courseName`
 * @returns {Array<{ courseName: string, average: number }>}
 */
function calculateSubjectAverages(submissions = [], results = []) {
  const bySubject = {};

  submissions.forEach((s) => {
    if (s.marks === null || s.marks === undefined || !s.assignment || !s.assignment.maxMarks) return;
    const courseName = s.assignment.course && s.assignment.course.courseName;
    if (!courseName) return;
    const pct = (s.marks / s.assignment.maxMarks) * 100;
    bySubject[courseName] = bySubject[courseName] || [];
    bySubject[courseName].push(pct);
  });

  results.forEach((r) => {
    if (!r.exam || !r.exam.maxMarks) return;
    const courseName = r.exam.course && r.exam.course.courseName;
    if (!courseName) return;
    const pct = (r.marks / r.exam.maxMarks) * 100;
    bySubject[courseName] = bySubject[courseName] || [];
    bySubject[courseName].push(pct);
  });

  return Object.entries(bySubject).map(([courseName, scores]) => ({
    courseName,
    average: round1(scores.reduce((a, b) => a + b, 0) / scores.length),
  }));
}

/**
 * Subjects below the weakness threshold (default 60%).
 */
function findWeakSubjects(subjectAverages = [], threshold = 60) {
  return subjectAverages.filter((s) => s.average < threshold).map((s) => s.courseName);
}

/**
 * Combines the three headline metrics into a risk level.
 * Shared by both the real AI prompt (as guidance) and the fallback engine
 * (as the actual decision logic), so results stay consistent either way.
 */
function calculateRiskLevel({ attendancePercentage, assignmentAverage, examAverage }) {
  const score = (attendancePercentage + assignmentAverage + examAverage) / 3;

  if (attendancePercentage < 65 || score < 50) return 'HIGH';
  if (attendancePercentage < 80 || score < 70) return 'MEDIUM';
  return 'LOW';
}

function round1(num) {
  return Math.round(num * 10) / 10;
}

module.exports = {
  calculateAttendancePercentage,
  calculateAssignmentAverage,
  calculateExamAverage,
  calculateSubjectAverages,
  findWeakSubjects,
  calculateRiskLevel,
};
