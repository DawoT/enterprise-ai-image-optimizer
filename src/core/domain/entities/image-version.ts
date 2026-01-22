import { Entity } from '../interfaces/entity.interface';
import { ImageJobId } from '../value-objects/image-job-id';
import { ImageResolution } from '../value-objects/image-resolution';
import { FileSize } from '../value-objects/file-size';
import { FileName } from '../value-objects/file-name';

/**
 * Tipo que define las variantes de imagen soportadas por el sistema.
 * Cada variante tiene un propósito específico en el contexto de ecommerce.
 */
export type ImageVersionType =
  | 'V1_MASTER'
  | 'V2_GRID'
  | 'V3_PDP'
  | 'V4_THUMBNAIL';

/**
 * Configuración predefinida para cada tipo de versión de imagen.
 */
export const IMAGE_VERSION_CONFIG: Record<
  ImageVersionType,
  {
    width: number;
    height: number;
    maxFileSizeBytes: number;
    format: 'WEBP' | 'JPG' | 'PNG';
    quality: number;
  }
> = {
  V1_MASTER: {
    width: 4096,
    height: 4096,
    maxFileSizeBytes: 1.5 * 1024 * 1024, // 1.5 MB
    format: 'WEBP',
    quality: 95,
  },
  V2_GRID: {
    width: 2048,
    height: 2048,
    maxFileSizeBytes: 500 * 1024, // 500 KB
    format: 'WEBP',
    quality: 85,
  },
  V3_PDP: {
    width: 1200,
    height: 1200,
    maxFileSizeBytes: 300 * 1024, // 300 KB
    format: 'WEBP',
    quality: 85,
  },
  V4_THUMBNAIL: {
    width: 600,
    height: 600,
    maxFileSizeBytes: 150 * 1024, // 150 KB
    format: 'WEBP',
    quality: 80,
  },
};

/**
 * Entidad que representa una versión específica de una imagen procesada.
 */
export class ImageVersion implements Entity<ImageJobId> {
  private readonly _jobId: ImageJobId;
  private readonly _type: ImageVersionType;
  private readonly _resolution: ImageResolution;
  private readonly _fileSize: FileSize;
  private readonly _filePath: string;
  private readonly _fileName: FileName;
  private readonly _format: string;
  private readonly _quality: number;
  private readonly _fileHash: string;
  private readonly _createdAt: Date;

  private constructor(props: ImageVersionConstructorProps) {
    this._jobId = props.jobId;
    this._type = props.type;
    this._resolution = props.resolution;
    this._fileSize = props.fileSize;
    this._filePath = props.filePath;
    this._fileName = props.fileName;
    this._format = props.format;
    this._quality = props.quality;
    this._fileHash = props.fileHash;
    this._createdAt = props.createdAt ?? new Date();
  }

  /**
   * Factory method para crear una nueva versión de imagen.
   */
  public static create(
    props: ImageVersionCreateProps,
  ): ImageVersion {
    const config = IMAGE_VERSION_CONFIG[props.type];

    return new ImageVersion({
      jobId: props.jobId,
      type: props.type,
      resolution: ImageResolution.create(config.width, config.height),
      fileSize: FileSize.create(props.fileSize ?? 0),
      filePath: props.filePath,
      fileName: FileName.create(props.fileName),
      format: config.format,
      quality: config.quality,
      fileHash: props.fileHash ?? '',
    });
  }

  /**
   * Reconstruye una instancia desde datos persistidos.
   */
  public static fromPersistence(
    data: ImageVersionPersistenceProps,
  ): ImageVersion {
    return new ImageVersion({
      jobId: ImageJobId.create(data.job_id),
      type: data.type as ImageVersionType,
      resolution: ImageResolution.create(data.width, data.height),
      fileSize: FileSize.create(data.file_size),
      filePath: data.file_path,
      fileName: FileName.create(data.file_name),
      format: data.format,
      quality: data.quality,
      fileHash: data.file_hash,
      createdAt: new Date(data.created_at),
    });
  }

  // Getters
  public get jobId(): ImageJobId {
    return this._jobId;
  }

  public get type(): ImageVersionType {
    return this._type;
  }

  public get resolution(): ImageResolution {
    return this._resolution;
  }

  public get fileSize(): FileSize {
    return this._fileSize;
  }

  public get filePath(): string {
    return this._filePath;
  }

  public get fileName(): FileName {
    return this._fileName;
  }

  public get format(): string {
    return this._format;
  }

  public get quality(): number {
    return this._quality;
  }

  public get fileHash(): string {
    return this._fileHash;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get config() {
    return IMAGE_VERSION_CONFIG[this._type];
  }

  /**
   * Verifica si el tamaño de archivo cumple con las restricciones.
   */
  public isWithinSizeLimit(): boolean {
    return this._fileSize.value <= this.config.maxFileSizeBytes;
  }

  /**
   * Convierte la entidad a un objeto plano para persistencia.
   */
  public toPersistence(): ImageVersionPersistenceProps {
    return {
      job_id: this._jobId.value,
      type: this._type,
      width: this._resolution.width,
      height: this._resolution.height,
      file_size: this._fileSize.value,
      file_path: this._filePath,
      file_name: this._fileName.value,
      format: this._format,
      quality: this._quality,
      file_hash: this._fileHash,
      created_at: this._createdAt,
    };
  }

  /**
   * Compara dos entidades por identidad.
   */
  public equals(other: ImageVersion): boolean {
    return (
      this._jobId.equals(other._jobId) && this._type === other._type
    );
  }
}

// Tipos
interface ImageVersionConstructorProps {
  jobId: ImageJobId;
  type: ImageVersionType;
  resolution: ImageResolution;
  fileSize: FileSize;
  filePath: string;
  fileName: FileName;
  format: string;
  quality: number;
  fileHash: string;
  createdAt?: Date;
}

interface ImageVersionCreateProps {
  jobId: ImageJobId;
  type: ImageVersionType;
  fileSize?: number;
  filePath: string;
  fileName: string;
  fileHash?: string;
}

interface ImageVersionPersistenceProps {
  job_id: string;
  type: string;
  width: number;
  height: number;
  file_size: number;
  file_path: string;
  file_name: string;
  format: string;
  quality: number;
  file_hash: string;
  created_at: Date;
}
