/**
 * backend/services/fallbackAI.js
 *
 * Rule-based academic risk engine. This is NOT a chatbot -- it is a
 * deterministic function of attendance/assignment/exam metrics.
 *
 * Used automatically by aiService.js whenever:
 *   - no AI provider is configured (no AI_API_KEY in env), OR
 *   - the external AI API call fails/times out
 *
 * Guarantees the app keeps working end-to-end even with zero external
 * dependencies, which matters for a hackathon demo.
 */

const { calculateRiskLevel } = require('../utils/academicAnalytics');

/**
 * @param {Object} params
 * @param {number} params.attendancePercentage
 * @param {number} params.assignmentAverage
 * @param {number} params.examAverage
 * @param {Array<{courseName: string, average: number}>} params.subjectAverages
 * @returns {{riskLevel: string, weakSubjects: string[], observations: string[], recommendations: string[], source: 'FALLBACK'}}
 */
function generateFallbackRecommendation({
  attendancePercentage = 0,
  assignmentAverage = 0,
  examAverage = 0,
  subjectAverages = [],
}) {
  const riskLevel = calculateRiskLevel({ attendancePercentage, assignmentAverage, examAverage });

  const weakSubjects = subjectAverages
    .filter((s) => s.average < 60)
    .sort((a, b) => a.average - b.average)
    .map((s) => s.courseName);

  const observations = [];
  const recommendations = [];

  // Attendance-related observations
  if (attendancePercentage < 65) {
    observations.push(`Attendance is critically low at ${attendancePercentage}%.`);
    recommendations.push('Improve attendance to stay eligible for exams and keep pace with coursework.');
  } else if (attendancePercentage < 80) {
    observations.push(`Attendance is below the recommended threshold at ${attendancePercentage}%.`);
    recommendations.push('Aim for at least 80% attendance in upcoming classes.');
  } else {
    observations.push(`Attendance is healthy at ${attendancePercentage}%.`);
  }

  // Assignment-related observations
  if (assignmentAverage < 50) {
    observations.push(`Assignment average is low at ${assignmentAverage}%.`);
    recommendations.push('Dedicate more time to assignment preparation and seek help on difficult topics.');
  } else if (assignmentAverage < 70) {
    observations.push(`Assignment average is moderate at ${assignmentAverage}%.`);
    recommendations.push('Review feedback on recent assignments to close small gaps.');
  }

  // Exam-related observations
  if (examAverage < 50) {
    observations.push(`Exam average is low at ${examAverage}%.`);
    recommendations.push('Review recent exam topics and focus revision on foundational concepts.');
  } else if (examAverage < 70) {
    observations.push(`Exam average is moderate at ${examAverage}%.`);
    recommendations.push('Practice past exam patterns to strengthen weaker areas.');
  }

  // Subject-specific recommendations
  weakSubjects.forEach((subject) => {
    recommendations.push(`Practice ${subject} problem solving and revisit fundamentals.`);
  });

  if (riskLevel === 'LOW' && recommendations.length === 0) {
    recommendations.push('Keep up the consistent performance across attendance, assignments, and exams.');
  }

  return {
    riskLevel,
    weakSubjects,
    observations,
    recommendations,
    source: 'FALLBACK',
  };
}

module.exports = { generateFallbackRecommendation };
