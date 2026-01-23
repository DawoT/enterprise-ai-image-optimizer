/**
 * UserEditModal Component
 * Enterprise AI Image Optimizer - Admin Dashboard
 * Modal for editing user roles and status
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * Usuario del sistema
 */
interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
}

/**
 * Datos actualizados del usuario
 */
interface UserUpdateData {
  role: User['role'];
  status: User['status'];
}

/**
 * Props del componente UserEditModal
 */
interface UserEditModalProps {
  /** Indica si el modal está abierto */
  isOpen: boolean;
  /** Usuario a editar */
  user: User | null;
  /** Función llamada al cerrar el modal */
  onClose: () => void;
  /** Función llamada al guardar los cambios */
  onSave: (data: UserUpdateData) => void;
  /** Indica si es el último administrador (para prevenir self-demotion) */
  isLastAdmin?: boolean;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * Opciones de rol disponibles
 */
const roleOptions = [
  { value: 'SUPER_ADMIN', label: 'Super Administrador', color: 'bg-purple-100 text-purple-700' },
  { value: 'ADMIN', label: 'Administrador', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'MANAGER', label: 'Gestor', color: 'bg-blue-100 text-blue-700' },
  { value: 'USER', label: 'Usuario', color: 'bg-slate-100 text-slate-700' },
];

/**
 * Componente UserEditModal
 * Modal para edición de roles y estado de usuarios
 */
export const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  user,
  onClose,
  onSave,
  isLastAdmin = false,
  isLoading = false,
}) => {
  const [role, setRole] = useState<User['role']>('USER');
  const [status, setStatus] = useState<User['status']>('ACTIVE');
  const [showWarning, setShowWarning] = useState(false);

  // Actualizar estado cuando cambia el usuario
  useEffect(() => {
    if (user) {
      setRole(user.role);
      setStatus(user.status);
      setShowWarning(false);
    }
  }, [user]);

  // Mostrar advertencia si es el último admin y está cambiando de rol
  useEffect(() => {
    if (isLastAdmin && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [role, isLastAdmin]);

  /**
   * Maneja el guardado del formulario
   */
  const handleSave = (): void => {
    onSave({ role, status });
  };

  /**
   * Maneja el cierre del modal
   */
  const handleClose = (): void => {
    if (user) {
      setRole(user.role);
      setStatus(user.status);
    }
    setShowWarning(false);
    onClose();
  };

  /**
   * Maneja el clic fuera del contenido del modal
   */
  const handleOverlayClick = (event: React.MouseEvent): void => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  // No renderizar si no está abierto o no hay usuario
  if (!isOpen || !user) {
    return null;
  }

  return (
    <div
      data-testid="modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      {/* Modal */}
      <div
        className={cn(
          'w-full max-w-md rounded-xl bg-white shadow-2xl',
          'transform transition-all duration-200',
          'animate-in fade-in zoom-in-95'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-medium text-white">
              {user.name
                .split(' ')
                .map((word) => word[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div>
              <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
                Editar Usuario
              </h2>
              <p className="text-sm text-slate-500">{user.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar modal"
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
        <div className="space-y-4 p-4">
          {/* Email (solo lectura) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
            />
          </div>

          {/* Selector de Rol */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Rol</label>
            <div className="space-y-2">
              {roleOptions.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all',
                    role === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => setRole(option.value as User['role'])}
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                    disabled={isLastAdmin && option.value === 'USER'}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-900">{option.label}</span>
                    <p className="text-xs text-slate-500">
                      {option.value === 'SUPER_ADMIN' && 'Acceso completo a todas las funciones'}
                      {option.value === 'ADMIN' && 'Gestión de usuarios y configuración'}
                      {option.value === 'MANAGER' && 'Gestión de contenido y reportes'}
                      {option.value === 'USER' && 'Acceso básico a la plataforma'}
                    </p>
                  </div>
                  <span
                    className={cn('rounded-full px-2 py-0.5 text-xs font-medium', option.color)}
                  >
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Toggle de Estado */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Estado</label>
            <button
              role="switch"
              aria-checked={status === 'ACTIVE'}
              onClick={() => setStatus(status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  status === 'ACTIVE' ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
            <span className="ml-3 text-sm text-slate-600">
              {status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
            </span>
          </div>

          {/* Advertencia de último admin */}
          {showWarning && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <svg
                  className="mt-0.5 h-5 w-5 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Advertencia: Último Administrador
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Estás a punto de quitar los privilegios de administrador al último usuario con
                    este rol. Esto podría afectar la gestión del sistema.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-4">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || showWarning}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
              isLoading || showWarning
                ? 'cursor-not-allowed bg-blue-400'
                : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Guardando...
              </span>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserEditModal;
