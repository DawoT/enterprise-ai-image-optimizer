import { Repository } from './entity.interface';
import { ImageJob, ImageJobPersistenceProps } from '../entities/image-job';
import { ImageJobId } from '../value-objects/image-job-id';
import { ProcessingStatus } from '../value-objects/processing-status';

/**
 * Puerto (interface) para el repositorio de trabajos de imagen.
 * Define las operaciones disponibles para persistir y consultar ImageJobs.
 */
export interface ImageJobRepository
  extends Repository<ImageJob, ImageJobId, ImageJobPersistenceProps> {
  /**
   * Busca trabajos por estado de procesamiento.
   */
  findByStatus(status: ProcessingStatus): Promise<ImageJob[]>;

  /**
   * Busca trabajos pendientes de procesamiento.
   */
  findPending(): Promise<ImageJob[]>;

  /**
   * Busca trabajos por nombre de archivo.
   */
  findByFileName(fileName: string): Promise<ImageJob[]>;

  /**
   * Actualiza el estado de un trabajo.
   */
  updateStatus(
    id: ImageJobId,
    status: ProcessingStatus,
  ): Promise<ImageJob>;

  /**
   * Obtiene estadísticas de procesamiento.
   */
  getStats(): Promise<ProcessingStats>;
}

/**
 * Estadísticas de procesamiento de trabajos.
 */
export interface ProcessingStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTimeMs: number;
}
