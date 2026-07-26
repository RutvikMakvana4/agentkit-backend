import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { registerTools } from './tools/index.js';

// Register all tools once at startup — turns existing backend functions
// into callable AI tools before any request comes in.
registerTools();

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({ origin: env.CORS_ORIGIN }));

// Request logging (skip in tests to keep output clean)
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes — internal dashboard API. The public, API-key-authenticated agent
app.use('/api', routes);

// 404 handler — must come after all routes
app.use(notFound);

// Centralized error handler — must be registered last
app.use(errorHandler);

export default app;
