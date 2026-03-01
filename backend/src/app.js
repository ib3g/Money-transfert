import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { globalLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { env } from './config/env.js';

// Routes
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import zonesRoutes from './modules/zones/zones.routes.js';
import ratesRoutes from './modules/exchangeRates/rates.routes.js';
import transactionsRoutes from './modules/transactions/transactions.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import statsRoutes from './modules/stats/stats.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';

export function createApp() {
  const app = express();

  // Trust proxy for Coolify / Docker (so express-rate-limit gets correct IP via X-Forwarded-For)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.isDev ? false : undefined,
  }));

  // CORS
  app.use(cors({
    origin: env.isDev
      ? ['http://localhost:5173', 'http://localhost:3000']
      : process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Rate limiting global
  app.use(globalLimiter);

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  // API routes
  const r = express.Router();
  r.use('/auth', authRoutes);
  r.use('/users', usersRoutes);
  r.use('/zones', zonesRoutes);
  r.use('/rates', ratesRoutes);
  r.use('/transactions', transactionsRoutes);
  r.use('/notifications', notificationsRoutes);
  r.use('/reports', reportsRoutes);
  r.use('/stats', statsRoutes);
  r.use('/audit-logs', auditRoutes);

  app.use('/api/v1', r);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route introuvable' } });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
