import { ValueObject } from '../interfaces/entity.interface';

/**
 * Objeto de valor que representa la resolución de una imagen.
 * Define el ancho y alto en píxeles.
 */
export class ImageResolution implements ValueObject<string> {
  private readonly _width: number;
  private readonly _height: number;

  private constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
  }

  /**
   * Factory method para crear una nueva resolución.
   */
  public static create(width: number, height: number): ImageResolution {
    if (!Number.isInteger(width) || width <= 0) {
      throw new Error(`Ancho de imagen inválido: ${width}`);
    }

    if (!Number.isInteger(height) || height <= 0) {
      throw new Error(`Alto de imagen inválido: ${height}`);
    }

    if (width > MAX_RESOLUTION_dimension) {
      throw new Error(`El ancho no puede exceder ${MAX_RESOLUTION_dimension} píxeles`);
    }

    if (height > MAX_RESOLUTION_dimension) {
      throw new Error(`El alto no puede exceder ${MAX_RESOLUTION_dimension} píxeles`);
    }

    return new ImageResolution(width, height);
  }

  /**
   * Crea una resolución cuadrada.
   */
  public static square(pixels: number): ImageResolution {
    return ImageResolution.create(pixels, pixels);
  }

  public get width(): number {
    return this._width;
  }

  public get height(): number {
    return this._height;
  }

  public get aspectRatio(): number {
    return this._width / this._height;
  }

  public get isSquare(): boolean {
    return this._width === this._height;
  }

  public get isLandscape(): boolean {
    return this._width > this._height;
  }

  public get isPortrait(): boolean {
    return this._height > this._width;
  }

  public get megapixels(): number {
    return (this._width * this._height) / (1000 * 1000);
  }

  public get value(): string {
    return `${this._width}x${this._height}`;
  }

  public equals(other: ImageResolution): boolean {
    return this._width === other._width && this._height === other._height;
  }

  public toString(): string {
    return this.value;
  }

  /**
   * Calcula las nuevas dimensiones manteniendo el aspect ratio.
   */
  public fitWithin(maxWidth: number, maxHeight: number): ImageResolution {
    const widthRatio = maxWidth / this._width;
    const heightRatio = maxHeight / this._height;
    const ratio = Math.min(widthRatio, heightRatio);

    const newWidth = Math.round(this._width * ratio);
    const newHeight = Math.round(this._height * ratio);

    // Asegurar que las dimensiones sean múltiplos de 2 (requerido por algunos códecs)
    return ImageResolution.create(newWidth - (newWidth % 2), newHeight - (newHeight % 2));
  }

  /**
   * Calcula las dimensiones para cover (rellenar) manteniendo el aspect ratio.
   */
  public cover(targetWidth: number, targetHeight: number): ImageResolution {
    const targetRatio = targetWidth / targetHeight;
    const sourceRatio = this._width / this._height;

    let newWidth: number;
    let newHeight: number;

    if (sourceRatio > targetRatio) {
      // Source is wider - fit by height
      newHeight = targetHeight;
      newWidth = Math.round(targetHeight * sourceRatio);
    } else {
      // Source is taller - fit by width
      newWidth = targetWidth;
      newHeight = Math.round(targetWidth / sourceRatio);
    }

    return ImageResolution.create(newWidth - (newWidth % 2), newHeight - (newHeight % 2));
  }

  /**
   * Verifica si esta resolución cabe dentro de otra.
   */
  public fitsWithin(other: ImageResolution): boolean {
    return this._width <= other._width && this._height <= other._height;
  }
}

const MAX_RESOLUTION_dimension = 16384; // 16K max per dimension
