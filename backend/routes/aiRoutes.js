const express = require('express');
const controller = require('../controllers/aiController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { resolveTeacherProfileIfTeacher } = require('../middleware/resolveProfile');

const router = express.Router();

router.get(
  '/student/:id',
  authenticateToken,
  authorizeRoles('TEACHER', 'ADMIN'),
  resolveTeacherProfileIfTeacher,
  controller.getStudentAI
);

router.get(
  '/class/:id',
  authenticateToken,
  authorizeRoles('TEACHER', 'ADMIN'),
  resolveTeacherProfileIfTeacher,
  controller.getClassAI
);

router.get('/overview', authenticateToken, authorizeRoles('ADMIN'), controller.getOverview);

module.exports = router;
