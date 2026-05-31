import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';

import env from './config/env.js';
import corsOptions from './config/cors.js';
import logger from './config/logger.js';
import routes from './routes/index.js';
import connectDB from './config/db.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import errorHandler from './middlewares/errorHandler.js';
import ApiError from './utils/ApiError.js';

const app = express();

// ✅ Connect DB only once
await connectDB();

// ─── Security middleware ───────────────────────────────────────

// Set security HTTP headers
app.use(helmet());

// CORS
app.use(cors(corsOptions));

// Rate limiting
app.use('/api/', apiLimiter);

// Sanitize NoSQL injection attempts
app.use(mongoSanitize());

// ─── Body parsing ──────────────────────────────────────────────

// Parse JSON bodies
app.use(express.json({ limit: '10kb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Parse cookies
app.use(cookieParser());

// ─── Logging ───────────────────────────────────────────────────

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (msg) => logger.info(msg.trim()),
      },
    })
  );
}

// ─── API routes ────────────────────────────────────────────────

app.use('/api/v1', routes);

// Test Route
app.get('/', (req, res) => {
  res.send('Backend Running Successfully 🚀');
});

// ─── 404 handler ───────────────────────────────────────────────

app.all('*', (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
});

// ─── Global error handler ──────────────────────────────────────

app.use(errorHandler);

export default app;
