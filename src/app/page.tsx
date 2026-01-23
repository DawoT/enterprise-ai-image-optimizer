'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Upload,
  ImageIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  TrendingUp,
  HardDrive,
} from 'lucide-react';
import { cn, formatFileSize, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';

/**
 * Componente de tarjeta de estadística.
 */
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendValue,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) {
  return (
    <div className="card">
      <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="card-content">
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {trend && (
              <TrendingUp
                className={cn(
                  'h-3 w-3',
                  trend === 'down' && 'rotate-180',
                  trend === 'neutral' && 'text-gray-400'
                )}
              />
            )}
            <span>{trendValue ?? description}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Componente de trabajo recientes.
 */
function RecentJobCard({ job }: { job: RecentJob }) {
  return (
    <div className="flex items-center justify-between border-b p-4 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{job.fileName}</p>
          <p className="text-xs text-muted-foreground">{formatDate(job.createdAt)}</p>
        </div>
      </div>
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          getStatusColor(job.status)
        )}
      >
        {getStatusLabel(job.status)}
      </span>
    </div>
  );
}

// Tipos
interface RecentJob {
  id: string;
  fileName: string;
  status: string;
  createdAt: string;
}

interface Stats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalStorage: number;
}

/**
 * Página principal del dashboard.
 */
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsResponse, healthResponse] = await Promise.all([
          fetch('/api/jobs?limit=5'),
          fetch('/api/health'),
        ]);

        if (!jobsResponse.ok) {
          throw new Error('Error al cargar trabajos');
        }

        const jobsData = await jobsResponse.json();
        setStats(jobsData.stats);
        setRecentJobs(jobsData.data);

        if (!healthResponse.ok) {
          console.warn('Health check failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="font-medium text-destructive">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Bienvenido a la plataforma de optimización de imágenes con IA
          </p>
        </div>
        <Link href="/upload" className="btn-primary">
          <Upload className="mr-2 h-4 w-4" />
          Subir Imagen
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Trabajos"
          value={stats?.totalJobs ?? 0}
          icon={BarChart3}
          description="Desde el inicio"
        />
        <StatCard
          title="Procesados"
          value={stats?.completedJobs ?? 0}
          icon={CheckCircle}
          description="Completados exitosamente"
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          title="En Progreso"
          value={stats?.processingJobs ?? 0}
          icon={Clock}
          description="Actualmente procesando"
        />
        <StatCard
          title="Storage Usado"
          value={formatFileSize(stats?.totalStorage ?? 0)}
          icon={HardDrive}
          description="Almacenamiento total"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Jobs */}
        <div className="card col-span-4">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Trabajos Recientes</h2>
            <p className="text-sm text-muted-foreground">Últimas imágenes procesadas</p>
          </div>
          <div className="card-content">
            {recentJobs.length > 0 ? (
              <div className="divide-y">
                {recentJobs.map((job) => (
                  <RecentJobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <ImageIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>No hay trabajos recientes</p>
                <Link
                  href="/upload"
                  className="mt-2 inline-block text-sm text-primary hover:underline"
                >
                  Subir tu primera imagen
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card col-span-3">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Acciones Rápidas</h2>
            <p className="text-sm text-muted-foreground">Operaciones comunes</p>
          </div>
          <div className="card-content space-y-4">
            <Link
              href="/upload"
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Subir Imagen</p>
                <p className="text-xs text-muted-foreground">Procesar nueva imagen con IA</p>
              </div>
            </Link>

            <Link
              href="/jobs"
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <BarChart3 className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Ver Todos los Trabajos</p>
                <p className="text-xs text-muted-foreground">Historial completo de procesamiento</p>
              </div>
            </Link>

            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Configuración</p>
                <p className="text-xs text-muted-foreground">Ajustes de la plataforma</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
