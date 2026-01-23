/**
 * AuditDetailDrawer Component
 * Enterprise AI Image Optimizer - Admin Dashboard
 * Slide-over panel for displaying detailed audit log information
 */

'use client';

import React, { useEffect, useRef } from 'react';
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
 * Log de auditoría con detalles extendidos
 */
interface AuditLogDetail {
  id: string;
  actor: AuditActor;
  action: string;
  resourceType: string;
  resourceId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  ip: string;
  userAgent?: string;
  timestamp: string;
  duration: number;
  metadata?: Record<string, unknown>;
  requestHeaders?: Record<string, string>;
  responseBody?: Record<string, unknown>;
  errorStack?: string;
}

/**
 * Props del componente AuditDetailDrawer
 */
interface AuditDetailDrawerProps {
  /** Indica si el drawer está abierto */
  isOpen: boolean;
  /** Log a mostrar */
  log: AuditLogDetail | null;
  /** Función llamada al cerrar el drawer */
  onClose: () => void;
}

/**
 * Formatea la fecha y hora
 */
const formatTimestamp = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Formatea JSON para mostrar
 */
const formatJson = (obj: Record<string, unknown>): string => {
  return JSON.stringify(obj, null, 2);
};

/**
 * Componente AuditDetailDrawer
 * Panel lateral para mostrar detalles de un log de auditoría
 */
export const AuditDetailDrawer: React.FC<AuditDetailDrawerProps> = ({ isOpen, log, onClose }) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap y gestión de foco
  useEffect(() => {
    if (isOpen && log) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      drawerRef.current?.focus();

      // Bloquear scroll del body
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';

      // Restaurar foco
      previousActiveElement.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, log]);

  // Manejar Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Si no está abierto o no hay log, no renderizar
  if (!isOpen || !log) {
    return null;
  }

  /**
   * Maneja el clic en el overlay para cerrar
   */
  const handleOverlayClick = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-detail-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-xl bg-white shadow-2xl',
          'transform transition-transform duration-300 ease-in-out',
          'animate-in slide-in-from-right',
          'h-full overflow-y-auto'
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <div>
            <h2 id="audit-detail-title" className="text-lg font-semibold text-slate-900">
              Detalles del Log
            </h2>
            <p className="font-mono text-sm text-slate-500">{log.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar detalles"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="space-y-6 p-4">
          {/* Resumen del Evento */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-3">
              <span
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium',
                  log.status === 'SUCCESS'
                    ? 'bg-emerald-100 text-emerald-700'
                    : log.status === 'FAILED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                )}
              >
                {log.status === 'SUCCESS'
                  ? 'ÉXITO'
                  : log.status === 'FAILED'
                    ? 'FALLO'
                    : 'PENDIENTE'}
              </span>
              <span className="text-sm font-medium text-slate-900">
                {log.action
                  .split('_')
                  .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
                  .join(' ')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Timestamp</p>
                <p className="font-mono text-slate-900">{formatTimestamp(log.timestamp)}</p>
              </div>
              <div>
                <p className="text-slate-500">Duración</p>
                <p className="font-mono text-slate-900">{log.duration}ms</p>
              </div>
            </div>
          </div>

          {/* Información del Actor */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-900">Actor</h3>
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-medium text-white">
                {log.actor.name
                  .split(' ')
                  .map((word) => word[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <p className="font-medium text-slate-900">{log.actor.name}</p>
                <p className="text-sm text-slate-500">{log.actor.email}</p>
                <p className="font-mono text-xs text-slate-400">ID: {log.actor.id}</p>
              </div>
            </div>
          </div>

          {/* Información del Recurso */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-900">Recurso Afectado</h3>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-slate-500">Tipo</p>
                  <p className="font-medium text-slate-900">{log.resourceType}</p>
                </div>
                <div>
                  <p className="text-slate-500">ID</p>
                  <p className="font-mono text-xs text-slate-900">{log.resourceId}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Información de Red */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-900">Información de Red</h3>
            <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
              <div>
                <p className="text-slate-500">Dirección IP</p>
                <p className="font-mono text-slate-900">{log.ip}</p>
              </div>
              {log.userAgent && (
                <div>
                  <p className="text-slate-500">User Agent</p>
                  <p className="break-all text-xs text-slate-700">{log.userAgent}</p>
                </div>
              )}
            </div>
          </div>

          {/* Metadatos */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-900">Metadatos</h3>
              <div className="rounded-lg bg-slate-50 p-3">
                <pre className="overflow-x-auto text-xs text-slate-700">
                  {formatJson(log.metadata)}
                </pre>
              </div>
            </div>
          )}

          {/* Encabezados de Solicitud */}
          {log.requestHeaders && Object.keys(log.requestHeaders).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-900">Encabezados de Solicitud</h3>
              <div className="rounded-lg bg-slate-50 p-3">
                <pre className="overflow-x-auto text-xs text-slate-700">
                  {formatJson(log.requestHeaders)}
                </pre>
              </div>
            </div>
          )}

          {/* Cuerpo de Respuesta */}
          {log.responseBody && Object.keys(log.responseBody).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-900">Cuerpo de Respuesta</h3>
              <div className="rounded-lg bg-slate-50 p-3">
                <pre className="overflow-x-auto text-xs text-slate-700">
                  {formatJson(log.responseBody)}
                </pre>
              </div>
            </div>
          )}

          {/* Error Stack Trace */}
          {log.errorStack && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-red-700">Stack Trace</h3>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-red-700">
                  {log.errorStack}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditDetailDrawer;
