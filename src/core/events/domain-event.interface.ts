/**
 * Interfaz base para todos los eventos de dominio.
 * Los eventos de dominio representan algo significativo que ocurrió en el sistema.
 */
export interface DomainEvent {
  /**
   * Tipo único del evento.
   */
  readonly type: string;

  /**
   * Timestamp cuando ocurrió el evento.
   */
  readonly timestamp: Date;

  /**
   * Serializa el evento a un formato transportable.
   */
  toJSON(): Record<string, unknown>;
}

/**
 * Handler para procesar eventos de dominio.
 */
export interface DomainEventHandler<T extends DomainEvent> {
  /**
   * Tipo de evento que este handler puede procesar.
   */
  readonly eventType: string;

  /**
   * Procesa el evento.
   */
  handle(event: T): Promise<void> | void;
}

/**
 * Interfaz para el bus de eventos de dominio.
 */
export interface DomainEventBus {
  /**
   * Publica un evento.
   */
  publish<T extends DomainEvent>(event: T): Promise<void>;

  /**
   * Suscribe un handler a un tipo de evento.
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: DomainEventHandler<T>,
  ): void;

  /**
   * Desuscribe un handler.
   */
  unsubscribe<T extends DomainEvent>(
    eventType: string,
    handler: DomainEventHandler<T>,
  ): void;
}
