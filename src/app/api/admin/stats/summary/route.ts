/**
 * GET /api/admin/stats/summary
 * Obtiene el resumen de estadísticas del sistema
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { container } from '@/infrastructure/di/container';
import { UserRepository } from '@/core/domain/interfaces/user.repository.interface';
import { ImageJobRepository } from '@/core/domain/interfaces/image-job.repository.interface';
import { DomainError } from '@/core/domain/errors/domain-error';

/**
 * GET /api/admin/stats/summary
 * Obtiene el resumen de estadísticas del sistema
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado', message: 'Debes iniciar sesión para acceder a este recurso' },
        { status: 401 }
      );
    }

    // Verificar rol de administrador
    const userRole = (session.user as { role?: string }).role;
    if (!userRole || !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json(
        {
          error: 'Prohibido',
          message: 'Se requiere rol de administrador para acceder a este recurso',
        },
        { status: 403 }
      );
    }

    // Resolver dependencias
    const userRepository = container.resolve<UserRepository>('UserRepository');
    const imageJobRepository = container.resolve<ImageJobRepository>('ImageJobRepository');

    // Calcular métricas en paralelo
    const [totalUsers, activeUsers, totalJobs, completedJobs, failedJobs] = await Promise.all([
      userRepository.count(),
      userRepository.countByStatus('ACTIVE'),
      imageJobRepository.count(),
      imageJobRepository.countByStatus('COMPLETED'),
      imageJobRepository.countByStatus('FAILED'),
    ]);

    // Calcular storage utilizado (simulado - implementar con S3/MinIO)
    const storageUsedBytes = 7516192768; // 7 GB - TODO: Obtener del servicio de storage

    // Calcular jobs de las últimas 24 horas
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const jobsLast24h = await imageJobRepository.countSince(yesterday);

    // Calcular tasa de éxito
    const totalProcessedJobs = completedJobs + failedJobs;
    const successRate = totalProcessedJobs > 0 ? (completedJobs / totalProcessedJobs) * 100 : 100;

    // Tendencias (comparación con día anterior - simulado)
    const jobsTrend = 12.5; // +12.5%
    const storageTrend = 5.2; // +5.2%
    const successRateTrend = 0.8; // +0.8%

    return NextResponse.json({
      totalJobs24h: jobsLast24h,
      successRate: parseFloat(successRate.toFixed(1)),
      storageUsed: storageUsedBytes,
      activeUsers,
      jobsTrend,
      storageTrend,
      successRateTrend,
      details: {
        totalUsers,
        totalJobs,
        completedJobs,
        failedJobs,
        pendingJobs: totalJobs - completedJobs - failedJobs,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);

    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
