/**
 * backend/config/env.js
 *
 * Central place to read process.env. Every other backend file should
 * import values from here instead of touching process.env directly, so
 * required-variable checks happen in exactly one place at startup.
 *
 * Variable names match docs/database.md exactly (MONGO_URI, not MONGODB_URI).
 */

require('dotenv').config();

const REQUIRED_IN_PRODUCTION = ['MONGO_URI', 'JWT_SECRET'];

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/education_management_portal',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_API_URL: process.env.AI_API_URL || 'https://api.anthropic.com/v1/messages',
  AI_MODEL: process.env.AI_MODEL || 'claude-sonnet-4-6',
  AI_TIMEOUT_MS: Number(process.env.AI_TIMEOUT_MS || 8000),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};

function validateEnv() {
  const missing = [];
  if (!env.JWT_SECRET) missing.push('JWT_SECRET');

  if (missing.length) {
    // Fail loudly at boot rather than silently signing tokens with an
    // empty/undefined secret, which would be a serious security bug.
    console.error(`[config] Missing required environment variable(s): ${missing.join(', ')}`);
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.error('[config] Continuing in non-production mode with an insecure default JWT secret.');
      env.JWT_SECRET = env.JWT_SECRET || 'dev-only-insecure-secret-change-me';
    }
  }
}

module.exports = { env, validateEnv, REQUIRED_IN_PRODUCTION };
