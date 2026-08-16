const express = require('express');
const controller = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('ADMIN'));

router.get('/dashboard', controller.getDashboard);
router.get('/students', controller.getStudents);
router.get('/teachers', controller.getTeachers);
router.get('/courses', controller.getCourses);
router.post('/courses', controller.createCourse);
router.put('/courses/:id', controller.updateCourse);
router.delete('/courses/:id', controller.deleteCourse);
router.get('/classes', controller.getClasses);
router.get('/exams', controller.getExams);
router.get('/analytics', controller.getAnalytics);
router.get('/reports', controller.getReports);

module.exports = router;
