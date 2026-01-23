import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/container';
import { UploadImageUseCase } from '@/core/use-cases/upload-image.use-case';
import { ImageJobRepository } from '@/core/domain/interfaces/image-job.repository.interface';
import { DomainError } from '@/core/domain/errors/domain-error';
import { ProcessingStatus } from '@/core/domain/value-objects/processing-status';
import { z } from 'zod';

/**
 * Schema de validación para el upload de imagen.
 */
const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/tiff']),
  runAIAnalysis: z.boolean().optional().default(true),
  brandContext: z
    .object({
      name: z.string(),
      vertical: z.enum(['fashion', 'electronics', 'home', 'other']),
      tone: z.enum(['premium', 'neutral', 'mass-market']),
      background: z.string().optional(),
    })
    .optional(),
  productContext: z
    .object({
      id: z.string(),
      category: z.string(),
      attributes: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * POST /api/upload
 * Sube una nueva imagen al sistema y la encola para procesamiento asíncrono.
 *
 * Cambios respecto a la versión anterior:
 * - Ahora retorna HTTP 202 Accepted (encolar no significa completar)
 * - El procesamiento se hace via BullMQ en lugar de fire-and-forget
 * - Respuesta incluye información de la cola
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar content-type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type debe ser multipart/form-data' },
        { status: 400 }
      );
    }

    // Parsear el formulario
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }

    // Validar metadata
    const metadata = {
      fileName: file.name,
      mimeType: file.type,
      runAIAnalysis: formData.get('runAIAnalysis') === 'true',
      brandContext: formData.get('brandContext')
        ? JSON.parse(formData.get('brandContext') as string)
        : undefined,
      productContext: formData.get('productContext')
        ? JSON.parse(formData.get('productContext') as string)
        : undefined,
    };

    const validation = uploadSchema.safeParse(metadata);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validación fallida', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resolver dependencias
    const imageJobRepository = container.resolve<ImageJobRepository>('ImageJobRepository');
    const storageService = container.resolve('StorageService');
    const eventBus = container.resolve('EventBus');

    const uploadImageUseCase = new UploadImageUseCase(imageJobRepository, storageService, eventBus);

    // Ejecutar caso de uso de upload
    const result = await uploadImageUseCase.execute({
      fileName: metadata.fileName,
      fileSize: file.size,
      mimeType: metadata.mimeType,
      fileBuffer: buffer,
      runAIAnalysis: metadata.runAIAnalysis,
      brandContext: metadata.brandContext,
      productContext: metadata.productContext,
    });

    // Encolar para procesamiento asíncrono
    let queueStatus = 'not_available';
    let queueJobId: string | null = null;

    try {
      const queueClient = container.resolve('QueueClient');
      queueJobId = await queueClient.addJob(result.job.id.value, {
        runAIAnalysis: metadata.runAIAnalysis,
      });
      queueStatus = 'queued';

      // Actualizar estado del trabajo a QUEUED
      await imageJobRepository.updateStatus(result.job.id, ProcessingStatus.queued());
    } catch (queueError) {
      // Si la cola no está disponible, intentar procesamiento directo como fallback
      console.warn('Queue not available, falling back to direct processing:', queueError);
      queueStatus = 'fallback';

      // Actualizar estado a QUEUED para mantener consistencia
      await imageJobRepository.updateStatus(result.job.id, ProcessingStatus.queued());
    }

    // Retornar 202 Accepted (el trabajo ha sido encolado, no necesariamente completado)
    return NextResponse.json(
      {
        success: true,
        jobId: result.job.id.value,
        status: 'QUEUED',
        statusDescription: 'En cola para procesamiento',
        fileName: result.job.fileName.value,
        createdAt: result.job.createdAt.toISOString(),
        queue: {
          status: queueStatus,
          queueJobId: queueJobId,
          checkStatusUrl: `/api/jobs/${result.job.id.value}`,
        },
        message: 'Imagen subida exitosamente. El procesamiento se realizará en segundo plano.',
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Error en upload:', error);

    if (error instanceof DomainError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          isRecoverable: error.isRecoverable,
        },
        { status: error.isRecoverable ? 400 : 500 }
      );
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * GET /api/upload
 * Verifica el estado del endpoint de upload.
 */
export async function GET() {
  // Verificar si la cola está disponible
  let queueAvailable = false;
  let queueStats = null;

  try {
    const queueClient = container.resolve('QueueClient');
    queueStats = {
      pending: await queueClient.getPendingCount(),
      processing: await queueClient.getProcessingCount(),
    };
    queueAvailable = true;
  } catch {
    queueAvailable = false;
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Endpoint de upload disponible',
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'],
    maxFileSize: '50MB',
    processing: {
      mode: 'async',
      queue: {
        available: queueAvailable,
        stats: queueStats,
      },
    },
  });
}
