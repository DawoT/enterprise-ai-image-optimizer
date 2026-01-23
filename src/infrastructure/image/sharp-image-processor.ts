import sharp from 'sharp';
import {
  ImageProcessorPort,
  ImageProcessingOptions,
  ImageInfo,
} from '@/core/domain/interfaces/image-processor.port.interface';
import { DomainError } from '@/core/domain/errors/domain-error';

/**
 * Implementación del procesador de imágenes usando la librería Sharp.
 * Sharp es una librería de procesamiento de imágenes de alto rendimiento para Node.js.
 */
export class SharpImageProcessor implements ImageProcessorPort {
  private readonly defaultBackgroundColor = '#FFFFFF';

  /**
   * Procesa una imagen con las opciones especificadas.
   * Implementa Smart Crop cuando la IA proporciona coordenadas de extracción.
   */
  public async process(buffer: Buffer, options: ImageProcessingOptions): Promise<Buffer> {
    try {
      let pipeline = sharp(buffer);

      // Obtener información original de la imagen
      const metadata = await pipeline.metadata();
      const originalWidth = metadata.width ?? 0;
      const originalHeight = metadata.height ?? 0;

      // ========== SMART CROP: Extraer región si la IA lo sugiere ==========
      if (options.extractRegion) {
        // Convertir coordenadas normalizadas (0-1) a pixeles absolutos
        const cropLeft = Math.round(options.extractRegion.left * originalWidth);
        const cropTop = Math.round(options.extractRegion.top * originalHeight);
        const cropWidth = Math.round(options.extractRegion.width * originalWidth);
        const cropHeight = Math.round(options.extractRegion.height * originalHeight);

        // Asegurar que las coordenadas no excedan los límites de la imagen
        const safeLeft = Math.min(cropLeft, originalWidth - 1);
        const safeTop = Math.min(cropTop, originalHeight - 1);
        const safeWidth = Math.min(cropWidth, originalWidth - safeLeft);
        const safeHeight = Math.min(cropHeight, originalHeight - safeTop);

        // Asegurar dimensiones pares para evitar warnings de codec
        const evenWidth = safeWidth - (safeWidth % 2);
        const evenHeight = safeHeight - (safeHeight % 2);

        if (evenWidth > 0 && evenHeight > 0) {
          pipeline = pipeline.extract({
            left: safeLeft,
            top: safeTop,
            width: evenWidth,
            height: evenHeight,
          });
        }
      }

      // Calcular las nuevas dimensiones
      let resizeOptions: sharp.ResizeOptions = {};

      if (options.fitMode === 'contain') {
        // Mantener aspect ratio, asegurar que quepa dentro del área objetivo
        const { width, height } = this.calculateContainDimensions(
          originalWidth,
          originalHeight,
          options.targetWidth,
          options.targetHeight
        );
        resizeOptions = {
          width,
          height,
          fit: 'inside',
          background: this.parseBackgroundColor(
            options.backgroundColor ?? this.defaultBackgroundColor
          ),
        };
      } else if (options.fitMode === 'cover') {
        // Llenar el área objetivo, recortando si es necesario
        const { width, height } = this.calculateCoverDimensions(
          originalWidth,
          originalHeight,
          options.targetWidth,
          options.targetHeight
        );
        resizeOptions = {
          width,
          height,
          fit: 'cover',
          position: sharp.gravity.center,
          background: this.parseBackgroundColor(
            options.backgroundColor ?? this.defaultBackgroundColor
          ),
        };
      } else {
        // fill - forzar dimensiones exactas
        resizeOptions = {
          width: options.targetWidth,
          height: options.targetHeight,
          fit: 'fill',
        };
      }

      pipeline = pipeline.resize(resizeOptions);

      // Convertir al formato especificado
      pipeline = this.applyFormat(pipeline, options.format, options.quality);

      // Optimización adicional para WEBP
      if (options.format === 'WEBP') {
        pipeline = pipeline.webp({
          quality: options.quality,
          effort: 6, // Maximum compression effort
          lossless: false,
          nearLossless: false,
          alphaQuality: options.quality,
        });
      }

      // Para JPEG, aplicar optimización de subsampling
      if (options.format === 'JPG') {
        pipeline = pipeline.jpeg({
          quality: options.quality,
          progressive: true,
          mozjpeg: true,
        });
      }

      return await pipeline.toBuffer();
    } catch (error) {
      throw new DomainError('Error al procesar la imagen', {
        code: 'IMAGE_PROCESSING_ERROR',
        context: { error: String(error), options },
        isRecoverable: true,
      });
    }
  }

  /**
   * Comprime una imagen con la calidad especificada.
   */
  public async compress(
    buffer: Buffer,
    format: 'WEBP' | 'JPG' | 'PNG',
    quality: number
  ): Promise<Buffer> {
    try {
      let pipeline = sharp(buffer);

      pipeline = this.applyFormat(pipeline, format, quality);

      return await pipeline.toBuffer();
    } catch (error) {
      throw new DomainError('Error al comprimir la imagen', {
        code: 'COMPRESSION_ERROR',
        context: { error: String(error), format, quality },
        isRecoverable: true,
      });
    }
  }

  /**
   * Obtiene información de la imagen.
   */
  public async getInfo(buffer: Buffer): Promise<ImageInfo> {
    try {
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        format: metadata.format ?? 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha ?? false,
        colorSpace: metadata.space,
        density: metadata.density,
      };
    } catch (error) {
      throw new DomainError('Error al obtener información de la imagen', {
        code: 'IMAGE_INFO_ERROR',
        context: { error: String(error) },
        isRecoverable: false,
      });
    }
  }

  /**
   * Aplica el formato de salida especificado.
   */
  private applyFormat(
    pipeline: sharp.Sharp,
    format: 'WEBP' | 'JPG' | 'PNG',
    quality: number
  ): sharp.Sharp {
    switch (format) {
      case 'WEBP':
        return pipeline.webp({ quality });
      case 'JPG':
        return pipeline.jpeg({ quality, mozjpeg: true });
      case 'PNG':
        return pipeline.png({ quality });
      default:
        return pipeline;
    }
  }

  /**
   * Calcula las dimensiones para contener la imagen.
   */
  private calculateContainDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const ratio = Math.min(widthRatio, heightRatio);

    return {
      width: Math.round(originalWidth * ratio) - (Math.round(originalWidth * ratio) % 2),
      height: Math.round(originalHeight * ratio) - (Math.round(originalHeight * ratio) % 2),
    };
  }

  /**
   * Calcula las dimensiones para cubrir el área objetivo.
   */
  private calculateCoverDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth: number,
    targetHeight: number
  ): { width: number; height: number } {
    const targetRatio = targetWidth / targetHeight;
    const originalRatio = originalWidth / originalHeight;

    let width: number;
    let height: number;

    if (originalRatio > targetRatio) {
      // La imagen original es más ancha
      height = targetHeight;
      width = Math.round(targetHeight * originalRatio);
    } else {
      // La imagen original es más alta o igual
      width = targetWidth;
      height = Math.round(targetWidth / originalRatio);
    }

    return {
      width: width - (width % 2),
      height: height - (height % 2),
    };
  }

  /**
   * Parsea el color de fondo a formato RGBA.
   */
  private parseBackgroundColor(color: string): sharp.RgbaColor {
    // Si es un color hexadecimal
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      let r: number, g: number, b: number;

      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      } else {
        return { r: 255, g: 255, b: 255, alpha: 1 };
      }

      return { r, g, b, alpha: 1 };
    }

    // Color por defecto
    return { r: 255, g: 255, b: 255, alpha: 1 };
  }
}
