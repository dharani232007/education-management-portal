const express = require('express');
const controller = require('../controllers/studentController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { resolveStudentProfile } = require('../middleware/resolveProfile');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('STUDENT'), resolveStudentProfile);

router.get('/dashboard', controller.getDashboard);
router.get('/profile', controller.getProfile);
router.get('/courses', controller.getCourses);
router.get('/attendance', controller.getAttendance);
router.get('/assignments', controller.getAssignments);
router.post('/assignments/:id/submit', controller.submitAssignment);
router.get('/exams', controller.getExams);
router.get('/results', controller.getResults);
router.get('/progress', controller.getProgress);
router.get('/ai-recommendations', controller.getAIRecommendations);

module.exports = router;
