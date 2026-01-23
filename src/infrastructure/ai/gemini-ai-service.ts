import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIAnalysisService,
  AIAnalysisContext,
  AIAnalysisResult,
} from '@/core/domain/interfaces/ai-analysis-service.interface';
import { DomainError } from '@/core/domain/errors/domain-error';

/**
 * Implementación del servicio de análisis de IA usando Google Gemini.
 * Utiliza la API de Gemini para analizar imágenes y generar prompts enterprise.
 */
export class GeminiAIService implements AIAnalysisService {
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;
  private readonly generationConfig: {
    maxOutputTokens: number;
    temperature: number;
    topP: number;
    topK: number;
  };

  constructor(config: GeminiAIServiceConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model ?? 'gemini-1.5-pro';
    this.generationConfig = {
      maxOutputTokens: config.maxOutputTokens ?? 2048,
      temperature: config.temperature ?? 0.1,
      topP: config.topP ?? 0.8,
      topK: config.topK ?? 40,
    };
  }

  /**
   * Analiza una imagen y genera metadata y sugerencias.
   */
  public async analyze(imageBuffer: Buffer, context: AIAnalysisContext): Promise<AIAnalysisResult> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: this.generationConfig,
      });

      // Convertir buffer a base64
      const base64Image = imageBuffer.toString('base64');
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: this.detectMimeType(imageBuffer),
        },
      };

      // Construir el prompt de análisis
      const analysisPrompt = this.buildAnalysisPrompt(context);

      // Generar contenido
      const result = await model.generateContent([analysisPrompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Parsear la respuesta
      return this.parseAnalysisResult(text);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      throw new DomainError('Error al analizar la imagen con IA', {
        code: 'AI_ANALYSIS_ERROR',
        context: { error: String(error), context },
        isRecoverable: true,
      });
    }
  }

  /**
   * Genera un prompt optimizado para la imagen.
   */
  public async generatePrompt(imageBuffer: Buffer, context: AIAnalysisContext): Promise<string> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: this.generationConfig,
      });

      const base64Image = imageBuffer.toString('base64');
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: this.detectMimeType(imageBuffer),
        },
      };

      const prompt = this.buildPromptGenerationPrompt(context);

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;

      return response.text().trim();
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      throw new DomainError('Error al generar el prompt', {
        code: 'PROMPT_GENERATION_ERROR',
        context: { error: String(error) },
        isRecoverable: true,
      });
    }
  }

  /**
   * Verifica la disponibilidad del servicio.
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: this.model });
      // Intentar obtener la configuración del modelo
      await model.getGenerationConfig();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detecta el tipo MIME de una imagen basándose en sus bytes.
   */
  private detectMimeType(buffer: Buffer): string {
    const signatures: Record<string, Buffer> = {
      'image/jpeg': Buffer.from([0xff, 0xd8, 0xff]),
      'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      'image/webp': Buffer.from([0x52, 0x49, 0x46, 0x46]),
      'image/gif': Buffer.from([0x47, 0x49, 0x46, 0x38]),
    };

    for (const [mimeType, signature] of Object.entries(signatures)) {
      if (buffer.slice(0, signature.length).equals(signature)) {
        return mimeType;
      }
    }

    return 'application/octet-stream';
  }

  /**
   * Construye el prompt para análisis de imagen.
   */
  private buildAnalysisPrompt(context: AIAnalysisContext): string {
    const parts: string[] = [
      `Analyze this product image for ecommerce optimization.`,
      ``,
      `Context:`,
    ];

    if (context.brandContext) {
      parts.push(`- Brand: ${context.brandContext.name}`);
      parts.push(`- Vertical: ${context.brandContext.vertical}`);
      parts.push(`- Tone: ${context.brandContext.tone}`);
    }

    if (context.productContext) {
      parts.push(`- Product ID: ${context.productContext.id}`);
      parts.push(`- Category: ${context.productContext.category}`);
      if (context.productContext.attributes) {
        parts.push(`- Attributes: ${context.productContext.attributes.join(', ')}`);
      }
    }

    parts.push(``);
    parts.push(`Provide analysis in JSON format with the following structure:`);
    parts.push(`{`);
    parts.push(`  "detectedObjects": ["object1", "object2"],`);
    parts.push(`  "suggestedCrop": { "x": 0, "y": 0, "width": 100, "height": 100 },`);
    parts.push(`  "qualityScore": 85,`);
    parts.push(`  "dominantColors": ["#color1", "#color2"],`);
    parts.push(`  "tags": ["tag1", "tag2"],`);
    parts.push(`  "description": "brief description",`);
    parts.push(`  "issues": [`);
    parts.push(
      `    { "type": "issueType", "severity": "low", "message": "description", "suggestion": "fix" }`
    );
    parts.push(`  ]`);
    parts.push(`}`);

    return parts.join('\n');
  }

  /**
   * Construye el prompt para generación de prompts enterprise.
   */
  private buildPromptGenerationPrompt(context: AIAnalysisContext): string {
    const parts: string[] = [
      `Generate an enterprise ecommerce prompt for this product image.`,
      ``,
      `The prompt should follow these constraints:`,
      `- Aspect ratio: 1:1 (square)`,
      `- Professional ecommerce standard`,
      `- Preserve product integrity`,
      `- No creative changes to the product`,
      `- Describe product, material, lighting, and composition`,
      ``,
    ];

    if (context.brandContext) {
      parts.push(`Brand tone: ${context.brandContext.tone}`);
      parts.push(`Background preference: ${context.brandContext.background ?? 'pure-white'}`);
    }

    parts.push(``);
    parts.push(`Return ONLY the prompt text, no JSON.`);

    return parts.join('\n');
  }

  /**
   * Parsea el resultado del análisis desde JSON.
   */
  private parseAnalysisResult(text: string): AIAnalysisResult {
    try {
      // Limpiar el texto de posibles bloques de código
      const cleanedText = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanedText);

      return {
        prompt: '', // Se genera separadamente si es necesario
        detectedObjects: parsed.detectedObjects ?? [],
        suggestedCrop: parsed.suggestedCrop,
        qualityScore: parsed.qualityScore ?? 50,
        dominantColors: parsed.dominantColors,
        tags: parsed.tags,
        description: parsed.description,
        issues: parsed.issues,
      };
    } catch {
      // Si no se puede parsear, retornar resultado básico
      return {
        prompt: '',
        detectedObjects: [],
        qualityScore: 50,
        issues: [
          {
            type: 'composition',
            severity: 'low',
            message: 'Could not parse AI analysis response',
            suggestion: 'Manual review recommended',
          },
        ],
      };
    }
  }
}

interface GeminiAIServiceConfig {
  apiKey: string;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}
