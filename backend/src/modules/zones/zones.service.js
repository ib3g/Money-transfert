import { prisma } from '../../config/database.js';
import { Errors } from '../../utils/errors.js';
import { logAudit } from '../../middlewares/auditLog.js';
import { refreshRatesForZone } from '../../jobs/refreshRates.js';
import { getIO } from '../../socket.js';

const ZONE_SELECT = {
  id: true, name: true, currency: true, isActive: true,
  createdAt: true, updatedAt: true,
  _count: {
    select: {
      users: true,
      sourceTransactions: true,
      destTransactions: true,
      sourceRates: { where: { isActive: true } },
    },
  },
};

import { hasPermission } from '../../middlewares/permissions.js';

export async function listZones(requestingUser) {
  // Users with MANAGE_ZONES permission or OWNER role can see all zones (including inactive to reactivate them)
  // Others only see active zones
  const canManageZones = hasPermission(requestingUser, 'MANAGE_ZONES');

  return prisma.zone.findMany({
    where: canManageZones ? {} : { isActive: true },
    select: ZONE_SELECT,
    orderBy: { name: 'asc' },
  });
}

export async function getZoneById(id) {
  const zone = await prisma.zone.findUnique({ where: { id }, select: ZONE_SELECT });
  if (!zone) throw Errors.ZONE_NOT_FOUND();
  return zone;
}

export async function createZone(data, requestingUser) {
  const { name, currency } = data;

  const existing = await prisma.zone.findFirst({ where: { name, isActive: true } });
  if (existing) throw Errors.ZONE_NAME_EXISTS();

  const zone = await prisma.zone.create({
    data: { name, currency: currency.toUpperCase() },
    select: ZONE_SELECT,
  });

  logAudit(requestingUser.id, 'ZONE_CREATED', 'Zone', zone.id, { name, currency }, null);

  // Auto-initialize exchange rates with all other active zones
  let ratesInit = { updated: 0, errors: 0, total: 0 };
  try {
    ratesInit = await refreshRatesForZone({ id: zone.id, currency: zone.currency });
    if (ratesInit.updated > 0) {
      try { getIO().emit('rate:updated', { reason: 'zone_created', zoneId: zone.id }); } catch { /* not ready */ }
    }
  } catch (err) {
    console.error('[ZONE_INIT]', err.message);
    ratesInit = { updated: 0, errors: -1, total: 0 };
  }

  return { ...zone, _init: ratesInit };
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
      ...(data.name && { name: data.name }),
      ...(data.currency && { currency: data.currency.toUpperCase() }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    select: ZONE_SELECT,
  });

  if (data.isActive === true && zone.isActive === false) {
    // Zone is being reactivated, we need to refresh rates
    try {
      await refreshRatesForZone({ id: updated.id, currency: updated.currency });
      try { getIO().emit('rate:updated', { reason: 'zone_reactivated', zoneId: id }); } catch { /* not ready */ }
    } catch (err) {
      console.error('[ZONE_REACTIVATION]', err.message);
    }
  }

  logAudit(requestingUser.id, 'ZONE_UPDATED', 'Zone', id, data, null);
  return updated;
}

export async function deleteZone(id, requestingUser) {
  const zone = await prisma.zone.findUnique({
    where: { id },
    include: {
      _count: { select: { sourceTransactions: true, destTransactions: true } },
    },
  });
  if (!zone) throw Errors.ZONE_NOT_FOUND();

  const totalTransactions = zone._count.sourceTransactions + zone._count.destTransactions;

  if (totalTransactions === 0) {
    // No history at all = HARD DELETE
    await prisma.exchangeRate.deleteMany({
      where: { OR: [{ sourceZoneId: id }, { destZoneId: id }] },
    });
    await prisma.userZone.deleteMany({
      where: { zoneId: id },
    });
    await prisma.zone.delete({
      where: { id },
    });
    logAudit(requestingUser.id, 'ZONE_DELETED', 'Zone', id, null, null);
    return { id, deleted: true };
  }

  // Has history = SOFT DELETE (Deactivation)
  const pendingTxs = await prisma.transaction.count({
    where: {
      OR: [{ sourceZoneId: id }, { destZoneId: id }],
      status: 'PENDING',
    },
  });

  if (pendingTxs > 0) {
    throw new Error('Impossible de désactiver une zone avec des transactions en cours');
  }

  const updated = await prisma.zone.update({
    where: { id },
    data: { isActive: false },
    select: ZONE_SELECT,
  });

  // Deactivate all exchange rates associated with this zone
  await prisma.exchangeRate.updateMany({
    where: { OR: [{ sourceZoneId: id }, { destZoneId: id }], isActive: true },
    data: { isActive: false },
  });

  logAudit(requestingUser.id, 'ZONE_DEACTIVATED', 'Zone', id, null, null);
  return updated;
}
