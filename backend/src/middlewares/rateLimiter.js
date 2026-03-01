import rateLimit from 'express-rate-limit';

const errorBody = (code, message) => ({
  success: false,
  error: { code, message },
});

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: errorBody('RATE_LIMIT', 'Trop de tentatives. Réessayez dans 1 minute.'),
});

export const totpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: errorBody('RATE_LIMIT', 'Trop de tentatives A2F. Réessayez dans 1 minute.'),
});

export const transactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: errorBody('RATE_LIMIT', 'Trop de requêtes. Réessayez dans 1 minute.'),
});

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: errorBody('RATE_LIMIT', 'Limite de requêtes dépassée.'),
});
