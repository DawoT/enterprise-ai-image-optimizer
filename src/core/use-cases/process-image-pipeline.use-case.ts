import { UseCase } from './use-case.interface';
import { ImageJob } from '../domain/entities/image-job';
import {
  ImageVersion,
  ImageVersionType,
  IMAGE_VERSION_CONFIG,
} from '../domain/entities/image-version';
import { ImageJobRepository } from '../domain/interfaces/image-job.repository.interface';
import { ImageProcessorPort } from '../domain/interfaces/image-processor.port.interface';
import { AIAnalysisService } from '../domain/interfaces/ai-analysis-service.interface';
import { ImageStorageService } from '../domain/interfaces/image-storage-service.interface';
import { ProcessingStatus } from '../domain/value-objects/processing-status';
import { ImageJobStatusChangedEvent } from '../events/image-job-status-changed';
import { DomainError } from '../domain/errors/domain-error';

/**
 * Resultado del caso de uso de procesamiento de imagen.
 */
export interface ProcessImagePipelineResult {
  job: ImageJob;
  processedVersions: Map<ImageVersionType, ImageVersion>;
  aiAnalysis?: AIAnalysisResult;
  processingTimeMs: number;
}

/**
 * Resultado del análisis de IA.
 */
export interface AIAnalysisResult {
  prompt: string;
  detectedObjects: string[];
  suggestedCrop?: { x: number; y: number; width: number; height: number };
  qualityScore: number;
}

/**
 * Caso de uso para procesar el pipeline completo de optimización de imagen.
 * Maneja la generación de las 4 versiones estándar y el análisis de IA.
 */
export class ProcessImagePipelineUseCase implements UseCase<
  ProcessImagePipelineUseCaseParams,
  ProcessImagePipelineResult
