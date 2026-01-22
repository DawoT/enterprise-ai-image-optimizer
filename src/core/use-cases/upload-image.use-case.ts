import { UseCase } from './use-case.interface';
import { ImageJob, ImageJobCreateProps } from '../domain/entities/image-job';
import { ImageJobRepository } from '../domain/interfaces/image-job.repository.interface';
import { ImageStorageService } from '../domain/interfaces/image-storage-service.interface';
import { DomainEventBus } from '../events/domain-event.interface';
import { DomainError } from '../domain/errors/domain-error';

/**
 * Resultado del caso de uso de subida de imagen.
 */
export interface UploadImageResult {
  job: ImageJob;
  uploadUrl?: string;
}

/**
 * Caso de uso para subir una nueva imagen al sistema.
 * Maneja la validación, almacenamiento inicial y creación del trabajo.
 */
export class UploadImageUseCase
  implements UseCase<UploadImageUseCaseParams, UploadImageResult>
{
  constructor(
    private readonly imageJobRepository: ImageJobRepository,
    private readonly storageService: ImageStorageService,
    private readonly eventBus: DomainEventBus,
  ) {}

  /**
   * Ejecuta el caso de uso.
   */
  async execute(params: UploadImageUseCaseParams): Promise<UploadImageResult> {
    // Validar el archivo
    await this.validateFile(params);

    // Crear el trabajo de imagen
    const job = ImageJob.create({
      fileName: params.fileName,
      originalFilePath: '', // Se actualizará después de guardar
      originalFileSize: params.fileSize,
      mimeType: params.mimeType,
      metadata: params.metadata,
      brandContext: params.brandContext,
      productContext: params.productContext,
    });

    // Guardar el trabajo inicialmente
    const savedJob = await this.imageJobRepository.save(job);

    // Generar URL de upload si es necesario
    let uploadUrl: string | undefined;
    if (params.fileBuffer) {
      // Guardar el archivo en el storage
      const filePath = await this.storageService.store(
        params.fileBuffer,
        savedJob.id.value,
        params.fileName,
      );

      // Actualizar el trabajo con la ruta del archivo
      (savedJob as { originalFilePath: string }).originalFilePath = filePath;
      await this.imageJobRepository.save(savedJob);
    } else if (params.uploadUrl) {
      // Descargar desde URL proporcionada
      const fileBuffer = await this.downloadFromUrl(params.uploadUrl);
      const filePath = await this.storageService.store(
        fileBuffer,
        savedJob.id.value,
        params.fileName,
      );

      (savedJob as { originalFilePath: string }).originalFilePath = filePath;
      await this.imageJobRepository.save(savedJob);
    }

    return {
      job: savedJob,
      uploadUrl,
    };
  }

  /**
   * Valida el archivo antes de procesarlo.
   */
  private async validateFile(params: UploadImageUseCaseParams): Promise<void> {
    // Validar tamaño
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (params.fileSize > maxSize) {
      throw new DomainError('El archivo excede el tamaño máximo permitido', {
        code: 'FILE_TOO_LARGE',
        context: { fileSize: params.fileSize, maxSize },
        isRecoverable: false,
      });
    }

    // Validar tipo MIME
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/tiff',
    ];
    if (!allowedTypes.includes(params.mimeType)) {
      throw new DomainError('Tipo de archivo no soportado', {
        code: 'INVALID_FILE_TYPE',
        context: { mimeType: params.mimeType, allowedTypes },
        isRecoverable: true,
      });
    }
  }

  /**
   * Descarga un archivo desde una URL.
   */
  private async downloadFromUrl(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new DomainError(`Error al descargar archivo: ${response.statusText}`, {
          code: 'DOWNLOAD_FAILED',
          context: { url },
          isRecoverable: true,
        });
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError('Error al descargar archivo', {
        code: 'DOWNLOAD_ERROR',
        context: { url, error: String(error) },
        isRecoverable: true,
      });
    }
  }
}

interface UploadImageUseCaseParams {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileBuffer?: Buffer;
  uploadUrl?: string;
  metadata?: Record<string, string>;
  brandContext?: ImageJobCreateProps['brandContext'];
  productContext?: ImageJobCreateProps['productContext'];
}
