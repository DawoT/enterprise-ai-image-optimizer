import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/container';
import { ImageJobRepository } from '@/core/domain/interfaces/image-job.repository.interface';
import { ImageJob } from '@/core/domain/entities/image-job';
import { DomainError } from '@/core/domain/errors/domain-error';
import { z } from 'zod';

/**
 * Schema de validación para listar trabajos.
 */
const listJobsSchema = z.object({
  status: z
    .enum(['PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'])
    .optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

/**
 * GET /api/jobs
 * Lista los trabajos de procesamiento de imágenes.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validation = listJobsSchema.safeParse(searchParams);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { status, page, limit } = validation.data;

    // Resolver dependencias
    const imageJobRepository = container.resolve<ImageJobRepository>('ImageJobRepository');

    // Obtener trabajos
    let jobs: ImageJob[];
    if (status) {
      const { ProcessingStatus } = await import('@/core/domain/value-objects/processing-status');
      jobs = await imageJobRepository.findByStatus(ProcessingStatus.fromString(status));
    } else {
      jobs = await imageJobRepository.findAll();
    }

    // Paginar resultados
    const totalJobs = jobs.length;
    const totalPages = Math.ceil(totalJobs / limit);
    const startIndex = (page - 1) * limit;
    const paginatedJobs = jobs.slice(startIndex, startIndex + limit);

    // Obtener estadísticas
    const stats = await imageJobRepository.getStats();

    return NextResponse.json({
      data: paginatedJobs.map((job) => ({
        id: job.id.value,
        fileName: job.fileName.value,
        status: job.status.value,
        statusDescription: job.status.toHumanReadable(),
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        versions: Array.from(job.versions.entries()).map(([type, version]) => ({
          type,
          width: version.resolution.width,
          height: version.resolution.height,
          fileSize: version.fileSize.value,
          fileName: version.fileName.value,
        })),
      })),
      pagination: {
        page,
        limit,
        totalJobs,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      stats,
    });
  } catch (error) {
    console.error('Error al listar trabajos:', error);

    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
