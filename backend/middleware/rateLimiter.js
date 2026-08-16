/**
 * backend/middleware/rateLimiter.js
 *
 * Minimal in-memory fixed-window rate limiter with no external
 * dependency. Good enough for a hackathon single-process deployment;
 * intended primarily to slow down brute-force attempts against
 * /api/auth/login and /api/auth/register.
 *
 * NOTE: state is per-process and resets on restart -- fine for this
 * project's scope, but not a substitute for a distributed limiter
 * (e.g. Redis-backed) in a real production deployment.
 */

function createRateLimiter({ windowMs = 60 * 1000, max = 20, message = 'Too many requests, please try again later.' } = {}) {
  const hits = new Map(); // key -> { count, resetAt }

  return function rateLimiter(req, res, next) {
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ success: false, message });
    }

    next();
  };
}

module.exports = createRateLimiter;
