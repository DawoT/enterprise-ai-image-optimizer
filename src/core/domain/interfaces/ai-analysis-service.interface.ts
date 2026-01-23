/**
 * Puerto para el servicio de análisis de IA.
 * Define las operaciones para analizar y mejorar imágenes usando IA.
 */
export interface AIAnalysisService {
  /**
   * Analiza una imagen y genera metadata y sugerencias.
   */
  analyze(imageBuffer: Buffer, context: AIAnalysisContext): Promise<AIAnalysisResult>;

  /**
   * Genera un prompt optimizado para la imagen.
   */
  generatePrompt(imageBuffer: Buffer, context: AIAnalysisContext): Promise<string>;

  /**
   * Verifica la disponibilidad del servicio.
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Contexto para el análisis de IA.
 */
export interface AIAnalysisContext {
  brandContext?: {
    name: string;
    vertical: 'fashion' | 'electronics' | 'home' | 'other';
    tone: 'premium' | 'neutral' | 'mass-market';
    background?: string;
  };
  productContext?: {
    id: string;
    category: string;
    attributes?: string[];
  };
}

/**
 * Resultado del análisis de IA.
 */
export interface AIAnalysisResult {
  /**
   * Prompt generado para la imagen.
   */
  prompt: string;

  /**
   * Objetos detectados en la imagen.
   */
  detectedObjects: string[];

  /**
   * Sugerencia de recorte (bounding box).
   */
  suggestedCrop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /**
   * Puntuación de calidad de la imagen (0-100).
   */
  qualityScore: number;

  /**
   * Colores dominantes detectados.
   */
  dominantColors?: string[];

  /**
   * Etiquetas generadas automáticamente.
   */
  tags?: string[];

  /**
   * Descripción textual de la imagen.
   */
  description?: string;

  /**
   * Errores o advertencias detectados.
   */
  issues?: AIImageIssue[];
}

/**
 * Problema detectado en la imagen.
 */
export interface AIImageIssue {
  type: 'noise' | 'blur' | 'lighting' | 'background' | 'composition';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
}
