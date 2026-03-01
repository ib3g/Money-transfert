import { prisma } from '../config/database.js';

/**
 * Log an audit entry (fire and forget)
 */
export const logAudit = (userId, action, entity, entityId, details = null, ipAddress = null) => {
  prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      details,
      ipAddress,
    },
  }).catch((err) => {
    console.error('[AUDIT] Failed to log:', err.message);
  });
};

/**
 * Middleware factory for route-level audit logging
 */
export const auditMiddleware = (action, entity) => (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode < 400 && req.user) {
      const entityId = req.params.id ?? req.body?.id ?? 'unknown';
      logAudit(req.user.id, action, entity, entityId, null, req.ip);
    }
  });
  next();
};
