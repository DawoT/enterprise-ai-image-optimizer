/**
 * Image Processing Worker
 *
 * Este script inicia el worker de BullMQ para procesar trabajos de la cola.
 * Debe ejecutarse separadamente del servidor Next.js para mejor rendimiento.
 *
 * Usage:
 *   npm run worker:process
 *
 * O directamente con ts-node:
 *   npx ts-node --project tsconfig.worker.json src/workers/image-processor.ts
 *
 * En producción, este worker puede ejecutarse:
 * 1. Como proceso separado en el mismo servidor
 * 2. Como servicio independiente (recomendado para escalabilidad)
 * 3. En un container Docker separado
 */

import { container } from '@/infrastructure/di/container';
import { QueueClient, createImageProcessorWorker } from '@/infrastructure/queue/queue-client';
import { prisma } from '@/infrastructure/db/prisma-client';

// Configuración del worker
const WORKER_NAME = 'image-processor-worker';
const SHUTDOWN_TIMEOUT = 30000; // 30 segundos

/**
 * Inicializa y ejecuta el worker.
 */
async function startWorker(): Promise<void> {
  console.log(`[${WORKER_NAME}] Iniciando worker...`);

  // Verificar conexión a base de datos
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[Worker] Conexión a base de datos verificada');
  } catch (error) {
    console.error('[Worker] Error conectando a la base de datos:', error);
    process.exit(1);
  }

  // Resolver dependencias
  let imageJobRepository;
  let imageProcessor;
  let aiAnalysisService;
  let storageService;
  let queueClient;

  try {
    imageJobRepository = container.resolve('ImageJobRepository');
    imageProcessor = container.resolve('ImageProcessor');
    aiAnalysisService = container.resolve('AIAnalysisService');
    storageService = container.resolve('StorageService');
    queueClient = container.resolve('QueueClient');

    console.log('[Worker] Dependencias resueltas');
  } catch (error) {
    console.error('[Worker] Error resolviendo dependencias:', error);
    process.exit(1);
  }

  // Crear el worker
  const worker = createImageProcessorWorker({
    imageJobRepository,
    imageProcessor,
    aiAnalysisService: aiAnalysisService ?? null,
    storageService,
  });

  console.log('[Worker] Worker creado y escuchando trabajos...');

  // Manejo de señales de terminación
  let isShuttingDown = false;

  async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) {
      console.log(`[${WORKER_NAME}] Apagado ya en progreso...`);
      return;
    }

    isShuttingDown = true;
    console.log(`[${WORKER_NAME}] Recibida señal ${signal}, iniciando apagado graceful...`);

    try {
      // Dejar de aceptar nuevos trabajos
      await worker.close();
      console.log('[Worker] Worker cerrado');

      // Cerrar conexión de cola
      await queueClient.close();
      console.log('[Worker] Cola cerrada');

      // Cerrar conexión de Prisma
      await prisma.$disconnect();
      console.log('[Worker] Conexión a base de datos cerrada');

      console.log(`[${WORKER_NAME}] Apagado completado`);
      process.exit(0);
    } catch (error) {
      console.error(`[${WORKER_NAME}] Error durante el apagado:`, error);
      process.exit(1);
    }
  }

  // Registrar handlers de señales
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Manejo de errores no capturados
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Worker] Promise rejection no manejada:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('[Worker] Excepción no capturada:', error);
    gracefulShutdown('uncaughtException');
  });

  console.log(`[${WORKER_NAME}] Worker listo y ejecutándose`);
}

// Iniciar el worker
startWorker().catch((error) => {
  console.error(`[${WORKER_NAME}] Error fatal:`, error);
  process.exit(1);
});
