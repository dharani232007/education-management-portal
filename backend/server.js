/**
 * backend/server.js
 * Entry point: validates env, connects to MongoDB, then starts Express.
 */

const { env, validateEnv } = require('./config/env');
const { connectDB } = require('../database/connection');
const app = require('./app');

validateEnv();

async function start() {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      console.log(`[server] Listening on port ${env.PORT} (${env.NODE_ENV})`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
}

start();

process.on('unhandledRejection', (err) => {
  console.error('[server] Unhandled rejection:', err);
});
