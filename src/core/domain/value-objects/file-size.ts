import { ValueObject } from '../interfaces/entity.interface';

/**
 * Objeto de valor que representa el tamaño de un archivo en bytes.
 * Proporciona métodos convenientes para convertir a diferentes unidades.
 */
export class FileSize implements ValueObject<number> {
  private readonly _value: number;

  private constructor(value: number) {
    this._value = value;
  }

  /**
   * Factory method para crear un nuevo FileSize.
   */
  public static create(value: number): FileSize {
    if (value < 0) {
      throw new Error('El tamaño de archivo no puede ser negativo');
    }

    if (!Number.isFinite(value)) {
      throw new Error('El tamaño de archivo debe ser un número finito');
    }

    if (!Number.isInteger(value)) {
      throw new Error('El tamaño de archivo debe ser un número entero');
    }

    return new FileSize(value);
  }

  public get value(): number {
    return this._value;
  }

  public get kilobytes(): number {
    return this._value / 1024;
  }

  public get megabytes(): number {
    return this._value / (1024 * 1024);
  }

  public get gigabytes(): number {
    return this._value / (1024 * 1024 * 1024);
  }

  public toFormattedString(): string {
    if (this._value < 1024) {
      return `${this._value} B`;
    } else if (this._value < 1024 * 1024) {
      return `${this.kilobytes.toFixed(2)} KB`;
    } else if (this._value < 1024 * 1024 * 1024) {
      return `${this.megabytes.toFixed(2)} MB`;
    } else {
      return `${this.gigabytes.toFixed(2)} GB`;
    }
  }

  public isGreaterThan(other: FileSize): boolean {
    return this._value > other._value;
  }

  public isLessThan(other: FileSize): boolean {
    return this._value < other._value;
  }

  public isWithinLimit(limitBytes: number): boolean {
    return this._value <= limitBytes;
  }

  public equals(other: FileSize): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value.toString();
  }

  /**
   * Crea un FileSize desde una cadena formateada (ej: "1.5 MB").
   */
  public static fromFormattedString(formatted: string): FileSize {
    const match = formatted.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);

    if (!match) {
      throw new Error(`Formato de tamaño inválido: ${formatted}`);
    }

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();

    let bytes = value;
    switch (unit) {
      case 'B':
        bytes = value;
        break;
      case 'KB':
        bytes = value * 1024;
        break;
      case 'MB':
        bytes = value * 1024 * 1024;
        break;
      case 'GB':
        bytes = value * 1024 * 1024 * 1024;
        break;
      case 'TB':
        bytes = value * 1024 * 1024 * 1024 * 1024;
        break;
    }

    return FileSize.create(Math.round(bytes));
  }
}
