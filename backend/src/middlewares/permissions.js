import { Errors } from '../utils/errors.js';

export const hasPermission = (user, requiredPermission) => {
  if (!user) return false;
  if (user.role === 'OWNER') return true;
  if (user.permissions.includes('FULL_ADMIN')) return true;
  return user.permissions.includes(requiredPermission);
};

export const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) return next(Errors.UNAUTHORIZED());
  if (!hasPermission(req.user, permission)) {
    return next(Errors.PERMISSION_DENIED(permission));
  }
  next();
};

export const requireOwner = (req, res, next) => {
  if (!req.user) return next(Errors.UNAUTHORIZED());
  if (req.user.role !== 'OWNER') return next(Errors.FORBIDDEN());
  next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(Errors.UNAUTHORIZED());
  if (!roles.includes(req.user.role)) return next(Errors.FORBIDDEN());
  next();
};

// Guard: interdit de modifier un OWNER (sauf lui-même pour son profil)
export const protectOwner = (targetUser, requestingUser) => {
  if (targetUser.role === 'OWNER' && targetUser.id !== requestingUser.id) {
    throw Errors.FORBIDDEN_OWNER();
  }
};
