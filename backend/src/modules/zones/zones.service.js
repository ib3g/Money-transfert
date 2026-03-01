import { prisma } from '../../config/database.js';
import { Errors } from '../../utils/errors.js';
import { logAudit } from '../../middlewares/auditLog.js';

const ZONE_SELECT = {
  id: true, name: true, currency: true, isActive: true,
  createdAt: true, updatedAt: true,
  _count: { select: { users: true, sourceTransactions: true, destTransactions: true } },
};

export async function listZones(requestingUser) {
  // Owner + managers with broad permissions see all zones
  // Agents and limited managers see only their zones
  const isAdmin = requestingUser.role === 'OWNER' ||
    requestingUser.permissions?.includes('FULL_ADMIN') ||
    requestingUser.permissions?.includes('MANAGE_ZONES') ||
    requestingUser.permissions?.includes('VIEW_ALL_TRANSACTIONS');

  if (isAdmin) {
    return prisma.zone.findMany({
      where: { isActive: true },
      select: ZONE_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  // Agents/limited managers: only their assigned zones
  const userZones = await prisma.userZone.findMany({
    where: { userId: requestingUser.id },
    select: { zone: { select: ZONE_SELECT } },
  });
  return userZones.map((uz) => uz.zone).filter((z) => z.isActive);
}

export async function getZoneById(id) {
  const zone = await prisma.zone.findUnique({ where: { id }, select: ZONE_SELECT });
  if (!zone) throw Errors.ZONE_NOT_FOUND();
  return zone;
}

export async function createZone(data, requestingUser) {
  const { name, currency } = data;

  const existing = await prisma.zone.findUnique({ where: { name } });
  if (existing) throw Errors.ZONE_NAME_EXISTS();

  const zone = await prisma.zone.create({
    data: { name, currency: currency.toUpperCase() },
    select: ZONE_SELECT,
  });

  logAudit(requestingUser.id, 'ZONE_CREATED', 'Zone', zone.id, { name, currency }, null);
  return zone;
}

export async function updateZone(id, data, requestingUser) {
  const zone = await prisma.zone.findUnique({ where: { id } });
  if (!zone) throw Errors.ZONE_NOT_FOUND();

  if (data.name && data.name !== zone.name) {
    const existing = await prisma.zone.findUnique({ where: { name: data.name } });
    if (existing) throw Errors.ZONE_NAME_EXISTS();
  }

  const updated = await prisma.zone.update({
    where: { id },
    data: {
      ...(data.name     && { name:     data.name }),
      ...(data.currency && { currency: data.currency.toUpperCase() }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    select: ZONE_SELECT,
  });

  logAudit(requestingUser.id, 'ZONE_UPDATED', 'Zone', id, data, null);
  return updated;
}

export async function deleteZone(id, requestingUser) {
  const zone = await prisma.zone.findUnique({
    where: { id },
    include: {
      _count: { select: { sourceTransactions: { where: { status: 'PENDING' } } } },
    },
  });
  if (!zone) throw Errors.ZONE_NOT_FOUND();

  if (zone._count.sourceTransactions > 0) {
    throw new Error('Impossible de désactiver une zone avec des transactions en cours');
  }

  const updated = await prisma.zone.update({
    where: { id },
    data: { isActive: false },
    select: ZONE_SELECT,
  });

  logAudit(requestingUser.id, 'ZONE_DEACTIVATED', 'Zone', id, null, null);
  return updated;
}
