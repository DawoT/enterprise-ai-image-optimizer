import { Entity } from '../interfaces/entity.interface';
import { ImageVersion, ImageVersionType } from './image-version';
import { ProcessingStatus } from '../value-objects/processing-status';
import { ImageJobId } from '../value-objects/image-job-id';
import { FileName } from '../value-objects/file-name';
import { FileSize } from '../value-objects/file-size';
import { ImageJobStatusChangedEvent } from '../events/image-job-status-changed';
import { DomainError } from '../errors/domain-error';
import { InvalidImageJobError } from '../errors/invalid-image-job-error';

/**
 * Entidad principal que representa un trabajo de procesamiento de imagen.
 * Implementa los principios de Clean Architecture como entidad del dominio.
 */
export class ImageJob implements Entity<ImageJobId> {
  private readonly _id: ImageJobId;
  private readonly _fileName: FileName;
  private readonly _originalFileSize: FileSize;
  private readonly _originalFilePath: string;
  private readonly _mimeType: string;
  private readonly _status: ProcessingStatus;
  private readonly _versions: Map<ImageVersionType, ImageVersion>;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;
  private readonly _metadata: ReadonlyMap<string, string>;
  private readonly _brandContext: BrandContext | null;
  private readonly _productContext: ProductContext | null;

  private constructor(props: ImageJobConstructorProps) {
    this._id = props.id;
    this._fileName = props.fileName;
    this._originalFileSize = props.originalFileSize;
    this._originalFilePath = props.originalFilePath;
    this._mimeType = props.mimeType;
    this._status = props.status;
    this._versions = new Map(props.versions || []);
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._metadata = new Map(props.metadata || []);
    this._brandContext = props.brandContext ?? null;
    this._productContext = props.productContext ?? null;
  }

  /**
   * Factory method para crear una nueva instancia de ImageJob.
   * Valida todos los parámetros antes de instanciar.
   */
  public static create(props: ImageJobCreateProps): ImageJob {
    const errors: string[] = [];

    if (!props.fileName || props.fileName.trim().length === 0) {
      errors.push('El nombre del archivo es obligatorio');
    }

    if (!props.originalFilePath || props.originalFilePath.trim().length === 0) {
      errors.push('La ruta del archivo original es obligatoria');
    }

    if (!props.mimeType || !this.isValidMimeType(props.mimeType)) {
      errors.push(`Tipo MIME no válido: ${props.mimeType}`);
    }

    if (props.originalFileSize && props.originalFileSize > MAX_UPLOAD_SIZE) {
      errors.push(`El tamaño del archivo excede el máximo permitido de ${MAX_UPLOAD_SIZE} bytes`);
    }

    if (errors.length > 0) {
      throw new InvalidImageJobError('Error al crear ImageJob', errors);
    }

    return new ImageJob({
      id: ImageJobId.create(),
      fileName: FileName.create(props.fileName),
      originalFileSize: FileSize.create(props.originalFileSize ?? 0),
      originalFilePath: props.originalFilePath,
      mimeType: props.mimeType,
      status: ProcessingStatus.pending(),
      versions: [],
      metadata: props.metadata,
      brandContext: props.brandContext,
      productContext: props.productContext,
    });
  }

  /**
   * Reconstruye una instancia de ImageJob desde datos persistidos.
   */
  public static fromPersistence(data: ImageJobPersistenceProps): ImageJob {
    const job = new ImageJob({
      id: ImageJobId.create(data.id),
      fileName: FileName.create(data.file_name),
      originalFileSize: FileSize.create(data.original_file_size),
      originalFilePath: data.original_file_path,
      mimeType: data.mime_type,
      status: ProcessingStatus.fromString(data.status),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      metadata: data.metadata,
      brandContext: data.brand_context,
      productContext: data.product_context,
    });

    // Reconstruir versiones
    if (data.versions) {
      for (const versionData of data.versions) {
        const version = ImageVersion.fromPersistence(versionData);
        job._versions.set(version.type, version);
      }
    }

    return job;
  }

