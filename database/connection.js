/**
 * database/connection.js
 * Central Mongoose connection helper.
 * Used by backend/server.js (Person 2) to connect on startup,
 * and by database/seed/seed.js for seeding.
 */

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/education_management_portal';

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(MONGO_URI, {
      // Modern Mongoose (6+) no longer needs useNewUrlParser / useUnifiedTopology,
      // they are kept out intentionally to avoid deprecation warnings.
    });
    isConnected = true;
    console.log(`[database] MongoDB connected: ${mongoose.connection.host}`);
    return mongoose.connection;
  } catch (err) {
    console.error('[database] MongoDB connection error:', err.message);
    throw err;
  }
}

async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('[database] MongoDB disconnected');
}

module.exports = { connectDB, disconnectDB, mongoose };
