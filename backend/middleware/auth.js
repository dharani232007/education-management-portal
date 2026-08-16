/**
 * backend/middleware/auth.js
 *
 * authenticateToken: verifies the Bearer JWT and attaches the full user
 *   document (minus password) to req.user. This is the ONLY source of
 *   truth for "who is making this request" -- route handlers must never
 *   trust a user/student/teacher id supplied by the client for
 *   determining the acting identity.
 *
 * authorizeRoles: restricts a route to one or more roles.
 */

const { User } = require('../../database/models');
const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const authenticateToken = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Not authenticated', 401);
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('User no longer exists', 401);
  }
  if (!user.isActive) {
    throw new AppError('Account is inactive', 401);
  }

  req.user = user;
  next();
});

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }
  if (!roles.includes(req.user.role)) {
    throw new AppError('Forbidden: insufficient role for this resource', 403);
  }
  next();
};

module.exports = { authenticateToken, authorizeRoles };
