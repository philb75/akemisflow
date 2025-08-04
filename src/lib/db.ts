import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger-adaptive';
import environmentDetector from '@/lib/environment';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Enhanced logging for debugging
const prismaClientOptions = {
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
    { emit: 'stdout', level: 'info' },
  ] as const,
  errorFormat: 'pretty' as const,
};

// Only initialize Prisma if the environment supports it
export const prisma = environmentDetector.canUsePrisma() 
  ? (globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions))
  : null;

// Enhanced error logging for Prisma using our logging system (only if Prisma is available)
if (prisma) {
  prisma.$on('error', (e) => {
    logger.error('Prisma database error', {
      category: 'DATABASE',
      metadata: {
        target: e.target,
        message: e.message
      }
    });
  });

  prisma.$on('warn', (e) => {
    logger.warn('Prisma database warning', {
      category: 'DATABASE',
      metadata: {
        target: e.target,
        message: e.message
      }
    });
  });

  prisma.$on('query', (e) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Prisma query executed', {
        category: 'DATABASE',
        metadata: {
          query: e.query,
          params: e.params,
          duration: e.duration + 'ms'
        }
      });
    }
  });
}

// Test database connection on startup (only if Prisma is available)
if (typeof window === 'undefined' && prisma) {
  prisma.$connect()
    .then(() => {
      logger.database('Prisma database connected successfully', {
        mode: environmentDetector.getMode()
      });
      console.log('✅ PRISMA DATABASE CONNECTED successfully');
    })
    .catch((error) => {
      logger.error('Prisma database connection failed', {
        category: 'DATABASE',
        error,
        metadata: {
          databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing',
          mode: environmentDetector.getMode()
        }
      });
      console.error('🚨 PRISMA DATABASE CONNECTION FAILED:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    });
} else if (typeof window === 'undefined' && !prisma) {
  logger.database('Prisma not available in current environment', {
    mode: environmentDetector.getMode(),
    canUsePrisma: environmentDetector.canUsePrisma()
  });
  console.log('ℹ️ Prisma not initialized - using alternative database provider');
}

if (process.env.NODE_ENV !== 'production' && prisma) globalForPrisma.prisma = prisma;