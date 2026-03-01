import { prisma } from '../../config/database.js';
import { Errors } from '../../utils/errors.js';
import { logAudit } from '../../middlewares/auditLog.js';
import { generateUniqueCode } from './codeGenerator.js';
import { emitToUser } from '../../socket.js';
import { hasPermission } from '../../middlewares/permissions.js';

const TRANSACTION_SELECT = {
  id: true, code: true,
  sourceAmount: true, sourceCurrency: true,
  destAmount: true, destCurrency: true,
  appliedRate: true, rateSource: true,
  sourceZoneId: true, destZoneId: true,
  senderAgentId: true, receiverAgentId: true,
  recipientName: true, status: true,
  expiresAt: true, confirmedAt: true,
  cancelledAt: true, cancelReason: true,
  createdAt: true, updatedAt: true,
  sourceZone:    { select: { id: true, name: true, currency: true } },
  destZone:      { select: { id: true, name: true, currency: true } },
  senderAgent:   { select: { id: true, firstName: true, lastName: true } },
  receiverAgent: { select: { id: true, firstName: true, lastName: true } },
};

/**
 * Determine the visible transactions filter based on user role/permissions
 */
function buildVisibilityFilter(user) {
  if (user.role === 'OWNER') return {};
  if (hasPermission(user, 'VIEW_ALL_TRANSACTIONS')) return {};

  if (user.role === 'MANAGER') {
    // Manager without VIEW_ALL: see transactions in their zones
    const zoneIds = user.zones?.map((uz) => uz.zoneId) ?? [];
    return {
      OR: [
        { sourceZoneId: { in: zoneIds } },
        { destZoneId:   { in: zoneIds } },
      ],
    };
  }

  // Agent: only their own transactions
  return {
    OR: [
      { senderAgentId:   user.id },
      { receiverAgentId: user.id },
    ],
  };
}

