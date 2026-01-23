/**
 * AuditLogTable Component
 * Enterprise AI Image Optimizer - Admin Dashboard
 * Table component for displaying audit logs with sorting and interaction
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Actor de un log de auditoría
 */
interface AuditActor {
  id: string;
  name: string;
  email: string;
}

/**
 * Log de auditoría
 */
interface AuditLog {
  id: string;
  actor: AuditActor;
  action: string;
  resourceType: string;
  resourceId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  ip: string;
  timestamp: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

/**
 * Props del componente AuditLogTable
 */
interface AuditLogTableProps {
  /** Lista de logs a mostrar */
  logs: AuditLog[];
  /** Función al seleccionar un log para ver detalles */
  onViewDetail?: (log: AuditLog) => void;
  /** Habilitar ordenación */
  sortable?: boolean;
  /** Columna ordenada actualmente */
  sortColumn?: string;
  /** Dirección de ordenación */
  sortDirection?: 'asc' | 'desc';
  /** Callback de ordenación */
  onSort?: (column: string) => void;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Obtiene el color del badge según el estado
 */
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    SUCCESS: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    FAILED: 'bg-red-100 text-red-700 border-red-200',
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return colors[status] || colors.PENDING;
};

/**
 * Obtiene el nombre display del estado
 */
const getStatusName = (status: string): string => {
  const names: Record<string, string> = {
    SUCCESS: 'Éxito',
    FAILED: 'Fallo',
    PENDING: 'Pendiente',
  };
  return names[status] || status;
};

/**
 * Formatea la acción para mostrar
 */
const formatAction = (action: string): string => {
  return action
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Formatea la fecha y hora
 */
const formatTimestamp = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Componente AuditLogTable
 * Tabla para visualizar logs de auditoría
 */
export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  logs,
  onViewDetail,
  sortable = false,
  sortColumn,
  sortDirection,
  onSort,
  className,
}) => {
  /**
   * Maneja el clic en el encabezado para ordenar
   */
  const handleSort = (column: string): void => {
    if (sortable && onSort) {
      onSort(column);
    }
  };

  /**
   * Renderiza el indicador de ordenación
   */
  const renderSortIcon = (column: string): React.ReactNode => {
    if (sortColumn !== column) {
      return (
        <svg
          className="h-4 w-4 text-slate-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  /**
   * Renderiza el skeleton de carga
   */
  const renderSkeleton = (): React.ReactNode => {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            data-testid="audit-row-skeleton"
            className="flex animate-pulse items-center gap-4 p-3"
          >
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="h-4 w-20 rounded bg-slate-200" />
            <div className="h-4 w-16 rounded bg-slate-200" />
            <div className="h-4 w-16 rounded bg-slate-200" />
            <div className="h-4 w-12 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  };

  // Si no hay logs, no renderizar nada
  if (logs.length === 0) {
    return null;
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[900px]">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th
              className={cn(
                'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500',
                sortable && 'cursor-pointer hover:bg-slate-100'
              )}
              onClick={() => handleSort('timestamp')}
              aria-sort={sortColumn === 'timestamp' ? sortDirection : undefined}
            >
              <div className="flex items-center gap-1">
                Timestamp
                {sortable && renderSortIcon('timestamp')}
              </div>
            </th>
            <th
              className={cn(
                'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500',
                sortable && 'cursor-pointer hover:bg-slate-100'
              )}
              onClick={() => handleSort('actor')}
            >
              <div className="flex items-center gap-1">
                Actor
                {sortable && renderSortIcon('actor')}
              </div>
            </th>
            <th
              className={cn(
                'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500',
                sortable && 'cursor-pointer hover:bg-slate-100'
              )}
              onClick={() => handleSort('action')}
            >
              <div className="flex items-center gap-1">
                Acción
                {sortable && renderSortIcon('action')}
              </div>
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 lg:table-cell">
              Recurso
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 xl:table-cell">
              IP
            </th>
            <th
              className={cn(
                'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500',
                sortable && 'cursor-pointer hover:bg-slate-100'
              )}
              onClick={() => handleSort('status')}
            >
              <div className="flex items-center gap-1">
                Estado
                {sortable && renderSortIcon('status')}
              </div>
            </th>
            <th
              className={cn(
                'hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 md:table-cell',
                sortable && 'cursor-pointer hover:bg-slate-100'
              )}
              onClick={() => handleSort('duration')}
            >
              <div className="flex items-center gap-1">
                Duración
                {sortable && renderSortIcon('duration')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {logs.map((log) => (
            <tr
              key={log.id}
              className={cn(
                'cursor-pointer transition-colors hover:bg-slate-50',
                onViewDetail && 'select-none'
              )}
              onClick={() => onViewDetail?.(log)}
              role="row"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onViewDetail?.(log);
                }
              }}
            >
              {/* Timestamp */}
              <td className="whitespace-nowrap px-4 py-3">
                <span className="font-mono text-sm text-slate-600">
                  {formatTimestamp(log.timestamp)}
                </span>
              </td>

              {/* Actor */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-medium text-white">
                    {log.actor.name
                      .split(' ')
                      .map((word) => word[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{log.actor.name}</p>
                    <p className="text-xs text-slate-500">{log.actor.email}</p>
                  </div>
                </div>
              </td>

              {/* Acción */}
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {formatAction(log.action)}
                </span>
              </td>

              {/* Recurso */}
              <td className="hidden px-4 py-3 lg:table-cell">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-900">{log.resourceType}</span>
                  <span className="max-w-[150px] truncate font-mono text-xs text-slate-500">
                    {log.resourceId}
                  </span>
                </div>
              </td>

              {/* IP */}
              <td className="hidden px-4 py-3 xl:table-cell">
                <span className="font-mono text-sm text-slate-600">{log.ip}</span>
              </td>

              {/* Estado */}
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    getStatusColor(log.status)
                  )}
                >
                  {getStatusName(log.status)}
                </span>
              </td>

              {/* Duración */}
              <td className="hidden px-4 py-3 md:table-cell">
                <span className="text-sm text-slate-600">{log.duration}ms</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLogTable;
