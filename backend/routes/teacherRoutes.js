const express = require('express');
const controller = require('../controllers/teacherController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { resolveTeacherProfile } = require('../middleware/resolveProfile');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('TEACHER'), resolveTeacherProfile);

router.get('/dashboard', controller.getDashboard);
router.get('/courses', controller.getCourses);
router.get('/students', controller.getStudents);
router.post('/attendance', controller.markAttendance);
router.post('/assignments', controller.createAssignment);
router.get('/assignments', controller.getAssignments);
router.get('/assignments/:id/submissions', controller.getAssignmentSubmissions);
router.put('/submissions/:id/evaluate', controller.evaluateSubmission);
router.post('/exams', controller.createExam);
router.post('/results', controller.createResults);
router.get('/analytics', controller.getAnalytics);

module.exports = router;
