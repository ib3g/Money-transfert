import { prisma } from '../../config/database.js';

export async function listAuditLogs(filters = {}) {
  const { userId, action, entity, from, to, page = 1, limit = 20 } = filters;
  const pageNum  = Math.max(1, parseInt(page, 10));
  const pageSize = Math.min(100, parseInt(limit, 10));

  const where = {
    ...(userId && { userId }),
    ...(action && { action: { contains: action, mode: 'insensitive' } }),
    ...(entity && { entity }),
    ...(from   && { createdAt: { gte: new Date(from) } }),
    ...(to     && { createdAt: { ...(from ? { gte: new Date(from) } : {}), lte: new Date(to) } }),
  };

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data,
    pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
