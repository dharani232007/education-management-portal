/**
 * backend/utils/jwt.js
 * Thin wrapper around jsonwebtoken so the secret/expiry are read from
 * config/env.js in exactly one place.
 */

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

function signToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
