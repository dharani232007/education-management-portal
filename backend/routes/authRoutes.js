const express = require('express');
const { register, login, me } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const createRateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Tighter limiter on auth endpoints to slow brute-force attempts.
const authLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20 });

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticateToken, me);

module.exports = router;
