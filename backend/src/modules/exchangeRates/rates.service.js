import { prisma } from '../../config/database.js';
import { Errors } from '../../utils/errors.js';
import { logAudit } from '../../middlewares/auditLog.js';
import { refreshAllRates } from '../../jobs/refreshRates.js';
import { getIO } from '../../socket.js';

const RATE_SELECT = {
  id: true, sourceZoneId: true, destZoneId: true,
  rate: true, source: true, isActive: true, setById: true,
  createdAt: true, updatedAt: true,
  sourceZone: { select: { id: true, name: true, currency: true } },
  destZone:   { select: { id: true, name: true, currency: true } },
};

export async function listRates() {
  // Return latest active rate per corridor (MANUAL takes priority display)
  const rates = await prisma.exchangeRate.findMany({
    where: { isActive: true },
    select: RATE_SELECT,
    orderBy: [{ source: 'asc' }, { createdAt: 'desc' }],
  });
  return rates;
}

export async function getCorridorRate(sourceZoneId, destZoneId) {
  const [srcZone, dstZone] = await Promise.all([
    prisma.zone.findUnique({ where: { id: sourceZoneId }, select: { id: true, name: true, currency: true } }),
    prisma.zone.findUnique({ where: { id: destZoneId },   select: { id: true, name: true, currency: true } }),
  ]);
  if (!srcZone) throw Errors.ZONE_NOT_FOUND();
  if (!dstZone) throw Errors.ZONE_NOT_FOUND();

  // Get both MANUAL and API rates for this corridor
  const rates = await prisma.exchangeRate.findMany({
    where: { sourceZoneId, destZoneId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  const manualRate = rates.find((r) => r.source === 'MANUAL');
  const apiRate    = rates.find((r) => r.source === 'API');

  const applied = manualRate ?? apiRate;
  if (!applied) throw Errors.NO_RATE_FOR_CORRIDOR();

  return {
    sourceZone: srcZone,
    destZone:   dstZone,
    appliedRate:    applied.rate.toString(),
    appliedSource:  applied.source,
    marketRate:     apiRate?.rate.toString() ?? null,
    marketSource:   apiRate ? 'API' : null,
    marketUpdatedAt: apiRate?.updatedAt ?? null,
    hasManualOverride: !!manualRate,
  };
}

export async function setManualRate(data, requestingUser) {
  const { sourceZoneId, destZoneId, rate } = data;

  const [srcZone, dstZone] = await Promise.all([
    prisma.zone.findUnique({ where: { id: sourceZoneId } }),
    prisma.zone.findUnique({ where: { id: destZoneId } }),
  ]);
  if (!srcZone) throw Errors.ZONE_NOT_FOUND();
  if (!dstZone) throw Errors.ZONE_NOT_FOUND();
  if (sourceZoneId === destZoneId) throw Errors.SAME_ZONE();

  // Deactivate old manual rate for this corridor
  await prisma.exchangeRate.updateMany({
    where: { sourceZoneId, destZoneId, source: 'MANUAL', isActive: true },
    data: { isActive: false },
  });

  const newRate = await prisma.exchangeRate.create({
    data: {
      sourceZoneId,
      destZoneId,
      rate,
      source: 'MANUAL',
      isActive: true,
      setById: requestingUser.id,
    },
    select: RATE_SELECT,
  });

  // Emit real-time update to zone rooms
  try {
    const io = getIO();
    io.to(`zone:${sourceZoneId}`).to(`zone:${destZoneId}`).emit('rate:updated', {
      sourceZone: srcZone,
      destZone:   dstZone,
      rate:       rate.toString(),
      source:     'MANUAL',
    });
  } catch { /* socket may not be ready */ }

  logAudit(requestingUser.id, 'RATE_UPDATED', 'ExchangeRate', newRate.id, { sourceZoneId, destZoneId, rate }, null);
  return newRate;
}

export async function deleteManualRate(sourceZoneId, destZoneId, requestingUser) {
  const count = await prisma.exchangeRate.updateMany({
    where: { sourceZoneId, destZoneId, source: 'MANUAL', isActive: true },
    data: { isActive: false },
  });

  if (count.count === 0) throw Errors.RATE_NOT_FOUND();

  logAudit(requestingUser.id, 'RATE_MANUAL_DELETED', 'ExchangeRate', `${sourceZoneId}-${destZoneId}`, null, null);
}

export async function getRateHistory(sourceZoneId, destZoneId) {
  return prisma.exchangeRate.findMany({
    where: { sourceZoneId, destZoneId },
    select: {
      id: true, rate: true, source: true, isActive: true, setById: true,
      createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function forceRefresh(requestingUser) {
  const result = await refreshAllRates();
  logAudit(requestingUser.id, 'RATES_FORCE_REFRESHED', 'ExchangeRate', 'all', result, null);
  return result;
}
