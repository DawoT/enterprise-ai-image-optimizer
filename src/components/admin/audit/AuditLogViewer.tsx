/**
 * AuditLogViewer Component
 * Enterprise AI Image Optimizer - Admin Dashboard
 * Main container for audit log visualization with filtering and pagination
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AuditLogTable } from './AuditLogTable';
import { AuditDetailDrawer } from './AuditDetailDrawer';

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
  userAgent?: string;
  requestHeaders?: Record<string, string>;
  responseBody?: Record<string, unknown>;
  errorStack?: string;
}

/**
 * Configuración de filtros
 */
interface AuditFilters {
  search: string;
  startDate: string;
  endDate: string;
  status: string[];
  action: string[];
}

/**
 * Configuración de paginación
 */
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Props del componente AuditLogViewer
 */
interface AuditLogViewerProps {
  /** Lista de logs a mostrar */
  logs: AuditLog[];
  /** Indica si está cargando datos */
  isLoading?: boolean;
  /** Configuración de paginación */
  pagination: Pagination;
  /** Filtros activos */
  filters: AuditFilters;
  /** Callback al cambiar de página */
  onPageChange: (page: number) => void;
  /** Callback al cambiar filtros */
  onFilterChange: (filters: AuditFilters) => void;
  /** Callback al exportar logs */
  onExport: (format: 'csv' | 'json') => void;
  /** Callback al ver detalles de un log */
  onViewDetail: (log: AuditLog) => void;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Acciones disponibles para filtrar
 */
const actionOptions = [
  { value: 'USER_LOGIN', label: 'Inicio de Sesión' },
  { value: 'USER_LOGOUT', label: 'Cierre de Sesión' },
  { value: 'USER_CREATE', label: 'Crear Usuario' },
  { value: 'USER_UPDATE', label: 'Actualizar Usuario' },
  { value: 'USER_DELETE', label: 'Eliminar Usuario' },
  { value: 'IMAGE_UPLOAD', label: 'Subir Imagen' },
  { value: 'IMAGE_DELETE', label: 'Eliminar Imagen' },
  { value: 'IMAGE_PROCESS', label: 'Procesar Imagen' },
  { value: 'CONFIG_UPDATE', label: 'Actualizar Configuración' },
  { value: 'WEBHOOK_CREATE', label: 'Crear Webhook' },
  { value: 'WEBHOOK_DELETE', label: 'Eliminar Webhook' },
];

/**
 * Opciones de estado
 */
const statusOptions = [
  { value: 'SUCCESS', label: 'Éxito', color: 'bg-emerald-500' },
  { value: 'FAILED', label: 'Fallo', color: 'bg-red-500' },
  { value: 'PENDING', label: 'Pendiente', color: 'bg-amber-500' },
];

/**
 * Límites de paginación disponibles
 */
const limitOptions = [10, 20, 50, 100];

/**
 * Componente AuditLogViewer
 * Contenedor principal para el visor de logs de auditoría
 */
export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  logs,
  isLoading = false,
  pagination,
  filters,
  onPageChange,
  onFilterChange,
  onExport,
  onViewDetail,
  className,
}) => {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Maneja el cambio en la búsqueda con debounce
   */
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        onFilterChange({ ...filters, search: value });
      }, 300);
    },
    [filters, onFilterChange]
  );

  /**
   * Maneja el cambio de fecha
   */
  const handleDateChange = useCallback(
    (type: 'start' | 'end', value: string) => {
      onFilterChange({
        ...filters,
        [type === 'start' ? 'startDate' : 'endDate']: value,
      });
    },
    [filters, onFilterChange]
  );

  /**
   * Maneja el toggle de estado
   */
  const handleStatusToggle = useCallback(
    (status: string) => {
      const newStatus = filters.status.includes(status)
        ? filters.status.filter((s) => s !== status)
        : [...filters.status, status];
      onFilterChange({ ...filters, status: newStatus });
    },
    [filters, onFilterChange]
  );

  /**
   * Maneja el toggle de acción
   */
  const handleActionToggle = useCallback(
    (action: string) => {
      const newAction = filters.action.includes(action)
        ? filters.action.filter((a) => a !== action)
        : [...filters.action, action];
      onFilterChange({ ...filters, action: newAction });
    },
    [filters, onFilterChange]
  );

  /**
   * Limpia todos los filtros
   */
  const handleClearFilters = useCallback(() => {
    onFilterChange({
      search: '',
      startDate: '',
      endDate: '',
      status: [],
      action: [],
    });
  }, [onFilterChange]);

  /**
   * Maneja la exportación
   */
  const handleExport = useCallback(
    async (format: 'csv' | 'json') => {
      setIsExporting(true);
      setShowExportMenu(false);

      try {
        await onExport(format);
      } finally {
        setTimeout(() => setIsExporting(false), 1000);
      }
    },
    [onExport]
  );

  /**
   * Maneja la visualización de detalles
   */
  const handleViewDetail = useCallback(
    (log: AuditLog) => {
      setSelectedLog(log);
      setShowDetailDrawer(true);
      onViewDetail(log);
    },
    [onViewDetail]
  );

  /**
   * Cleanup del timeout
   */
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Verificar si hay filtros activos
  const hasActiveFilters =
    filters.search ||
    filters.startDate ||
    filters.endDate ||
    filters.status.length > 0 ||
    filters.action.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header con título y contador */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Logs de Auditoría</h1>
          <p className="mt-1 text-slate-500">{pagination.total} registros encontrados</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Menú de exportación */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isLoading || pagination.total === 0}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                isLoading || pagination.total === 0
                  ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {isExporting ? 'Exportando...' : 'Exportar'}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  <svg
                    className="h-4 w-4 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Exportar CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  <svg
                    className="h-4 w-4 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                  Exportar JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Buscar por usuario, IP o recurso..."
              defaultValue={filters.search}
              onChange={handleSearchChange}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>

          {/* Filtro de fecha */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              disabled={isLoading}
              className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            />
            <span className="text-slate-400">a</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
              disabled={isLoading}
              className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>

          {/* Filtro de estado */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
                filters.status.length > 0
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <span>Estado</span>
              {filters.status.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                  {filters.status.length}
                </span>
              )}
            </button>

            {showStatusDropdown && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                {statusOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={filters.status.includes(option.value)}
                      onChange={() => handleStatusToggle(option.value)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={cn('h-2 w-2 rounded-full', option.color)} />
                    <span className="text-sm text-slate-700">{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Filtro de acción */}
          <div className="relative">
            <button
              onClick={() => setShowActionDropdown(!showActionDropdown)}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
                filters.action.length > 0
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <span>Acción</span>
              {filters.action.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                  {filters.action.length}
                </span>
              )}
            </button>

            {showActionDropdown && (
              <div className="absolute right-0 top-full z-10 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                {actionOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={filters.action.includes(option.value)}
                      onChange={() => handleActionToggle(option.value)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Limpiar filtros */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              disabled={isLoading}
              className="rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de logs */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {logs.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="mb-4 h-16 w-16 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mb-1 text-lg font-medium text-slate-900">
              No se encontraron registros de auditoría
            </h3>
            <p className="text-slate-500">
              Ajusta los filtros o espera a que se registren nuevas actividades
            </p>
          </div>
        ) : (
          <>
            <AuditLogTable
              logs={logs}
              onViewDetail={handleViewDetail}
              sortable
              isLoading={isLoading}
            />

            {/* Paginación */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                {/* Selector de elementos por página */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Mostrar</span>
                  <select
                    value={pagination.limit}
                    onChange={(e) => {
                      onPageChange(1);
                      onFilterChange({ ...filters });
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Elementos por página"
                  >
                    {limitOptions.map((limit) => (
                      <option key={limit} value={limit}>
                        {limit}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-slate-500">por página</span>
                </div>

                {/* Información de paginación */}
                <p className="text-sm text-slate-500">
                  Mostrando {(pagination.page - 1) * pagination.limit + 1}-
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                  {pagination.total}
                </p>

                {/* Controles de navegación */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || isLoading}
                    className="rounded p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  {/* Números de página */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        disabled={isLoading}
                        className={cn(
                          'h-8 w-8 rounded text-sm transition-colors',
                          pagination.page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages || isLoading}
                    className="rounded p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer de detalles */}
      <AuditDetailDrawer
        isOpen={showDetailDrawer}
        log={selectedLog}
        onClose={() => setShowDetailDrawer(false)}
      />
    </div>
  );
};

export default AuditLogViewer;
