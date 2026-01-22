import { ValueObject } from '../interfaces/entity.interface';

/**
 * Estados posibles para el procesamiento de un trabajo de imagen.
 */
export type ProcessingStatusType =
  | 'PENDING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * Objeto de valor que representa el estado de procesamiento de un trabajo.
 */
export class ProcessingStatus implements ValueObject<ProcessingStatusType> {
  private readonly _value: ProcessingStatusType;

  private constructor(value: ProcessingStatusType) {
    this._value = value;
  }

  /**
   * Factory methods para cada estado.
   */
  public static pending(): ProcessingStatus {
    return new ProcessingStatus('PENDING');
  }

  public static queued(): ProcessingStatus {
    return new ProcessingStatus('QUEUED');
  }

  public static processing(): ProcessingStatus {
    return new ProcessingStatus('PROCESSING');
  }

  public static completed(): ProcessingStatus {
    return new ProcessingStatus('COMPLETED');
  }

  public static failed(): ProcessingStatus {
    return new ProcessingStatus('FAILED');
  }

  public static cancelled(): ProcessingStatus {
    return new ProcessingStatus('CANCELLED');
  }

  /**
   * Crea un ProcessingStatus desde un string.
   */
  public static fromString(value: string): ProcessingStatus {
    const normalizedValue = value.toUpperCase() as ProcessingStatusType;

    if (!this.isValidStatus(normalizedValue)) {
      throw new Error(`Estado de procesamiento inválido: ${value}`);
    }

    return new ProcessingStatus(normalizedValue);
  }

  /**
   * Valida que el string sea un estado válido.
   */
  private static isValidStatus(value: string): value is ProcessingStatusType {
    const validStatuses: ProcessingStatusType[] = [
      'PENDING',
      'QUEUED',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
    ];
    return validStatuses.includes(value as ProcessingStatusType);
  }

  public get value(): ProcessingStatusType {
    return this._value;
  }

  public get isPending(): boolean {
    return this._value === 'PENDING';
  }

  public get isQueued(): boolean {
    return this._value === 'QUEUED';
  }

  public get isProcessing(): boolean {
    return this._value === 'PROCESSING';
  }

  public get isCompleted(): boolean {
    return this._value === 'COMPLETED';
  }

  public get isFailed(): boolean {
    return this._value === 'FAILED';
  }

  public get isCancelled(): boolean {
    return this._value === 'CANCELLED';
  }

  public get isTerminal(): boolean {
    return this._value === 'COMPLETED' || this._value === 'FAILED' || this._value === 'CANCELLED';
  }

  public get isActive(): boolean {
    return this._value === 'PROCESSING' || this._value === 'QUEUED';
  }

  /**
   * Transiciones de estado permitidas.
   */
  public canTransitionTo(newStatus: ProcessingStatus): boolean {
    const allowedTransitions: Record<ProcessingStatusType, ProcessingStatusType[]> = {
      PENDING: ['QUEUED', 'CANCELLED'],
      QUEUED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['COMPLETED', 'FAILED', 'CANCELLED'],
      COMPLETED: [],
      FAILED: ['PENDING'], // Retry allowed
      CANCELLED: ['PENDING'], // Restart allowed
    };

    return allowedTransitions[this._value].includes(newStatus._value);
  }

  public equals(other: ProcessingStatus): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }

  /**
   * Obtiene una descripción legible del estado.
   */
  public toHumanReadable(): string {
    const descriptions: Record<ProcessingStatusType, string> = {
      PENDING: 'Pendiente',
      QUEUED: 'En cola',
      PROCESSING: 'Procesando',
      COMPLETED: 'Completado',
      FAILED: 'Fallido',
      CANCELLED: 'Cancelado',
    };

    return descriptions[this._value];
  }
}
