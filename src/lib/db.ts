import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Enable logging in production to debug connection issues
const prismaClientOptions = process.env.NODE_ENV === 'production' 
  ? {
      log: ['error', 'warn'] as const,
      errorFormat: 'pretty' as const,
    }
  : {
      log: ['query', 'error', 'warn'] as const,
      errorFormat: 'pretty' as const,
    };

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;