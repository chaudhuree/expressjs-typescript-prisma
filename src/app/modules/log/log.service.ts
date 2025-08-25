import prisma from '../../utils/prisma';

export type LogQuery = {
  page?: number;
  limit?: number;
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'ALL';
};

export async function getLogs({ page = 1, limit = 20, level = 'ALL' }: LogQuery) {
  const skip = (page - 1) * limit;
  const where = level === 'ALL' ? {} : { level } as any;

  const [items, total] = await Promise.all([
    (prisma as any).log.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    (prisma as any).log.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function clearLogs() {
  // Delete all documents in Log collection
  const result = await (prisma as any).log.deleteMany({});
  return { count: result?.count ?? 0 };
}