export async function listTransactions(filters = {}, requestingUser) {
  const { status, sourceZoneId, destZoneId, agentId, from, to, page = 1, limit = 20 } = filters;

  const pageNum  = Math.max(1, parseInt(page, 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const where = {
    ...buildVisibilityFilter(requestingUser),
    ...(status       && { status }),
    ...(sourceZoneId && { sourceZoneId }),
    ...(destZoneId   && { destZoneId }),
    ...(agentId      && { OR: [{ senderAgentId: agentId }, { receiverAgentId: agentId }] }),
    ...(from         && { createdAt: { gte: new Date(from) } }),
    ...(to           && { createdAt: { ...(from ? { gte: new Date(from) } : {}), lte: new Date(to) } }),
  };

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      select: TRANSACTION_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page: pageNum,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getTransactionById(id, requestingUser) {
  const tx = await prisma.transaction.findUnique({ where: { id }, select: TRANSACTION_SELECT });
  if (!tx) throw Errors.TRANSACTION_NOT_FOUND();

  // Visibility check
  const visFilter = buildVisibilityFilter(requestingUser);
  if (Object.keys(visFilter).length > 0) {
    // Check if this transaction is visible to the user
    const count = await prisma.transaction.count({ where: { id, ...visFilter } });
    if (count === 0) throw Errors.FORBIDDEN();
  }

  return tx;
}

export async function getTransactionByCode(code, requestingUser) {
  const tx = await prisma.transaction.findUnique({
    where: { code: code.toUpperCase() },
    select: TRANSACTION_SELECT,
  });
  if (!tx) throw Errors.INVALID_CODE();

  // Check status
  if (tx.status === 'COMPLETED') throw Errors.ALREADY_CONFIRMED();
  if (tx.status === 'CANCELLED' || tx.status === 'EXPIRED') throw Errors.TRANSACTION_NOT_PENDING();

  return tx;
}

export async function createTransaction(data, requestingUser) {
  const { sourceAmount, sourceZoneId, destZoneId, recipientName } = data;

  if (sourceZoneId === destZoneId) throw Errors.SAME_ZONE();

  // Verify user is assigned to source zone
  const userZone = await prisma.userZone.findUnique({
    where: { userId_zoneId: { userId: requestingUser.id, zoneId: sourceZoneId } },
  });
  if (!userZone) throw Errors.FORBIDDEN();

  // Get zones
  const [sourceZone, destZone] = await Promise.all([
    prisma.zone.findUnique({ where: { id: sourceZoneId, isActive: true } }),
    prisma.zone.findUnique({ where: { id: destZoneId,   isActive: true } }),
  ]);
  if (!sourceZone) throw Errors.ZONE_NOT_FOUND();
  if (!destZone)   throw Errors.ZONE_NOT_FOUND();

  // Resolve exchange rate (MANUAL > API)
  const rates = await prisma.exchangeRate.findMany({
    where: { sourceZoneId, destZoneId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  const manualRate = rates.find((r) => r.source === 'MANUAL');
  const apiRate    = rates.find((r) => r.source === 'API');
  const appliedRate = manualRate ?? apiRate;
  if (!appliedRate) throw Errors.NO_RATE_FOR_CORRIDOR();

  // Calculate dest amount (in centimes)
  const rateValue = parseFloat(appliedRate.rate.toString());
  const destAmount = Math.round(sourceAmount * rateValue);

  // Generate unique code
  const code = await generateUniqueCode(prisma);

  // Create transaction
  const tx = await prisma.transaction.create({
    data: {
      code,
      sourceAmount,
      sourceCurrency: sourceZone.currency,
      destAmount,
      destCurrency:   destZone.currency,
      appliedRate:    appliedRate.rate,
      rateSource:     appliedRate.source,
      sourceZoneId,
      destZoneId,
      senderAgentId:  requestingUser.id,
      recipientName:  recipientName.trim(),
      status:         'PENDING',
      expiresAt:      new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
    },
    select: TRANSACTION_SELECT,
  });

  logAudit(requestingUser.id, 'TRANSACTION_CREATED', 'Transaction', tx.id, {
    code, sourceAmount, destAmount, sourceZoneId, destZoneId,
  }, null);

  return tx;
}

export async function confirmTransaction(id, requestingUser) {
  // Use a transaction to prevent double-confirm
  const tx = await prisma.$transaction(async (t) => {
    // Lock the row
    const existing = await t.transaction.findUnique({
      where: { id },
      select: { id: true, status: true, destZoneId: true, senderAgentId: true, code: true, recipientName: true, destAmount: true, destCurrency: true },
    });
    if (!existing) throw Errors.TRANSACTION_NOT_FOUND();
    if (existing.status === 'COMPLETED') throw Errors.ALREADY_CONFIRMED();
    if (existing.status !== 'PENDING')   throw Errors.TRANSACTION_NOT_PENDING();

    // Check agent is assigned to dest zone
    const userZone = await t.userZone.findUnique({
      where: { userId_zoneId: { userId: requestingUser.id, zoneId: existing.destZoneId } },
    });
    if (!userZone && requestingUser.role === 'AGENT') throw Errors.FORBIDDEN();

    const confirmed = await t.transaction.update({
      where: { id },
      data: {
        status:          'COMPLETED',
        receiverAgentId: requestingUser.id,
        confirmedAt:     new Date(),
      },
      select: TRANSACTION_SELECT,
    });

    // Create notification for sender
    const notif = await t.notification.create({
      data: {
        userId:  existing.senderAgentId,
        type:    'TRANSACTION_CONFIRMED',
        title:   'Transfert confirmé',
        message: `${existing.code} — ${existing.destAmount / 100} ${existing.destCurrency} remis à ${existing.recipientName}`,
        data:    { transactionId: id, code: existing.code },
      },
    });

    return { confirmed, notif, senderAgentId: existing.senderAgentId };
  });

  // Emit real-time notifications (outside the DB transaction)
  try {
    emitToUser(tx.senderAgentId, 'notification', tx.notif);
    emitToUser(tx.senderAgentId, 'transaction:updated', {
      id, status: 'COMPLETED', confirmedAt: tx.confirmed.confirmedAt,
    });
  } catch { /* non-blocking */ }

  logAudit(requestingUser.id, 'TRANSACTION_CONFIRMED', 'Transaction', id, null, null);
  return tx.confirmed;
}

export async function cancelTransaction(id, { cancelReason }, requestingUser) {
  const existing = await prisma.transaction.findUnique({
    where: { id },
    select: { id: true, status: true, senderAgentId: true, receiverAgentId: true, code: true },
  });
  if (!existing) throw Errors.TRANSACTION_NOT_FOUND();
  if (existing.status !== 'PENDING') throw Errors.TRANSACTION_NOT_PENDING();

  // Check who can cancel: sender, CANCEL_TRANSACTIONS permission, or OWNER
  const isSender = existing.senderAgentId === requestingUser.id;
  const canCancel = isSender || hasPermission(requestingUser, 'CANCEL_TRANSACTIONS');
  if (!canCancel) throw Errors.CANNOT_CANCEL();

  const cancelled = await prisma.transaction.update({
    where: { id },
    data: {
      status:      'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: cancelReason?.trim(),
    },
    select: TRANSACTION_SELECT,
  });

  // Notify both agents
  const notifyUserIds = [...new Set([existing.senderAgentId, existing.receiverAgentId].filter(Boolean))];

  for (const userId of notifyUserIds) {
    const notif = await prisma.notification.create({
      data: {
        userId,
        type:    'TRANSACTION_CANCELLED',
        title:   'Transfert annulé',
        message: `${existing.code} a été annulé${cancelReason ? ` : ${cancelReason}` : ''}`,
        data:    { transactionId: id, code: existing.code },
      },
    });
    try {
      emitToUser(userId, 'notification', notif);
      emitToUser(userId, 'transaction:updated', { id, status: 'CANCELLED' });
    } catch { /* non-blocking */ }
  }

  logAudit(requestingUser.id, 'TRANSACTION_CANCELLED', 'Transaction', id, { cancelReason }, null);
  return cancelled;
}
