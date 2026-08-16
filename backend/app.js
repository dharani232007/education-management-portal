/**
 * backend/app.js
 * Builds and exports the Express app. Kept separate from server.js so
 * the app can be imported by tests without opening a network port.
 */

const express = require('express');
const cors = require('cors');
const corsOptions = require('./config/cors');
const apiRoutes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const createRateLimiter = require('./middleware/rateLimiter');

const app = express();

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Generous global rate limit; stricter limits apply on auth routes.
app.use(createRateLimiter({ windowMs: 60 * 1000, max: 300 }));

app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
