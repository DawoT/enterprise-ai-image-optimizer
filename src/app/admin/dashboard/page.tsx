/**
 * Admin Dashboard Page
 * Enterprise AI Image Optimizer - Panel de Administración
 * Main dashboard with metrics, charts and activity monitoring
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { StatCard } from '@/components/admin/dashboard/StatCard';
import { ChartContainer } from '@/components/admin/dashboard/ChartContainer';
import { cn } from '@/lib/utils';

/**
 * Métricas del dashboard (tipo de datos de la API)
 */
interface DashboardMetrics {
  totalJobs24h: number;
  successRate: number;
  storageUsed: number;
  activeUsers: number;
  jobsTrend: number;
  storageTrend: number;
  successRateTrend: number;
  details?: {
    totalUsers: number;
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    pendingJobs: number;
  };
  timestamp: string;
}

/**
 * Notificación del sistema
 */
interface Notification {
  id: string | number;
  message: string;
  time: string;
  read?: boolean;
}

/**
 * Placeholder para Gráfico de Tendencias
 */
const TrendChartPlaceholder: React.FC = () => (
  <div className="w-full h-full flex items-end justify-between gap-2 px-2">
    {[35, 45, 38, 52, 48, 60, 55, 65, 70, 68, 75, 80].map((height, index) => (
      <div
        key={index}
        className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
        style={{ height: `${height}%`, opacity: 0.8 }}
      />
    ))}
  </div>
);

/**
 * Placeholder para Gráfico Circular
 */
const PieChartPlaceholder: React.FC = () => (
  <div className="flex items-center justify-center h-full gap-8">
    <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 via-emerald-500 to-amber-500 p-1">
      <div className="w-full h-full rounded-full bg-white" />
    </div>
    <div className="space-y-2">
      {[
        { label: 'WebP', value: '65%', color: 'bg-blue-500' },
        { label: 'PNG', value: '25%', color: 'bg-emerald-500' },
        { label: 'JPG', value: '10%', color: 'bg-amber-500' },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${item.color}`} />
          <span className="text-sm text-slate-600">{item.label}</span>
          <span className="text-sm font-medium text-slate-900">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Placeholder para Actividad Reciente
 */
const RecentActivityPlaceholder: React.FC = () => (
  <div className="space-y-4">
    {[
      { action: 'Job completado', detail: 'product_12345.webp', time: '2 min', status: 'success' },
      { action: 'Usuario creado', detail: 'new@enterprise.com', time: '15 min', status: 'info' },
      { action: 'Webhook delivery', detail: 'https://api.example.com', time: '32 min', status: 'warning' },
      { action: 'Storage cleanup', detail: '45 archivos eliminados', time: '1 hora', status: 'info' },
    ].map((activity, index) => (
      <div key={index} className="flex items-start gap-3">
        <div
          className={`w-2 h-2 rounded-full mt-2 ${
            activity.status === 'success'
              ? 'bg-emerald-500'
              : activity.status === 'warning'
              ? 'bg-amber-500'
              : 'bg-blue-500'
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900">{activity.action}</p>
          <p className="text-sm text-slate-500 truncate">{activity.detail}</p>
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">{activity.time}</span>
      </div>
    ))}
  </div>
);

/**
 * Página del Dashboard de Administración
 */