> {
  constructor(
    private readonly imageJobRepository: ImageJobRepository,
    private readonly imageProcessor: ImageProcessorPort,
    private readonly aiAnalysisService: AIAnalysisService | null,
    private readonly storageService: ImageStorageService
  ) {}

  /**
   * Ejecuta el caso de uso.
   */
  async execute(params: ProcessImagePipelineUseCaseParams): Promise<ProcessImagePipelineResult> {
    const startTime = Date.now();

    // Obtener el trabajo
    const job = await this.imageJobRepository.findById(params.jobId);
    if (!job) {
      throw new DomainError('Trabajo no encontrado', {
        code: 'JOB_NOT_FOUND',
        context: { jobId: params.jobId.value },
        isRecoverable: false,
      });
    }

    // Verificar que el trabajo esté en estado válido para procesamiento
    if (!job.status.canTransitionTo(ProcessingStatus.processing())) {
      throw new DomainError(`No se puede procesar el trabajo en estado: ${job.status.value}`, {
        code: 'INVALID_JOB_STATE',
        context: { currentState: job.status.value },
        isRecoverable: false,
      });
    }

    // Actualizar estado a Processing
    const statusEvent = job.updateStatus(ProcessingStatus.processing());
    if (statusEvent) {
      await this.imageJobRepository.save(job);
    }

    try {
      // Leer el archivo original
      const originalBuffer = await this.storageService.retrieve(job.originalFilePath);

      // Análisis de IA (opcional)
      let aiAnalysis: AIAnalysisResult | undefined;
      if (this.aiAnalysisService && params.runAIAnalysis) {
        aiAnalysis = await this.aiAnalysisService.analyze(originalBuffer, {
          brandContext: job.brandContext ?? undefined,
          productContext: job.productContext ?? undefined,
        });
      }

      // Generar todas las versiones
      const processedVersions = await this.generateVersions(job, originalBuffer, aiAnalysis);

      // Actualizar estado a Completed
      job.updateStatus(ProcessingStatus.completed());
      await this.imageJobRepository.save(job);

      const processingTimeMs = Date.now() - startTime;

      return {
        job,
        processedVersions,
        aiAnalysis,
        processingTimeMs,
      };
    } catch (error) {
      // Manejar error
      job.updateStatus(ProcessingStatus.failed());
      await this.imageJobRepository.save(job);

      if (error instanceof DomainError) {
        throw error;
      }

      throw new DomainError('Error en el pipeline de procesamiento', {
        code: 'PIPELINE_ERROR',
        context: { jobId: params.jobId.value, error: String(error) },
        isRecoverable: true,
      });
    }
  }

  /**
   * Genera todas las versiones de imagen requeridas.
   * Implementa naming convention enterprise: {productId}_{variant}_{resolution}.{format}
   */
  private async generateVersions(
    job: ImageJob,
    originalBuffer: Buffer,
    aiAnalysis?: AIAnalysisResult
  ): Promise<Map<ImageVersionType, ImageVersion>> {
    const versions = new Map<ImageVersionType, ImageVersion>();
    const versionTypes: ImageVersionType[] = ['V1_MASTER', 'V2_GRID', 'V3_PDP', 'V4_THUMBNAIL'];

    // Determinar el prefijo para naming y path: productId o jobId como fallback
    const productId = job.productContext?.id;
    const namingPrefix = productId || job.id.value;
    const storagePathPrefix = productId ? `product-images/${productId}` : job.id.value;

    for (const versionType of versionTypes) {
      const config = IMAGE_VERSION_CONFIG[versionType];

      try {
        // Procesar la imagen con Smart Crop si la IA lo sugiere
        const processedBuffer = await this.imageProcessor.process(originalBuffer, {
          targetWidth: config.width,
          targetHeight: config.height,
          format: config.format,
          quality: config.quality,
          fitMode: versionType === 'V1_MASTER' ? 'contain' : 'cover',
          // Pasar las coordenadas de crop desde el análisis de IA
          extractRegion: aiAnalysis?.suggestedCrop,
        });

        // Generar nombre de archivo según convención enterprise
        // Formato: {productId}_{variant}_{width}x{height}.{format}
        const fileName = this.generateEnterpriseFileName(
          namingPrefix,
          versionType,
          config.width,
          config.height,
          config.format.toLowerCase()
        );

        // Guardar en la estructura de carpetas: product-images/{productId}/{versionType}/
        const filePath = await this.storageService.store(
          processedBuffer,
          `${storagePathPrefix}/${versionType.toLowerCase()}`,
          fileName
        );

        // Crear la entidad de versión
        const version = ImageVersion.create({
          jobId: job.id,
          type: versionType,
          fileSize: processedBuffer.length,
          filePath,
          fileName,
        });

        // Verificar que cumple con las restricciones de tamaño
        if (!version.isWithinSizeLimit()) {
          // Re-comprimir si es necesario
          const recompressedBuffer = await this.imageProcessor.compress(
            processedBuffer,
            config.format,
            70
          );

          const recompressedFilePath = await this.storageService.store(
            recompressedBuffer,
            `${storagePathPrefix}/${versionType.toLowerCase()}`,
            `compressed_${fileName}`
          );

          (version as { fileSize: unknown; filePath: unknown }).fileSize =
            recompressedBuffer.length;
          (version as { filePath: string }).filePath = recompressedFilePath;
        }

        versions.set(versionType, version);
        job.addVersion(version);
      } catch (error) {
        throw new DomainError(`Error al generar versión ${versionType}`, {
          code: 'VERSION_GENERATION_FAILED',
          context: { versionType, jobId: job.id.value, error: String(error) },
          isRecoverable: false,
        });
      }
    }

    return versions;
  }

  /**
   * Genera un nombre de archivo siguiendo la convención enterprise.
   * Formato: {prefix}_{variant}_{width}x{height}.{format}
   */
  private generateEnterpriseFileName(
    prefix: string,
    versionType: ImageVersionType,
    width: number,
    height: number,
    format: string
  ): string {
    // Mapear versionType a variant corto
    const variantMap: Record<ImageVersionType, string> = {
      V1_MASTER: 'master',
      V2_GRID: 'grid',
      V3_PDP: 'pdp',
      V4_THUMBNAIL: 'thumb',
    };

    const variant = variantMap[versionType];
    return `${prefix}_${variant}_${width}x${height}.${format}`;
  }
}

interface ProcessImagePipelineUseCaseParams {
  jobId: ImageJob['id'];
  runAIAnalysis?: boolean;
}
