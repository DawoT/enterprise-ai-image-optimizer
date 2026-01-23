import { ValueObject } from '../interfaces/entity.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Objeto de valor que representa la identidad única de un trabajo de imagen.
 * Utiliza UUID v4 para garantizar unicidad global.
 */
export class ImageJobId implements ValueObject<string> {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Factory method para crear un nuevo ImageJobId.
   */
  public static create(value?: string): ImageJobId {
    const id = value ?? uuidv4();

    if (!this.isValidUUID(id)) {
      throw new Error(`Invalid ImageJobId format: ${id}`);
    }

    return new ImageJobId(id);
  }

  /**
   * Valida que el string sea un UUID válido.
   */
  private static isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: ImageJobId): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
