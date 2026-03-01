import { prisma } from '../../config/database.js';
import { hasPermission } from '../../middlewares/permissions.js';

function getPeriodFilter(period, from, to) {
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { gte: start };
  }
  if (period === '7d') {
    return { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  }
  if (period === '30d') {
    return { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
  }
  if (period === 'custom' && from) {
    return {
      gte: new Date(from),
      ...(to && { lte: new Date(to) }),
    };
  }
  return { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }; // default: today
}

function buildVisibilityFilter(user) {
  if (user.role === 'OWNER') return {};
  if (hasPermission(user, 'VIEW_ALL_TRANSACTIONS')) return {};
  const zoneIds = user.zones?.map((uz) => uz.zoneId) ?? [];
  return {
    OR: [
      { sourceZoneId: { in: zoneIds } },
      { destZoneId:   { in: zoneIds } },
    ],
  };
}

export async function getSummary(query, user) {
  const dateFilter = getPeriodFilter(query.period, query.from, query.to);
  const visFilter  = buildVisibilityFilter(user);

  const where = { ...visFilter, createdAt: dateFilter };

  const [total, pending, completed, cancelled, expired] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.count({ where: { ...where, status: 'PENDING' } }),
    prisma.transaction.count({ where: { ...where, status: 'COMPLETED' } }),
    prisma.transaction.count({ where: { ...where, status: 'CANCELLED' } }),
    prisma.transaction.count({ where: { ...where, status: 'EXPIRED' } }),
  ]);

  const amountAgg = await prisma.transaction.aggregate({
    where: { ...where, status: 'COMPLETED' },
    _sum: { sourceAmount: true, destAmount: true },
  });

  return {
    total, pending, completed, cancelled, expired,
    totalSourceAmount: amountAgg._sum.sourceAmount ?? 0,
    totalDestAmount:   amountAgg._sum.destAmount ?? 0,
  };
}

export async function getByCorridor(query, user) {
  const dateFilter = getPeriodFilter(query.period, query.from, query.to);
  const visFilter  = buildVisibilityFilter(user);

  const where = { ...visFilter, createdAt: dateFilter };

  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      sourceZoneId: true, destZoneId: true,
      sourceAmount: true, destAmount: true,
      sourceCurrency: true, destCurrency: true,
      appliedRate: true, status: true,
      sourceZone: { select: { name: true, currency: true } },
      destZone:   { select: { name: true, currency: true } },
    },
  });

  // Group by corridor
  const corridors = new Map();
  for (const tx of transactions) {
    const key = `${tx.sourceZoneId}-${tx.destZoneId}`;
    if (!corridors.has(key)) {
      corridors.set(key, {
        sourceZone: tx.sourceZone,
        destZone:   tx.destZone,
        count: 0,
        totalSourceAmount: 0,
        totalDestAmount: 0,
        rateSum: 0,
        completedCount: 0,
      });
    }
    const c = corridors.get(key);
    c.count++;
    if (tx.status === 'COMPLETED') {
      c.totalSourceAmount += tx.sourceAmount;
      c.totalDestAmount   += tx.destAmount;
      c.rateSum           += parseFloat(tx.appliedRate.toString());
      c.completedCount++;
    }
  }

  return Array.from(corridors.values()).map((c) => ({
    ...c,
    avgRate: c.completedCount > 0 ? (c.rateSum / c.completedCount).toFixed(4) : null,
  }));
}
