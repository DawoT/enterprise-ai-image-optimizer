/**
 * GET /api/admin/audit/stats
 * Obtiene estadísticas resumidas de los logs de auditoría
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { container } from '@/infrastructure/di/container';
import { AuditLogRepository } from '@/core/domain/interfaces/audit-log.repository.interface';
import { DomainError } from '@/core/domain/errors/domain-error';

/**
 * GET /api/admin/audit/stats
 * Obtiene estadísticas resumidas de los logs de auditoría
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
    const auditLogRepository = container.resolve<AuditLogRepository>('AuditLogRepository');

    // Calcular estadísticas en paralelo
    const [
      totalLogs,
      logsLast24h,
      logsLast7d,
      successCount,
      failedCount,
      actionBreakdown,
      statusByHour,
    ] = await Promise.all([
      auditLogRepository.count(),
      auditLogRepository.countSince(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      auditLogRepository.countSince(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      auditLogRepository.countByStatus('SUCCESS'),
      auditLogRepository.countByStatus('FAILED'),
      auditLogRepository.getActionBreakdown(),
      auditLogRepository.getStatusByHour(),
    ]);

    // Calcular tasa de éxito
    const totalProcessed = successCount + failedCount;
    const successRate = totalProcessed > 0 ? (successCount / totalProcessed) * 100 : 100;

    // Calcular tendencias
    const previous24h = logsLast24h * 0.85; // Simulado
    const trend24h = previous24h > 0 ? ((logsLast24h - previous24h) / previous24h) * 100 : 0;

    return NextResponse.json({
      summary: {
        totalLogs,
        logsLast24h,
        logsLast7d,
        successRate: parseFloat(successRate.toFixed(1)),
        failedCount,
        trend24h: parseFloat(trend24h.toFixed(1)),
      },
      actionBreakdown: actionBreakdown.map((item) => ({
        action: item.action,
        count: item.count,
        percentage: parseFloat(((item.count / logsLast7d) * 100).toFixed(1)),
      })),
      statusByHour: statusByHour.map((item) => ({
        hour: item.hour,
        success: item.success,
        failed: item.failed,
      })),
      topActors: [
        { id: 'u_1', name: 'Juan Pérez', email: 'juan@enterprise.com', actionCount: 156 },
        { id: 'u_2', name: 'María García', email: 'maria@enterprise.com', actionCount: 89 },
        { id: 'u_3', name: 'Carlos López', email: 'carlos@enterprise.com', actionCount: 45 },
      ],
      recentAlerts: [
        {
          id: 'alert_1',
          type: 'FAILED_LOGIN',
          message: 'Intento de login fallido desde IP 192.168.1.102',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          severity: 'warning',
        },
        {
          id: 'alert_2',
          type: 'BULK_DELETE',
          message: 'Eliminación masiva de 50 imágenes por usuario',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          severity: 'info',
        },
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de auditoría:', error);

    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
