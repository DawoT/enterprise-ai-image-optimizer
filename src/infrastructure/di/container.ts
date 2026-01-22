import { SharpImageProcessor } from '@/infrastructure/image/sharp-image-processor';
import { LocalStorageService } from '@/infrastructure/storage/local-storage-service';
import { ImageJobRepository } from '@/core/domain/interfaces/image-job.repository.interface';
import { ImageJob } from '@/core/domain/entities/image-job';

/**
 * Inicializa el contenedor de dependencias.
 * En producción, se debería usar una librería como Inversify o Awilix.
 */
class DependencyContainer {
  private readonly dependencies: Map<string, unknown> = new Map();
  private readonly singletons: Map<string, unknown> = new Map();

  /**
   * Registra una dependencia.
   */
  public register<T>(name: string, factory: () => T): void {
    this.dependencies.set(name, factory);
  }

  /**
   * Resuelve una dependencia.
   */
  public resolve<T>(name: string): T {
    // Verificar si es un singleton ya instanciado
    if (this.singletons.has(name)) {
      return this.singletons.get(name) as T;
    }

    // Verificar si la dependencia está registrada
    const factory = this.dependencies.get(name);
    if (!factory) {
      throw new Error(`Dependencia no registrada: ${name}`);
    }

    // Crear la instancia
    const instance = (factory as () => T)();

    // Si es un singleton, guardarlo
    if (this.isSingleton(name)) {
      this.singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * Verifica si una dependencia es un singleton.
   */
  private isSingleton(name: string): boolean {
    const singletonDependencies = [
      'ImageProcessor',
      'StorageService',
      'ImageJobRepository',
      'EventBus',
    ];
    return singletonDependencies.includes(name);
  }

  /**
   * Limpia todas las dependencias (útil para testing).
   */
  public clear(): void {
    this.dependencies.clear();
    this.singletons.clear();
  }
}

// Exportar una instancia única del contenedor
export const container = new DependencyContainer();

// Registrar las dependencias principales
function initializeContainer(): void {
  // Procesador de imágenes (Sharp)
  container.register<SharpImageProcessor>(
    'ImageProcessor',
    () => new SharpImageProcessor(),
  );

  // Servicio de almacenamiento (local)
  container.register<LocalStorageService>(
    'StorageService',
    () =>
      new LocalStorageService({
        baseDir: process.env.LOCAL_STORAGE_PATH ?? './storage',
        baseUrl: `${process.env.APP_URL ?? 'http://localhost:3000'}/storage`,
      }),
  );

  // Repositorio de trabajos (en memoria para desarrollo)
  container.register<ImageJobRepository>(
    'ImageJobRepository',
    () => new InMemoryImageJobRepository(),
  );

  // Servicio de IA (Gemini) - opcional
  if (process.env.GEMINI_API_KEY) {
    const { GeminiAIService } = require('@/infrastructure/ai/gemini-ai-service');
    container.register(
      'AIAnalysisService',
      () =>
        new GeminiAIService({
          apiKey: process.env.GEMINI_API_KEY,
          model: process.env.GEMINI_MODEL,
          temperature: parseFloat(process.env.AI_TEMPERATURE ?? '0.1'),
        }),
    );
  }

  // Bus de eventos (en memoria)
  container.register('EventBus', () => new InMemoryEventBus());
}

// Inicializar el contenedor
initializeContainer();

/**
 * Implementación en memoria del repositorio de trabajos.
 * Para producción, usar Prisma con PostgreSQL.
 */
class InMemoryImageJobRepository implements ImageJobRepository {
  private readonly jobs: Map<string, ImageJob> = new Map();

  async save(entity: ImageJob): Promise<ImageJob> {
    this.jobs.set(entity.id.value, entity);
    return entity;
  }

  async findById(id: ImageJob['id']): Promise<ImageJob | null> {
    return this.jobs.get(id.value) ?? null;
  }

  async findAll(): Promise<ImageJob[]> {
    return Array.from(this.jobs.values());
  }

  async delete(id: ImageJob['id']): Promise<void> {
    this.jobs.delete(id.value);
  }

  async exists(id: ImageJob['id']): Promise<boolean> {
    return this.jobs.has(id.value);
  }

  async findByStatus(status: ImageJob['status']): Promise<ImageJob[]> {
    return Array.from(this.jobs.values()).filter((job) =>
      job.status.equals(status),
    );
  }

  async findPending(): Promise<ImageJob[]> {
    return Array.from(this.jobs.values()).filter((job) =>
      job.status.isPending,
    );
  }

  async findByFileName(fileName: string): Promise<ImageJob[]> {
    return Array.from(this.jobs.values()).filter((job) =>
      job.fileName.value.includes(fileName),
    );
  }

  async updateStatus(
    id: ImageJob['id'],
    status: ImageJob['status'],
  ): Promise<ImageJob> {
    const job = await this.findById(id);
    if (!job) {
      throw new Error(`Trabajo no encontrado: ${id.value}`);
    }
    job.updateStatus(status);
    return job;
  }

  async getStats(): Promise<{
    totalJobs: number;
    pendingJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageProcessingTimeMs: number;
  }> {
    const jobs = Array.from(this.jobs.values());
    const completed = jobs.filter((j) => j.status.isCompleted);

    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter((j) => j.status.isPending).length,
      processingJobs: jobs.filter((j) => j.status.isProcessing).length,
      completedJobs: completed.length,
      failedJobs: jobs.filter((j) => j.status.isFailed).length,
      averageProcessingTimeMs: 0, // TODO: Implementar tracking de tiempo
    };
  }
}

/**
 * Implementación en memoria del bus de eventos.
 */
class InMemoryEventBus {
  private readonly handlers: Map<string, Array<(event: unknown) => Promise<void>>> =
    new Map();

  async publish<T>(event: T): Promise<void> {
    const eventType = (event as { type: string }).type;
    const handlers = this.handlers.get(eventType) ?? [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Error en handler de evento ${eventType}:`, error);
      }
    }
  }

  subscribe<T>(eventType: string, handler: (event: T) => Promise<void>): void {
    const handlers = this.handlers.get(eventType) ?? [];
    handlers.push(handler as (event: unknown) => Promise<void>);
    this.handlers.set(eventType, handlers);
  }

  unsubscribe<T>(eventType: string, handler: (event: T) => Promise<void>): void {
    const handlers = this.handlers.get(eventType) ?? [];
    const index = handlers.indexOf(handler as (event: unknown) => Promise<void>);
    if (index > -1) {
      handlers.splice(index, 1);
      this.handlers.set(eventType, handlers);
    }
  }
}
