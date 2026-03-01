import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { Errors } from '../../utils/errors.js';
import { hasPermission, protectOwner } from '../../middlewares/permissions.js';
import { logAudit } from '../../middlewares/auditLog.js';

const BCRYPT_ROUNDS = 12;

// Select fields to return for user objects (never return password/totpSecret)
const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  permissions: true,
  totpEnabled: true,
  lastActivityAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  zones: {
    select: {
      id: true,
      zoneId: true,
      zone: { select: { id: true, name: true, currency: true } },
    },
  },
};

export async function listUsers(requestingUser) {
  // Owner and managers with MANAGE_USERS see all users
  // Agents see nobody (enforced at route level)
  const where = {};

  // Non-owner managers without FULL_ADMIN can only see users they created
  if (requestingUser.role === 'MANAGER' && !hasPermission(requestingUser, 'FULL_ADMIN')) {
    // They have MANAGE_USERS but not FULL_ADMIN → they can see users they created
    where.createdById = requestingUser.id;
  }

  return prisma.user.findMany({
    where,
    select: USER_SELECT,
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getUserById(id, requestingUser) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: USER_SELECT,
  });
  if (!user) throw Errors.USER_NOT_FOUND();

  // Non-owner managers can only view users they manage
  if (
    requestingUser.role === 'MANAGER' &&
    !hasPermission(requestingUser, 'FULL_ADMIN') &&
    user.createdById !== requestingUser.id &&
    user.id !== requestingUser.id
  ) {
    throw Errors.FORBIDDEN();
  }

  return user;
}

export async function createUser(data, requestingUser) {
  const { email, password, firstName, lastName, role, zoneIds = [] } = data;

  // Only OWNER can create other owners (not allowed in V1 — single owner)
  if (role === 'OWNER') throw Errors.FORBIDDEN();

  // Only OWNER can create MANAGER
  if (role === 'MANAGER' && requestingUser.role !== 'OWNER') {
    if (!hasPermission(requestingUser, 'FULL_ADMIN')) {
      throw Errors.PERMISSION_DENIED('FULL_ADMIN');
    }
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) throw Errors.EMAIL_ALREADY_EXISTS();

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        firstName,
        lastName,
        role,
        createdById: requestingUser.id,
      },
      select: USER_SELECT,
    });

    if (zoneIds.length > 0) {
      // Validate zones exist
      const zones = await tx.zone.findMany({
        where: { id: { in: zoneIds }, isActive: true },
        select: { id: true },
      });
      if (zones.length !== zoneIds.length) throw Errors.ZONE_NOT_FOUND();

      await tx.userZone.createMany({
        data: zoneIds.map((zoneId) => ({ userId: created.id, zoneId })),
      });
    }

    return created;
  });

  // Send welcome notification
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'USER_CREATED',
      title: 'Bienvenue sur TransferApp !',
      message: 'Votre compte a été créé. Configurez votre authentification A2F lors de votre première connexion.',
    },
  }).catch(() => {});

  logAudit(
    requestingUser.id,
    'USER_CREATED',
    'User',
    user.id,
    { role, email: user.email },
    null
  );

  // Return fresh user with zones
  return prisma.user.findUnique({ where: { id: user.id }, select: USER_SELECT });
}

export async function updateUser(id, data, requestingUser) {
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, email: true } });
  if (!target) throw Errors.USER_NOT_FOUND();

  // Protect owner
  protectOwner(target, requestingUser);

  // Can't change role to OWNER
  if (data.role === 'OWNER') throw Errors.FORBIDDEN();

  // Only OWNER can change a Manager's role
  if (target.role === 'MANAGER' && data.role && data.role !== 'MANAGER') {
    if (requestingUser.role !== 'OWNER') throw Errors.FORBIDDEN();
  }

  // Email uniqueness check
  if (data.email) {
    const emailNorm = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing && existing.id !== id) throw Errors.EMAIL_ALREADY_EXISTS();
    data.email = emailNorm;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName  && { lastName:  data.lastName }),
      ...(data.email     && { email:     data.email }),
      ...(data.role      && { role:      data.role }),
      ...(data.isActive  !== undefined && { isActive: data.isActive }),
    },
    select: USER_SELECT,
  });

  logAudit(requestingUser.id, 'USER_UPDATED', 'User', id, data, null);

  return updated;
}

export async function deactivateUser(id, requestingUser) {
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) throw Errors.USER_NOT_FOUND();

  // Protect owner
  protectOwner(target, requestingUser);

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: false, currentSessionId: null },
    select: USER_SELECT,
  });

  // Revoke all refresh tokens
  await prisma.refreshToken.deleteMany({ where: { userId: id } });

  logAudit(requestingUser.id, 'USER_DEACTIVATED', 'User', id, null, null);

  return updated;
}

export async function updatePermissions(id, permissions, requestingUser) {
  // Only OWNER can manage permissions
  if (requestingUser.role !== 'OWNER') throw Errors.FORBIDDEN();

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) throw Errors.USER_NOT_FOUND();
  if (target.role !== 'MANAGER') {
    throw Errors.FORBIDDEN(); // permissions only apply to MANAGERs
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { permissions },
    select: USER_SELECT,
  });

  logAudit(requestingUser.id, 'USER_PERMISSION_CHANGED', 'User', id, { permissions }, null);

  return updated;
}

export async function changePassword(id, { currentPassword, newPassword }, requestingUser) {
  // Only self or OWNER can change password
  if (id !== requestingUser.id && requestingUser.role !== 'OWNER') {
    throw Errors.FORBIDDEN();
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, password: true, role: true } });
  if (!user) throw Errors.USER_NOT_FOUND();

  // If changing own password, verify current password
  if (id === requestingUser.id) {
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw Errors.INVALID_CREDENTIALS();
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id }, data: { password: hashedPassword } });

  logAudit(requestingUser.id, 'USER_PASSWORD_CHANGED', 'User', id, null, null);
}

export async function assignZones(userId, zoneIds, requestingUser) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) throw Errors.USER_NOT_FOUND();
  protectOwner(user, requestingUser);

  // Validate zones
  const zones = await prisma.zone.findMany({
    where: { id: { in: zoneIds }, isActive: true },
    select: { id: true },
  });
  if (zones.length !== zoneIds.length) throw Errors.ZONE_NOT_FOUND();

  // Upsert to avoid duplicates
  await prisma.userZone.createMany({
    data: zoneIds.map((zoneId) => ({ userId, zoneId })),
    skipDuplicates: true,
  });

  logAudit(requestingUser.id, 'USER_ZONES_ASSIGNED', 'User', userId, { zoneIds }, null);
}

export async function removeZone(userId, zoneId, requestingUser) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) throw Errors.USER_NOT_FOUND();
  protectOwner(user, requestingUser);

  await prisma.userZone.deleteMany({ where: { userId, zoneId } });

  logAudit(requestingUser.id, 'USER_ZONE_REMOVED', 'User', userId, { zoneId }, null);
}
