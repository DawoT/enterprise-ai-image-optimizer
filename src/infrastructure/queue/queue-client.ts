import { Queue, QueueScheduler, Worker } from 'bullmq';
import { ProcessImagePipelineUseCase } from '@/core/use-cases/process-image-pipeline.use-case';
import { ImageJobRepository } from '@/core/domain/interfaces/image-job.repository.interface';
import { ImageProcessorPort } from '@/core/domain/interfaces/image-processor.port.interface';
import { AIAnalysisService } from '@/core/domain/interfaces/ai-analysis-service.interface';
import { ImageStorageService } from '@/core/domain/interfaces/image-storage-service.interface';
import { ProcessingStatus } from '@/core/domain/value-objects/processing-status';
import { ImageJobId } from '@/core/domain/value-objects/image-job-id';
import { DomainError } from '@/core/domain/errors/domain-error';

/**
 * Nombre de la cola de procesamiento de imágenes.
 */
export const IMAGE_PROCESSING_QUEUE = 'image-processing-queue';

/**
 * Tipos de trabajos para la cola.
 */
export interface ImageProcessingJobData {
  jobId: string;
  runAIAnalysis: boolean;
  attemptNumber: number;
  maxAttempts: number;
}

/**
 * Configuración de la conexión Redis para BullMQ.
 */
function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    return { connection: { url: redisUrl } };
  }

  // Configuración por defecto para desarrollo local
  return {
    connection: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD,
    },
  };
}

/**
 * Opciones de configuración para la cola.
 */
const queueOptions = {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    ...getRedisConnection(),
  },
};

/**
 * Cliente de la cola de BullMQ.
 * Gestiona la creación de trabajos y la configuración del worker.
 */
export class QueueClient {
  private readonly queue: Queue<ImageProcessingJobData>;
  private readonly scheduler: QueueScheduler | null = null;
  private static instance: QueueClient | null = null;

  private constructor() {
    this.queue = new Queue<ImageProcessingJobData>(IMAGE_PROCESSING_QUEUE, queueOptions);

    // Crear scheduler solo si no está en modo de worker separado
    if (process.env.RUN_WORKER_SEPARATELY !== 'true') {
      this.scheduler = new QueueScheduler(IMAGE_PROCESSING_QUEUE, getRedisConnection());
    }
  }

  /**
   * Obtiene la instancia singleton del cliente de cola.
   */
  public static getInstance(): QueueClient {
    if (!QueueClient.instance) {
      QueueClient.instance = new QueueClient();
    }
    return QueueClient.instance;
  }

  /**
   * Añade un trabajo de procesamiento de imagen a la cola.
   */
  public async addJob(
    jobId: string,
    options: {
      runAIAnalysis?: boolean;
      priority?: number;
      delayMs?: number;
    } = {}
  ): Promise<string> {
    const job = await this.queue.add(
      'process-image',
      {
        jobId,
        runAIAnalysis: options.runAIAnalysis ?? true,
        attemptNumber: 1,
        maxAttempts: 3,
      },
      {
        priority: options.priority ?? 0,
        delay: options.delayMs ?? 0,
        jobId: `image-${jobId}`,
      }
    );

    return job.id!;
  }

  /**
   * Obtiene el número de trabajos pendientes.
   */
  public async getPendingCount(): Promise<number> {
    const counts = await this.queue.getJobCounts();
    return counts.waiting + counts.delayed;
  }

  /**
   * Obtiene el número de trabajos en progreso.
   */
  public async getProcessingCount(): Promise<number> {
    const counts = await this.queue.getJobCounts();
    return counts.active;
  }

  /**
   * Limpia la cola (para testing).
   */
  public async clean(): Promise<void> {
    await this.queue.clean(0, 0, 'wait');
  }

  /**
   * Cierra la conexión de la cola.
   */
  public async close(): Promise<void> {
    await this.queue.close();
    if (this.scheduler) {
      await this.scheduler.close();
    }
    QueueClient.instance = null;
  }

  /**
   * Obtiene la cola subyacente (para uso interno).
   */
  public getQueue(): Queue<ImageProcessingJobData> {
    return this.queue;
  }
}

/**
 * Crea y configura el worker para procesar trabajos de la cola.
 */
export function createImageProcessorWorker(dependencies: {
  imageJobRepository: ImageJobRepository;
  imageProcessor: ImageProcessorPort;
  aiAnalysisService: AIAnalysisService | null;
  storageService: ImageStorageService;
}): Worker<ImageProcessingJobData> {
  const worker = new Worker<ImageProcessingJobData>(
    IMAGE_PROCESSING_QUEUE,
    async (job) => {
      const { jobId, runAIAnalysis, attemptNumber } = job.data;

      console.log(`[Worker] Processing job ${jobId}, attempt ${attemptNumber}`);

      const imageJobId = ImageJobId.create(jobId);

      // Crear el caso de uso con las dependencias
      const processUseCase = new ProcessImagePipelineUseCase(
        dependencies.imageJobRepository,
        dependencies.imageProcessor,
        dependencies.aiAnalysisService,
        dependencies.storageService
      );

      // Buscar el trabajo para verificar estado
      const existingJob = await dependencies.imageJobRepository.findById(imageJobId);

      if (!existingJob) {
        throw new DomainError(`Job not found: ${jobId}`, {
          code: 'JOB_NOT_FOUND',
          isRecoverable: false,
        });
      }

      // Si ya está completado, omitir
      if (existingJob.isCompleted) {
        console.log(`[Worker] Job ${jobId} already completed, skipping`);
        return { status: 'skipped', reason: 'already_completed' };
      }

      // Si ya falló permanentemente, omitir
      if (existingJob.isFailed && attemptNumber >= 3) {
        console.log(`[Worker] Job ${jobId} failed after max attempts, not retrying`);
        return { status: 'skipped', reason: 'max_attempts_exceeded' };
      }

      // Ejecutar el procesamiento
      try {
        const result = await processUseCase.execute({
          jobId: imageJobId,
          runAIAnalysis,
        });

        console.log(`[Worker] Job ${jobId} completed successfully`);
        return {
          status: 'completed',
          versionsGenerated: result.processedVersions.size,
          processingTimeMs: result.processingTimeMs,
        };
      } catch (error) {
        console.error(`[Worker] Job ${jobId} failed:`, error);

        if (error instanceof DomainError && !error.isRecoverable) {
          // Error no recuperable, marcar como fallido permanentemente
          await dependencies.imageJobRepository.updateStatus(imageJobId, ProcessingStatus.failed());
          throw error;
        }

        // Error recuperable, dejar que BullMQ reintente
        throw error;
      }
    },
    {
      ...getRedisConnection(),
      concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '2', 10),
    }
  );

  // Manejar eventos del worker
  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Worker] Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error(`[Worker] Error:`, error);
  });

  return worker;
}
