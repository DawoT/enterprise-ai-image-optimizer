/**
 * Admin Audit Logs Page
 * Enterprise AI Image Optimizer - Panel de Administración
 * Page for viewing and managing system audit logs
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AuditLogViewer } from '@/components/admin/audit/AuditLogViewer';
import { AuditLog } from '@/components/admin/audit/AuditLogViewer';

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
 * Logs de auditoría mockeados para desarrollo
 */
const mockAuditLogs: AuditLog[] = [
  {
    id: 'log_001',
    actor: { id: 'u_1', name: 'Juan Pérez', email: 'juan@enterprise.com' },
    action: 'USER_LOGIN',
    resourceType: 'SESSION',
    resourceId: 'sess_abc123',
    status: 'SUCCESS',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    timestamp: '2024-03-01T10:30:00Z',
    duration: 145,
    metadata: { method: 'credentials', provider: 'google' },
  },
  {
    id: 'log_002',
    actor: { id: 'u_2', name: 'María García', email: 'maria@enterprise.com' },
    action: 'IMAGE_DELETE',
    resourceType: 'IMAGE',
    resourceId: 'img_xyz789',
    status: 'SUCCESS',
    ip: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    timestamp: '2024-03-01T11:15:00Z',
    duration: 89,
    metadata: { fileName: 'product_12345.webp', size: 102400 },
  },
  {
    id: 'log_003',
    actor: { id: 'u_1', name: 'Juan Pérez', email: 'juan@enterprise.com' },
    action: 'USER_UPDATE',
    resourceType: 'USER',
    resourceId: 'u_3',
    status: 'SUCCESS',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    timestamp: '2024-03-01T11:45:00Z',
    duration: 67,
    metadata: { changes: { role: ['USER', 'MANAGER'] } },
  },
  {
    id: 'log_004',
    actor: { id: 'u_4', name: 'Carlos López', email: 'carlos@enterprise.com' },
    action: 'USER_LOGIN',
    resourceType: 'SESSION',
    resourceId: 'sess_def456',
    status: 'FAILED',
    ip: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (Linux; Android 10)',
    timestamp: '2024-03-01T12:00:00Z',
    duration: 23,
    metadata: { error: 'Invalid credentials', reason: 'wrong_password' },
  },
  {
    id: 'log_005',
    actor: { id: 'u_2', name: 'María García', email: 'maria@enterprise.com' },
    action: 'IMAGE_UPLOAD',
    resourceType: 'IMAGE',
    resourceId: 'img_abc123',
    status: 'SUCCESS',
    ip: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    timestamp: '2024-03-01T12:30:00Z',
    duration: 234,
    metadata: { fileName: 'banner_promo.webp', size: 524288, format: 'webp' },
  },
  {
    id: 'log_006',
    actor: { id: 'u_1', name: 'Juan Pérez', email: 'juan@enterprise.com' },
    action: 'CONFIG_UPDATE',
    resourceType: 'CONFIG',
    resourceId: 'config_001',
    status: 'SUCCESS',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    timestamp: '2024-03-01T13:00:00Z',
    duration: 45,
    metadata: { key: 'max_upload_size', oldValue: '10485760', newValue: '20971520' },
  },
  {
    id: 'log_007',
    actor: { id: 'u_5', name: 'Ana Martínez', email: 'ana@enterprise.com' },
    action: 'WEBHOOK_CREATE',
    resourceType: 'WEBHOOK',
    resourceId: 'webhook_001',
    status: 'SUCCESS',
    ip: '192.168.1.103',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    timestamp: '2024-03-01T13:30:00Z',
    duration: 78,
    metadata: { url: 'https://api.example.com/webhooks/events', events: ['image.processed'] },
  },
  {
    id: 'log_008',
    actor: { id: 'u_3', name: 'Pedro Sánchez', email: 'pedro@enterprise.com' },
    action: 'USER_LOGIN',
    resourceType: 'SESSION',
    resourceId: 'sess_ghi789',
    status: 'FAILED',
    ip: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
    timestamp: '2024-03-01T14:00:00Z',
    duration: 15,
    metadata: { error: 'Account suspended', reason: 'policy_violation' },
  },
];

/**
 * Página de Logs de Auditoría
 */
export default function AdminAuditPage: React.FC = () => {
  // Estados
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<AuditFilters>({
    search: '',
    startDate: '',
    endDate: '',
    status: [],
    action: [],
  });
  const [error, setError] = useState<string | null>(null);

  // Notificaciones mockeadas
  const [notifications] = useState([
    { id: 1, message: 'Alerta de seguridad: Login fallido recurrente', time: '10 min', read: false },
  ]);

  /**
   * Carga los logs desde la API
   */
  const loadLogs = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }
      if (filters.status.length > 0) {
        params.append('status', filters.status.join(','));
      }
      if (filters.action.length > 0) {
        params.append('action', filters.action.join(','));
      }

      const response = await fetch(`/api/admin/audit/logs?${params}`);

      if (!response.ok) {
        throw new Error('Error al cargar logs de auditoría');
      }

      const data = await response.json();

      setLogs(data.data);
      setPagination((prev) => ({
        ...prev,
        total: data.meta.total,
        totalPages: data.meta.totalPages,
      }));
    } catch (err) {
      console.error('Error al cargar logs:', err);
      // Usar datos mockeados si la API falla
      setLogs(mockAuditLogs);
      setPagination((prev) => ({
        ...prev,
        total: mockAuditLogs.length,
        totalPages: Math.ceil(mockAuditLogs.length / prev.limit),
      }));
      setError('Usando datos de demostración. La API de auditoría no está disponible.');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  // Cargar logs al montar o cambiar filtros
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  /**
   * Maneja el cambio de página
   */
  const handlePageChange = (newPage: number): void => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  /**
   * Maneja el cambio de filtros
   */
  const handleFilterChange = (newFilters: AuditFilters): void => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  /**
   * Maneja la exportación de logs
   */
  const handleExport = async (format: 'csv' | 'json'): Promise<void> => {
    try {
      const params = new URLSearchParams({ format });

      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }
      if (filters.status.length > 0) {
        params.append('status', filters.status.join(','));
      }
      if (filters.action.length > 0) {
        params.append('action', filters.action.join(','));
      }

      const response = await fetch(`/api/admin/audit/export?${params}`);

      if (!response.ok) {
        throw new Error('Error al exportar logs');
      }

      // Descargar el archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error al exportar logs:', err);
      alert('Error al exportar logs. Por favor, inténtalo de nuevo.');
    }
  };

  /**
   * Maneja la visualización de detalles
   */
  const handleViewDetail = (log: AuditLog): void => {
    console.log('Ver detalles del log:', log.id);
    // Aquí se podría abrir un modal o navegar a una página de detalles
  };

  return (
    <AdminLayout notifications={notifications}>
      <div className="space-y-6">
        {/* Mensaje de error/info */}
        {error && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-amber-700">{error}</span>
            </div>
          </div>
        )}

        {/* Visor de logs de auditoría */}
        <AuditLogViewer
          logs={logs}
          isLoading={isLoading}
          pagination={pagination}
          filters={filters}
          onPageChange={handlePageChange}
          onFilterChange={handleFilterChange}
          onExport={handleExport}
          onViewDetail={handleViewDetail}
        />
      </div>
    </AdminLayout>
  );
}
