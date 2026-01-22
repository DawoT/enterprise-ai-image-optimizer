import { ImageJobRepository } from '@/core/domain/interfaces/image-job.repository.interface';
import { ImageJob } from '@/core/domain/entities/image-job';
import { ImageJobId } from '@/core/domain/value-objects/image-job-id';
import { ProcessingStatus } from '@/core/domain/value-objects/processing-status';
import { prisma } from '@/infrastructure/db/prisma-client';
import { DomainError } from '@/core/domain/errors/domain-error';

/**
 * Implementación del repositorio de trabajos de imagen usando Prisma.
 * Persiste los trabajos en PostgreSQL y los recupera según las operaciones definidas.
 */
export class PrismaImageJobRepository implements ImageJobRepository {
  /**
   * Guarda un trabajo de imagen en la base de datos.
   */
  public async save(entity: ImageJob): Promise<ImageJob> {
    const data = this.toPrismaCreate(entity);

    const saved = await prisma.imageJob.create({
      data,
      include: {
        versions: true,
      },
    });

    return this.fromPrisma(saved);
  }

  /**
   * Busca un trabajo por su identificador.
   */
  public async findById(id: ImageJobId): Promise<ImageJob | null> {
    const job = await prisma.imageJob.findUnique({
      where: { id: id.value },
      include: {
        versions: true,
      },
    });

    if (!job) {
      return null;
    }

    return this.fromPrisma(job);
  }

  /**
   * Busca todos los trabajos.
   */
  public async findAll(): Promise<ImageJob[]> {
    const jobs = await prisma.imageJob.findMany({
      include: {
        versions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return jobs.map((job) => this.fromPrisma(job));
  }

  /**
   * Elimina un trabajo por su identificador.
   */
  public async delete(id: ImageJobId): Promise<void> {
    await prisma.imageJob.delete({
      where: { id: id.value },
    });
  }

  /**
   * Verifica si existe un trabajo con el identificador dado.
   */
  public async exists(id: ImageJobId): Promise<boolean> {
    const count = await prisma.imageJob.count({
      where: { id: id.value },
    });

    return count > 0;
  }

  /**
   * Busca trabajos por estado de procesamiento.
   */
  public async findByStatus(status: ProcessingStatus): Promise<ImageJob[]> {
    const jobs = await prisma.imageJob.findMany({
      where: { status: status.value as import('@prisma/client').JobStatus },
      include: {
        versions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return jobs.map((job) => this.fromPrisma(job));
  }

  /**
   * Busca trabajos pendientes de procesamiento.
   */
  public async findPending(): Promise<ImageJob[]> {
    return this.findByStatus(ProcessingStatus.pending());
  }

  /**
   * Busca trabajos por nombre de archivo.
   */
  public async findByFileName(fileName: string): Promise<ImageJob[]> {
    const jobs = await prisma.imageJob.findMany({
      where: {
        originalFileName: {
          contains: fileName,
          mode: 'insensitive',
        },
      },
      include: {
        versions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return jobs.map((job) => this.fromPrisma(job));
  }

  /**
   * Actualiza el estado de un trabajo.
   */
  public async updateStatus(
    id: ImageJobId,
    status: ProcessingStatus,
  ): Promise<ImageJob> {
    const updateData: Record<string, unknown> = {
      status: status.value as import('@prisma/client').JobStatus,
    };

    // Actualizar timestamps según el estado
    if (status.isProcessing) {
      updateData.processingStartedAt = new Date();
    } else if (status.isCompleted || status.isFailed) {
      updateData.processingEndedAt = new Date();
    }

    const updated = await prisma.imageJob.update({
      where: { id: id.value },
      data: updateData,
      include: {
        versions: true,
      },
    });

    return this.fromPrisma(updated);
  }

  /**
   * Obtiene estadísticas de procesamiento.
   */
  public async getStats(): Promise<{
    totalJobs: number;
    pendingJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageProcessingTimeMs: number;
  }> {
    const [total, pending, processing, completed, failed] = await Promise.all([
      prisma.imageJob.count(),
      prisma.imageJob.count({
        where: { status: 'PENDING' },
      }),
      prisma.imageJob.count({
        where: { status: 'PROCESSING' },
      }),
      prisma.imageJob.count({
        where: { status: 'COMPLETED' },
      }),
      prisma.imageJob.count({
        where: { status: 'FAILED' },
      }),
    ]);

    // Calcular tiempo promedio de procesamiento
    const completedJobs = await prisma.imageJob.findMany({
      where: {
        status: 'COMPLETED',
        processingStartedAt: { not: null },
        processingEndedAt: { not: null },
      },
      select: {
        processingStartedAt: true,
        processingEndedAt: true,
      },
    });

    let averageProcessingTimeMs = 0;
    if (completedJobs.length > 0) {
      const totalTime = completedJobs.reduce((sum, job) => {
        const start = job.processingStartedAt!.getTime();
        const end = job.processingEndedAt!.getTime();
        return sum + (end - start);
      }, 0);
      averageProcessingTimeMs = Math.round(totalTime / completedJobs.length);
    }

    return {
      totalJobs: total,
      pendingJobs: pending,
      processingJobs: processing,
      completedJobs: completed,
      failedJobs: failed,
      averageProcessingTimeMs,
    };
  }

  /**
   * Convierte una entidad del dominio a datos de Prisma.
   */
  private toPrismaCreate(entity: ImageJob): Prisma.ImageJobCreateInput {
    return {
      id: entity.id.value,
      originalFileName: entity.fileName.value,
      originalFileSize: entity.originalFileSize.value,
      mimeType: entity.mimeType,
      originalFilePath: entity.originalFilePath,
      status: 'PENDING' as const,
      brandContext: entity.brandContext ?? undefined,
      productContext: entity.productContext ?? undefined,
      versions: {
        create: [],
      },
    };
  }

  /**
   * Convierte datos de Prisma a una entidad del dominio.
   */
  private fromPrisma(
    data: Prisma.ImageJobGetPayload<{ include: { versions: true } }>,
  ): ImageJob {
    return ImageJob.fromPersistence({
      id: data.id,
      file_name: data.originalFileName,
      original_file_size: data.originalFileSize,
      original_file_path: data.originalFilePath,
      mime_type: data.mimeType,
      status: data.status,
      versions: data.versions.map((v) => this.versionToPersistence(v)),
      created_at: data.createdAt,
      updated_at: data.updatedAt,
      metadata: {},
      brand_context: data.brandContext as ImageJob['brandContext'] | null,
      product_context: data.productContext as ImageJob['productContext'] | null,
    });
  }

  /**
   * Convierte una versión de Prisma al formato de persistencia del dominio.
   */
  private versionToPersistence(
    version: Prisma.ImageVersionGetPayload<{ include: never }>,
  ): ImageJobPersistenceProps['versions'] extends Array<infer T> ? T : never {
    return {
      job_id: version.jobId,
      type: version.versionType,
      width: version.width,
      height: version.height,
      file_size: version.fileSize,
      file_path: version.filePath,
      file_name: version.fileName,
      format: version.format,
      quality: version.quality,
      file_hash: version.fileHash ?? '',
      created_at: version.createdAt,
    } as ImageJobPersistenceProps['versions'] extends Array<infer T> ? T : never;
  }
}

// Importar tipos de Prisma
import type { Prisma } from '@prisma/client';