  private static isValidMimeType(mimeType: string): boolean {
    const validMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/tiff',
      'image/svg+xml',
      'image/gif',
    ];
    return validMimeTypes.includes(mimeType);
  }

  // Getters
  public get id(): ImageJobId {
    return this._id;
  }

  public get fileName(): FileName {
    return this._fileName;
  }

  public get originalFileSize(): FileSize {
    return this._originalFileSize;
  }

  public get originalFilePath(): string {
    return this._originalFilePath;
  }

  public get mimeType(): string {
    return this._mimeType;
  }

  public get status(): ProcessingStatus {
    return this._status;
  }

  public get versions(): ReadonlyMap<ImageVersionType, ImageVersion> {
    return new Map(this._versions);
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get metadata(): ReadonlyMap<string, string> {
    return new Map(this._metadata);
  }

  public get brandContext(): BrandContext | null {
    return this._brandContext;
  }

  public get productContext(): ProductContext | null {
    return this._productContext;
  }

  public get isCompleted(): boolean {
    return this._status.isCompleted;
  }

  public get isFailed(): boolean {
    return this._status.isFailed;
  }

  public get isPending(): boolean {
    return this._status.isPending;
  }

  public get isProcessing(): boolean {
    return this._status.isProcessing;
  }

  /**
   * Actualiza el estado del trabajo y genera un evento de dominio.
   */
  public updateStatus(newStatus: ProcessingStatus): ImageJobStatusChangedEvent | null {
    if (this._status.equals(newStatus)) {
      return null;
    }

    const previousStatus = this._status;
    (this as { _status: ProcessingStatus })._status = newStatus;
    (this as { _updatedAt: Date })._updatedAt = new Date();

    return new ImageJobStatusChangedEvent({
      aggregateId: this._id,
      previousStatus: previousStatus.value,
      newStatus: newStatus.value,
      timestamp: new Date(),
    });
  }

  /**
   * Añade una versión procesada al trabajo.
   */
  public addVersion(version: ImageVersion): void {
    if (this._versions.has(version.type)) {
      throw new DomainError(`Ya existe una versión de tipo ${version.type} en el trabajo`);
    }
    this._versions.set(version.type, version);
    (this as { _updatedAt: Date })._updatedAt = new Date();
  }

  /**
   * Obtiene una versión específica del trabajo.
   */
  public getVersion(type: ImageVersionType): ImageVersion | undefined {
    return this._versions.get(type);
  }

  /**
   * Convierte la entidad a un objeto plano para persistencia.
   */
  public toPersistence(): ImageJobPersistenceProps {
    return {
      id: this._id.value,
      file_name: this._fileName.value,
      original_file_size: this._originalFileSize.value,
      original_file_path: this._originalFilePath,
      mime_type: this._mimeType,
      status: this._status.value,
      versions: Array.from(this._versions.values()).map((v) => v.toPersistence()),
      created_at: this._createdAt,
      updated_at: this._updatedAt,
      metadata: Object.fromEntries(this._metadata),
      brand_context: this._brandContext,
      product_context: this._productContext,
    };
  }

  /**
   * Compara dos entidades por identidad.
   */
  public equals(other: ImageJob): boolean {
    return this._id.equals(other._id);
  }
}

// Constantes
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB

// Tipos
export interface ImageJobConstructorProps {
  id: ImageJobId;
  fileName: FileName;
  originalFileSize: FileSize;
  originalFilePath: string;
  mimeType: string;
  status: ProcessingStatus;
  versions?: Array<[ImageVersionType, ImageVersion]>;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, string>;
  brandContext?: BrandContext | null;
  productContext?: ProductContext | null;
}

export interface ImageJobCreateProps {
  fileName: string;
  originalFilePath: string;
  originalFileSize?: number;
  mimeType: string;
  metadata?: Record<string, string>;
  brandContext?: BrandContext;
  productContext?: ProductContext;
}

export interface ImageJobPersistenceProps {
  id: string;
  file_name: string;
  original_file_size: number;
  original_file_path: string;
  mime_type: string;
  status: string;
  versions?: ImageVersionPersistenceProps[];
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, string>;
  brand_context?: BrandContext | null;
  product_context?: ProductContext | null;
}

export interface BrandContext {
  name: string;
  vertical: 'fashion' | 'electronics' | 'home' | 'other';
  tone: 'premium' | 'neutral' | 'mass-market';
  background?: string;
}

export interface ProductContext {
  id: string;
  category: string;
  attributes?: string[];
}
