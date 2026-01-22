/**
 * Clase base para todos los errores del dominio.
 * Proporciona estructura consistente para errores de negocio.
 */
export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly isRecoverable: boolean;

  protected constructor(
    message: string,
    options: {
      code?: string;
      context?: Record<string, unknown>;
      isRecoverable?: boolean;
    } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code ?? 'DOMAIN_ERROR';
    this.context = options.context ?? {};
    this.timestamp = new Date();
    this.isRecoverable = options.isRecoverable ?? false;

    // Capturar el stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convierte el error a un formato serializable.
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      isRecoverable: this.isRecoverable,
      stack: this.stack,
    };
  }

  /**
   * Crea una instancia desde datos serializados.
   */
  public static fromJSON(data: Record<string, unknown>): DomainError {
    const error = new Error(data.message as string);
    error.name = data.name as string;
    error.stack = data.stack as string;

    const domainError = Object.create(DomainError.prototype);
    Object.assign(domainError, {
      code: data.code,
      context: data.context,
      timestamp: new Date(data.timestamp as string),
      isRecoverable: data.isRecoverable,
    });

    return domainError;
  }
}
