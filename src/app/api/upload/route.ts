import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/container';
import { UploadImageUseCase } from '@/core/use-cases/upload-image.use-case';
import { ProcessImagePipelineUseCase } from '@/core/use-cases/process-image-pipeline.use-case';
import { ImageJobRepository } from '@/core/domain/interfaces/image-job.repository.interface';
import { DomainError } from '@/core/domain/errors/domain-error';
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
 * Sube una nueva imagen al sistema.
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar content-type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type debe ser multipart/form-data' },
        { status: 400 },
      );
    }

    // Parsear el formulario
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 },
      );
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
        { status: 400 },
      );
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resolver dependencias
    const imageJobRepository = container.resolve<ImageJobRepository>(
      'ImageJobRepository',
    );
    const storageService = container.resolve('StorageService');
    const eventBus = container.resolve('EventBus');

    const uploadImageUseCase = new UploadImageUseCase(
      imageJobRepository,
      storageService,
      eventBus,
    );

    // Ejecutar caso de uso
    const result = await uploadImageUseCase.execute({
      fileName: metadata.fileName,
      fileSize: file.size,
      mimeType: metadata.mimeType,
      fileBuffer: buffer,
      runAIAnalysis: metadata.runAIAnalysis,
      brandContext: metadata.brandContext,
      productContext: metadata.productContext,
    });

    // Iniciar procesamiento en segundo plano si está habilitado
    if (metadata.runAIAnalysis) {
      const processImagePipelineUseCase = new ProcessImagePipelineUseCase(
        imageJobRepository,
        container.resolve('ImageProcessor'),
        container.resolve('AIAnalysisService'),
        storageService,
      );

      // Ejecutar procesamiento asíncronamente
      processImagePipelineUseCase
        .execute({ jobId: result.job.id, runAIAnalysis: true })
        .catch((error) => {
          console.error('Error en procesamiento de imagen:', error);
        });
    }

    return NextResponse.json(
      {
        success: true,
        jobId: result.job.id.value,
        status: result.job.status.value,
        fileName: result.job.fileName.value,
        createdAt: result.job.createdAt.toISOString(),
      },
      { status: 201 },
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
        { status: error.isRecoverable ? 400 : 500 },
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/upload
 * Verifica el estado del endpoint de upload.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Endpoint de upload disponible',
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'],
    maxFileSize: '50MB',
  });
}
