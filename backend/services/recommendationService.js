/**
 * backend/services/recommendationService.js
 *
 * Bridges the raw academic records (Attendance, Submission, Result) with
 * backend/utils/academicAnalytics.js and backend/services/aiService.js so
 * every route that needs an AI recommendation (student self-view,
 * teacher/admin per-student view, class view, institution overview) goes
 * through the exact same computation -- no duplicated logic, no drift.
 *
 * Every call computes metrics fresh from current data and appends a new
 * AIRecommendation document (the model is documented as append-only;
 * "latest" is whichever generatedAt is most recent). This guarantees the
 * AI/fallback analysis always reflects real, current academic data as
 * required by the project spec, rather than serving a stale cached copy.
 */

const { Attendance, Submission, Result, AIRecommendation } = require('../../database/models');
const {
  calculateAttendancePercentage,
  calculateAssignmentAverage,
  calculateExamAverage,
  calculateSubjectAverages,
} = require('../utils/academicAnalytics');
const { getStudentAIRecommendation } = require('./aiService');

/**
 * Computes the raw metrics for a single student from real DB records.
 * @param {import('mongoose').Types.ObjectId|string} studentId
 */
async function computeStudentMetrics(studentId) {
  const [attendanceRecords, submissions, results] = await Promise.all([
    Attendance.find({ student: studentId }).lean(),
    Submission.find({ student: studentId })
      .populate({ path: 'assignment', populate: { path: 'course', select: 'courseName' } })
      .lean(),
    Result.find({ student: studentId })
      .populate({ path: 'exam', populate: { path: 'course', select: 'courseName' } })
      .lean(),
  ]);

  const attendancePercentage = calculateAttendancePercentage(attendanceRecords);
  const assignmentAverage = calculateAssignmentAverage(submissions);
  const examAverage = calculateExamAverage(results);
  const subjectAverages = calculateSubjectAverages(submissions, results);

  return { attendancePercentage, assignmentAverage, examAverage, subjectAverages };
}

/**
 * Generates a fresh recommendation for a student, persists it, and
 * returns it shaped exactly like docs/api.md expects:
 *   { riskLevel, weakSubjects, observations, recommendations, metrics, source, generatedAt }
 */
async function generateStudentRecommendation(studentId) {
  const metrics = await computeStudentMetrics(studentId);
  const result = await getStudentAIRecommendation(metrics);

  const saved = await AIRecommendation.create({
    student: studentId,
    riskLevel: result.riskLevel,
    weakSubjects: result.weakSubjects,
    observations: result.observations,
    recommendations: result.recommendations,
    metrics: {
      attendancePercentage: metrics.attendancePercentage,
      assignmentAverage: metrics.assignmentAverage,
      examAverage: metrics.examAverage,
    },
    source: result.source,
    generatedAt: new Date(),
  });

  return {
    riskLevel: saved.riskLevel,
    weakSubjects: saved.weakSubjects,
    observations: saved.observations,
    recommendations: saved.recommendations,
    metrics: saved.metrics,
    source: saved.source,
    generatedAt: saved.generatedAt,
  };
}

module.exports = { computeStudentMetrics, generateStudentRecommendation };
