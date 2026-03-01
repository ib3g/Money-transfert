import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { Errors } from '../utils/errors.js';

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next(Errors.UNAUTHORIZED());

    const token = header.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, env.jwt.secret);
    } catch {
      return next(Errors.SESSION_EXPIRED());
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, permissions: true, isActive: true,
        currentSessionId: true, lastActivityAt: true,
        zones: { include: { zone: true } },
      },
    });

    if (!user) return next(Errors.UNAUTHORIZED());
    if (!user.isActive) return next(Errors.USER_INACTIVE());

    // Session unique : vérifier le sessionId
    if (user.currentSessionId && payload.sessionId !== user.currentSessionId) {
      return next(Errors.SESSION_EXPIRED());
    }

    // Inactivité
    const now = Date.now();
    const lastActivity = user.lastActivityAt ? new Date(user.lastActivityAt).getTime() : now;
    if (now - lastActivity > env.session.inactivityTimeout * 1000) {
      return next(Errors.SESSION_EXPIRED());
    }

    // Mise à jour lastActivityAt (sans await pour ne pas bloquer)
    prisma.user.update({
      where: { id: user.id },
      data: { lastActivityAt: new Date() },
    }).catch(() => { });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
