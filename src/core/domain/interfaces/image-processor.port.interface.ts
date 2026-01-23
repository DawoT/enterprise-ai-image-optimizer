/**
 * Puerto para el procesamiento de imágenes.
 * Define las operaciones disponibles para manipular imágenes.
 */
export interface ImageProcessorPort {
  /**
   * Procesa una imagen con las configuraciones especificadas.
   */
  process(buffer: Buffer, options: ImageProcessingOptions): Promise<Buffer>;

  /**
   * Comprime una imagen con la calidad especificada.
   */
  compress(buffer: Buffer, format: 'WEBP' | 'JPG' | 'PNG', quality: number): Promise<Buffer>;

  /**
   * Obtiene información de la imagen.
   */
  getInfo(buffer: Buffer): Promise<ImageInfo>;
}

/**
 * Opciones para el procesamiento de imagen.
 */
export interface ImageProcessingOptions {
  targetWidth: number;
  targetHeight: number;
  format: 'WEBP' | 'JPG' | 'PNG';
  quality: number;
  fitMode: 'contain' | 'cover' | 'fill';
  backgroundColor?: string;
  /**
   * Región de extracción (crop) sugerida por la IA.
   * Si está presente, Sharp extraerá esta región antes de redimensionar.
   * Valores normalizados entre 0 y 1 (proporcionales al tamaño original).
   */
  extractRegion?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

/**
 * Información de una imagen.
 */
export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  colorSpace?: string;
  density?: number;
}
