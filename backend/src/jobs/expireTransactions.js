import { prisma } from '../config/database.js';
import { emitToUser } from '../socket.js';

export async function expireTransactions() {
  const now = new Date();

  const expired = await prisma.transaction.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: now },
    },
    select: { id: true, code: true, senderAgentId: true },
  });

  if (expired.length === 0) return 0;

  await prisma.transaction.updateMany({
    where: {
      id: { in: expired.map((t) => t.id) },
    },
    data: { status: 'EXPIRED' },
  });

  // Notify sender agents
  for (const tx of expired) {
    try {
      const notif = await prisma.notification.create({
        data: {
          userId: tx.senderAgentId,
          type: 'TRANSACTION_EXPIRED',
          title: 'Transfert expiré',
          message: `Le transfert ${tx.code} a expiré (48h écoulées)`,
          data: { transactionId: tx.id, code: tx.code },
        },
      });
      emitToUser(tx.senderAgentId, 'notification', notif);
      emitToUser(tx.senderAgentId, 'transaction:updated', { id: tx.id, status: 'EXPIRED' });
    } catch {
      // Non-blocking
    }
  }

  return expired.length;
}
