/**
 * GET /api/admin/audit/export
 * Exporta los logs de auditoría en formato CSV o JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { container } from '@/infrastructure/di/container';
import { AuditLogRepository } from '@/core/domain/interfaces/audit-log.repository.interface';
import { DomainError } from '@/core/domain/errors/domain-error';
import { z } from 'zod';

/**
 * Schema de validación para exportación
 */
const exportSchema = z.object({
  format: z.enum(['csv', 'json']),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.array(z.enum(['SUCCESS', 'FAILED', 'PENDING'])).optional(),
  action: z.array(z.string()).optional(),
});

/**
 * Convierte un log a formato CSV
 */
const logToCsvRow = (log: {
  id: string;
  actor: { id: string; name: string; email: string };
  action: string;
  resourceType: string;
  resourceId: string;
  status: string;
  ip: string;
  timestamp: string;
  duration: number;
}): string => {
  const escapeCsv = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  return [
    escapeCsv(log.id),
    escapeCsv(log.actor.name),
    escapeCsv(log.actor.email),
    escapeCsv(log.action),
    escapeCsv(log.resourceType),
    escapeCsv(log.resourceId),
    escapeCsv(log.status),
    escapeCsv(log.ip),
    escapeCsv(log.timestamp),
    log.duration.toString(),
  ].join(',');
};

/**
 * GET /api/admin/audit/export
 * Exporta los logs de auditoría en el formato especificado
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

    // Validar parámetros
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validation = exportSchema.safeParse(searchParams);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { format, search, startDate, endDate, status, action } = validation.data;

    // Resolver dependencias
    const auditLogRepository = container.resolve<AuditLogRepository>('AuditLogRepository');

    // Obtener todos los logs que coinciden con los filtros (sin paginación para exportación completa)
    const { logs } = await auditLogRepository.findWithFilters({
      search,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status: status as ('SUCCESS' | 'FAILED' | 'PENDING')[] | undefined,
      action: action as string[] | undefined,
      limit: 10000, // Límite de exportación
      offset: 0,
    });

    // Transformar logs
    const data = logs.map((log) => ({
      id: log.id.value,
      actor: {
        id: log.actor.id.value,
        name: log.actor.name.value,
        email: log.actor.email.value,
      },
      action: log.action.value,
      resourceType: log.resourceType.value,
      resourceId: log.resourceId.value,
      status: log.status.value,
      ip: log.ip.value,
      timestamp: log.timestamp.toISOString(),
      duration: log.duration,
    }));

    // Generar respuesta según el formato
    if (format === 'csv') {
      // Generar CSV
      const headers = [
        'ID',
        'Actor Nombre',
        'Actor Email',
        'Acción',
        'Tipo Recurso',
        'ID Recurso',
        'Estado',
        'IP',
        'Timestamp',
        'Duración (ms)',
      ].join(',');

      const rows = data.map(logToCsvRow);
      const csv = [headers, ...rows].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      // Generar JSON
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }
  } catch (error) {
    console.error('Error al exportar logs de auditoría:', error);

    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
