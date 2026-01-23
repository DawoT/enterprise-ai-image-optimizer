import { ValueObject } from '../interfaces/entity.interface';

/**
 * Objeto de valor que representa el nombre de un archivo.
 * Valida el formato y extensión del nombre de archivo.
 */
export class FileName implements ValueObject<string> {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Factory method para crear un nuevo FileName.
   */
  public static create(value: string): FileName {
    if (!value || value.trim().length === 0) {
      throw new Error('El nombre de archivo no puede estar vacío');
    }

    if (value.length > MAX_FILENAME_LENGTH) {
      throw new Error(`El nombre de archivo no puede exceder ${MAX_FILENAME_LENGTH} caracteres`);
    }

    if (!this.isValidFileName(value)) {
      throw new Error(`Nombre de archivo inválido: ${value}`);
    }

    return new FileName(value.trim());
  }

  /**
   * Valida el formato del nombre de archivo.
   */
  private static isValidFileName(value: string): boolean {
    // No permitir paths absolutos o relativos
    if (value.includes('/') || value.includes('\\')) {
      return false;
    }

    // No permitir directorios padre
    if (value.includes('..') || value.includes('.')) {
      // Permitir extensiones normales pero no ..
      if (value.includes('..')) {
        return false;
      }
    }

    // Caracteres válidos: letras, números, guiones, guiones bajos, puntos
    const validFilenameRegex = /^[a-zA-Z0-9_\-\.]+$/;
    if (!validFilenameRegex.test(value)) {
      return false;
    }

    // Debe tener extensión
    if (!value.includes('.')) {
      return false;
    }

    return true;
  }

  public get value(): string {
    return this._value;
  }

  public get extension(): string {
    const parts = this._value.split('.');
    return parts[parts.length - 1].toLowerCase();
  }

  public get nameWithoutExtension(): string {
    const lastDotIndex = this._value.lastIndexOf('.');
    return lastDotIndex > 0 ? this._value.substring(0, lastDotIndex) : this._value;
  }

  public equals(other: FileName): boolean {
    return this._value.toLowerCase() === other._value.toLowerCase();
  }

  public toString(): string {
    return this._value;
  }
}

const MAX_FILENAME_LENGTH = 255;
