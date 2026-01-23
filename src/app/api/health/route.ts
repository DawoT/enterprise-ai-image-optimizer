import { NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/container';

/**
 * GET /api/health
 * Verifica el estado de salud del sistema.
 */
export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    environment: process.env.NODE_ENV ?? 'development',
    services: {
      imageProcessor: false,
      storage: false,
      aiService: false,
      database: false,
    },
  };

  // Verificar procesador de imágenes
  try {
    const imageProcessor = container.resolve('ImageProcessor');
    health.services.imageProcessor = true;
  } catch {
    health.services.imageProcessor = false;
  }

  // Verificar servicio de almacenamiento
  try {
    const storageService = container.resolve('StorageService');
    health.services.storage = true;
  } catch {
    health.services.storage = false;
  }

  // Verificar servicio de IA
  try {
    const aiService = container.resolve('AIAnalysisService');
    if (aiService && typeof aiService.isAvailable === 'function') {
      health.services.aiService = await aiService.isAvailable();
    } else {
      health.services.aiService = true;
    }
  } catch {
    health.services.aiService = false;
  }

  // Determinar estado general
  const allServicesHealthy = Object.values(health.services).every((s) => s === true);
  health.status = allServicesHealthy ? 'ok' : 'degraded';

  const statusCode = health.status === 'ok' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
