import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
});

// Set SQLite pragmas for high concurrency on Windows
prisma.$queryRawUnsafe('PRAGMA busy_timeout = 10000;').catch(() => {});
prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;').catch(() => {});