export default function AdminDashboardPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('24h');

  /**
   * Carga los datos del dashboard desde la API
   */
  const loadDashboardData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Cargar métricas en paralelo
      const [metricsResponse, notificationsResponse] = await Promise.all([
        fetch('/api/admin/stats/summary'),
        fetch('/api/notifications'), // Endpoint de notificaciones (si existe)
      ]);

      // Procesar métricas
      if (metricsResponse.ok) {
        const data = await metricsResponse.json();
        setMetrics(data);
      } else {
        // Si la API no está disponible, usar datos mockeados
        console.warn('API de métricas no disponible, usando datos mockeados');
        setMetrics({
          totalJobs24h: 1247,
          successRate: 98.5,
          storageUsed: 7516192768,
          activeUsers: 23,
          jobsTrend: 12.5,
          storageTrend: 5.2,
          successRateTrend: 0.8,
          timestamp: new Date().toISOString(),
        });
      }

      // Procesar notificaciones
      if (notificationsResponse.ok) {
        const data = await notificationsResponse.json();
        setNotifications(data.notifications || []);
      } else {
        // Notificaciones mockeadas
        setNotifications([
          { id: 1, message: 'Nuevo usuario registrado: john@enterprise.com', time: '5 min', read: false },
          { id: 2, message: 'Job #4521 completado exitosamente', time: '15 min', read: false },
          { id: 3, message: 'Alerta: Storage al 85% de capacidad', time: '1 hora', read: true },
          { id: 4, message: 'Webhook delivery fallido: https://api.example.com/callback', time: '2 horas', read: true },
        ]);
      }
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
      setError('Error al cargar los datos. Por favor, inténtalo de nuevo.');

      // Usar datos mockeados en caso de error
      setMetrics({
        totalJobs24h: 1247,
        successRate: 98.5,
        storageUsed: 7516192768,
        activeUsers: 23,
        jobsTrend: 12.5,
        storageTrend: 5.2,
        successRateTrend: 0.8,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  /**
   * Maneja el cambio de período de tiempo
   */
  const handlePeriodChange = (newPeriod: '24h' | '7d' | '30d' | '90d'): void => {
    setPeriod(newPeriod);
    // Aquí se recargarían datos según el período
    loadDashboardData();
  };

  /**
   * Maneja la exportación de datos
   */
  const handleExport = (): void => {
    console.log('Exportando datos del dashboard...');
    // Aquí se implementaría la lógica de exportación
  };

  /**
   * Recarga los datos del dashboard
   */
  const handleRefresh = (): void => {
    loadDashboardData();
  };

  return (
    <AdminLayout
      notifications={notifications}
      notificationCount={notifications.filter((n) => !n.read).length}
    >
      <div className="space-y-6">
        {/* Header de la página */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">
              Resumen de métricas y actividad del sistema
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={isLoading}
            >
              <svg
                className={cn('w-4 h-4 inline mr-2', isLoading && 'animate-spin')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Actualizar
            </button>
            <a
              href="/admin/users"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Gestionar Usuarios
            </a>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* StatCards - Métricas Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <StatCard
            title="Total Jobs (24h)"
            value={metrics?.totalJobs24h}
            trend={metrics?.jobsTrend}
            format="number"
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            }
            description="Número total de imágenes procesadas en las últimas 24 horas"
          />

          <StatCard
            title="Tasa de Éxito"
            value={metrics?.successRate}
            trend={metrics?.successRateTrend}
            format="percentage"
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            description="Porcentaje de jobs completados exitosamente"
          />

          <StatCard
            title="Storage Usado"
            value={metrics?.storageUsed}
            trend={metrics?.storageTrend}
            format="bytes"
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                />
              </svg>
            }
            description="Espacio total de almacenamiento utilizado en MinIO/S3"
          />

          <StatCard
            title="Usuarios Activos"
            value={metrics?.activeUsers}
            format="number"
            loading={isLoading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            }
            description="Usuarios que han iniciado sesión en las últimas 24 horas"
          />
        </div>

        {/* Gráficos - Sección Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Gráfico de Tendencias */}
          <div className="lg:col-span-2">
            <ChartContainer
              title="Tendencias de Procesamiento"
              showTimeFilter
              period={period}
              onPeriodChange={handlePeriodChange}
              showExport
              onExport={handleExport}
              legend={[
                { label: 'Completados', color: 'bg-emerald-500' },
                { label: 'Fallidos', color: 'bg-red-500' },
                { label: 'En Progreso', color: 'bg-blue-500' },
              ]}
              loading={isLoading}
              dataSource="prometheus"
              connected={true}
              lastUpdated={metrics?.timestamp ? new Date(metrics.timestamp) : undefined}
            >
              <TrendChartPlaceholder />
            </ChartContainer>
          </div>

          {/* Gráfico de Distribución */}
          <div className="lg:col-span-1">
            <ChartContainer
              title="Distribución por Formato"
              showExport
              loading={isLoading}
            >
              <PieChartPlaceholder />
            </ChartContainer>
          </div>
        </div>

        {/* Actividad Reciente y Sistema */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Actividad Reciente */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Actividad Reciente</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Ver todo
              </button>
            </div>
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-200 mt-2" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-slate-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <RecentActivityPlaceholder />
            )}
          </div>

          {/* Estado del Sistema */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Estado del Sistema</h3>
            <div className="space-y-4">
              {[
                { name: 'API Server', status: 'healthy', uptime: '99.9%' },
                { name: 'Worker Queue', status: 'healthy', uptime: '99.7%' },
                { name: 'Database', status: 'healthy', uptime: '99.99%' },
                { name: 'Object Storage', status: 'warning', uptime: '98.5%' },
                { name: 'Redis Cache', status: 'healthy', uptime: '99.95%' },
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        service.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="text-sm font-medium text-slate-700">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500">{service.uptime}</span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        service.status === 'healthy'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      )}
                    >
                      {service.status === 'healthy' ? 'Operativo' : 'Advertencia'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
