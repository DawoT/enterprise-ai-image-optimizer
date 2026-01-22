import { DomainEvent } from './domain-event.interface';
import { ImageJobId } from '../domain/value-objects/image-job-id';

/**
 * Evento de dominio que se dispara cuando el estado de un trabajo cambia.
 */
export class ImageJobStatusChangedEvent implements DomainEvent {
  public readonly type = 'ImageJobStatusChanged';
  public readonly aggregateId: ImageJobId;
  public readonly previousStatus: string;
  public readonly newStatus: string;
  public readonly timestamp: Date;

  constructor(props: ImageJobStatusChangedEventProps) {
    this.aggregateId = props.aggregateId;
    this.previousStatus = props.previousStatus;
    this.newStatus = props.newStatus;
    this.timestamp = props.timestamp ?? new Date();
  }

  /**
   * Verifica si el trabajo cambió a un estado terminal.
   */
  public isTerminalEvent(): boolean {
    return this.newStatus === 'COMPLETED' || this.newStatus === 'FAILED';
  }

  /**
   * Verifica si el trabajo fue completado exitosamente.
   */
  public isSuccessfulCompletion(): boolean {
    return this.newStatus === 'COMPLETED';
  }

  /**
   * Verifica si el trabajo falló.
   */
  public isFailure(): boolean {
    return this.newStatus === 'FAILED';
  }

  /**
   * Serializa el evento para persistencia o transmisión.
   */
  public toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      aggregateId: this.aggregateId.value,
      previousStatus: this.previousStatus,
      newStatus: this.newStatus,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

interface ImageJobStatusChangedEventProps {
  aggregateId: ImageJobId;
  previousStatus: string;
  newStatus: string;
  timestamp?: Date;
}
