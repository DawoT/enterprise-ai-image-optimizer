import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton para la conexión con PostgreSQL.
 * Previene múltiples conexiones en desarrollo (hot reload).
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
};

export const prisma = globalThis.prisma ?? new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
