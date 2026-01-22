import { DomainError } from './domain-error';

/**
 * Error thrown when an image job cannot be created due to invalid data.
 */
export class InvalidImageJobError extends DomainError {
  public readonly validationErrors: readonly string[];

  constructor(
    message: string,
    validationErrors: string[] = [],
    context: Record<string, unknown> = {},
  ) {
    super(message, {
      code: 'INVALID_IMAGE_JOB',
      context: {
        ...context,
        validationErrors,
      },
      isRecoverable: true,
    });

    this.validationErrors = Object.freeze([...validationErrors]);
    this.name = 'InvalidImageJobError';
  }

  /**
   * Returns a formatted string with all validation errors.
   */
  public getFullMessage(): string {
    if (this.validationErrors.length === 0) {
      return this.message;
    }

    const errorsList = this.validationErrors.map((e) => `  - ${e}`).join('\n');
    return `${message}\nValidation errors:\n${errorsList}`;
  }
}
