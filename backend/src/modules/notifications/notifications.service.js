import { prisma } from '../../config/database.js';

export async function listNotifications(userId, page = 1) {
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getUnreadCount(userId) {
  const count = await prisma.notification.count({ where: { userId, isRead: false } });
  return { count };
}

export async function markRead(notificationId, userId) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllRead(userId) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}
