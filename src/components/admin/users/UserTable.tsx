/**
 * UserTable Component
 * Enterprise AI Image Optimizer - Admin Dashboard
 * Table component for managing users with pagination, search and filtering
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  usageCount: number;
  createdAt: string;
  lastLogin?: string;
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
 * Props del componente UserTable
 */
interface UserTableProps {
  /** Lista de usuarios a mostrar */
  users: User[];
  /** Indica si está cargando datos */
  isLoading?: boolean;
  /** Configuración de paginación */
  pagination: Pagination;
  /** Callback al cambiar de página */
  onPageChange: (page: number) => void;
  /** Callback al realizar búsqueda */
  onSearch: (term: string) => void;
  /** Callback al editar un usuario */
  onEditUser: (user: User) => void;
  /** Callback al seleccionar una acción del menú */
  onAction?: (action: string, user: User) => void;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Obtiene las iniciales del nombre del usuario
 */
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Obtiene el color del badge según el rol
 */
const getRoleColor = (role: string): string => {
  const colors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
    ADMIN: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    MANAGER: 'bg-blue-100 text-blue-700 border-blue-200',
    USER: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return colors[role] || colors.USER;
};

/**
 * Obtiene el nombre display del rol
 */
const getRoleName = (role: string): string => {
  const names: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Administrador',
    MANAGER: 'Gestor',
    USER: 'Usuario',
  };
  return names[role] || role;
};

/**
 * Formatea la fecha a formato legible
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Componente UserTable
 * Tabla de gestión de usuarios con funcionalidades completas
 */
export const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading = false,
  pagination,
  onPageChange,
  onSearch,
  onEditUser,
  onAction,
  className,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{
    role?: string;
    status?: string;
  }>({});
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Maneja el cambio en el input de búsqueda con debounce
   */
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchTerm(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        onSearch(value);
      }, 300);
    },
    [onSearch]
  );

  /**
   * Limpia la búsqueda
   */
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    onSearch('');
    inputRef.current?.focus();
  }, [onSearch]);

  /**
   * Maneja el cambio de página
   */
  const handlePageChange = (newPage: number): void => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      onPageChange(newPage);
    }
  };

  /**
   * Maneja la selección de filtro
   */
  const handleFilterSelect = (filterType: 'role' | 'status', value: string): void => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType] === value ? undefined : value,
    }));
  };

  /**
   * Maneja las acciones del menú de usuario
   */
  const handleAction = (action: string, user: User, event: React.MouseEvent): void => {
    event.stopPropagation();
    if (action === 'edit') {
      onEditUser(user);
    } else if (onAction) {
      onAction(action, user);
    }
  };

  /**
   * Renderiza el skeleton de carga
   */
  const renderSkeleton = (): React.ReactElement => {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            data-testid="user-row-skeleton"
            className="flex animate-pulse items-center gap-4 p-4"
          >
            <div className="h-10 w-10 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 rounded bg-slate-200" />
              <div className="h-3 w-1/3 rounded bg-slate-200" />
            </div>
            <div className="h-6 w-20 rounded-full bg-slate-200" />
            <div className="h-6 w-16 rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
    );
  };

  /**
   * Renderiza el estado vacío
   */
  const renderEmpty = (): React.ReactElement => {
    return (
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
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="mb-1 text-lg font-medium text-slate-900">No se encontraron usuarios</h3>
        <p className="mb-4 text-slate-500">Crea un nuevo usuario para comenzar</p>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
          Crear Usuario
        </button>
      </div>
    );
  };

  // Cleanup del timeout al desmontar
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white', className)}>
      {/* Toolbar */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
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
              ref={inputRef}
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={handleSearchChange}
              aria-label="Buscar usuarios por nombre o email"
              className={cn(
                'w-full rounded-lg border border-slate-200 py-2 pl-10 pr-10',
                'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500',
                'text-sm placeholder:text-slate-400',
                isLoading && 'animate-pulse'
              )}
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Limpiar búsqueda"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  showFilters || activeFilters.role || activeFilters.status
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Filtrar
              </button>

              {showFilters && (
                <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                  <p className="mb-2 text-xs font-medium uppercase text-slate-500">Rol</p>
                  {['ADMIN', 'MANAGER', 'USER'].map((role) => (
                    <label
                      key={role}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={activeFilters.role === role}
                        onChange={() => handleFilterSelect('role', role)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{getRoleName(role)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Exportar */}
            <button className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full" role="grid">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Usuario
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 md:table-cell">
                Rol
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 lg:table-cell">
                Estado
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 xl:table-cell">
                Uso
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 lg:table-cell">
                Registrado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              renderSkeleton()
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8">
                  {renderEmpty()}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() => onEditUser(user)}
                >
                  {/* Usuario */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-medium text-white">
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{user.name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Rol */}
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                        getRoleColor(user.role)
                      )}
                    >
                      {getRoleName(user.role)}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="flex items-center gap-2">
                      <div
                        data-testid={`status-${user.status.toLowerCase()}`}
                        className={cn(
                          'h-2 w-2 rounded-full',
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-500'
                            : user.status === 'SUSPENDED'
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                        )}
                      />
                      <span className="text-sm text-slate-600">
                        {user.status === 'ACTIVE'
                          ? 'Activo'
                          : user.status === 'SUSPENDED'
                            ? 'Suspendido'
                            : 'Pendiente'}
                      </span>
                    </div>
                  </td>

                  {/* Uso */}
                  <td className="hidden px-4 py-3 xl:table-cell">
                    <span className="text-sm text-slate-600">{user.usageCount}</span>
                  </td>

                  {/* Registrado */}
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="text-sm text-slate-500">{formatDate(user.createdAt)}</span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <div className="relative flex items-center gap-1">
                      <button
                        data-testid="action-menu-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction('edit', user, e);
                        }}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        aria-label={`Editar usuario ${user.name}`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        data-testid="action-menu-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction('menu', user, e);
                        }}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        aria-label={`Más acciones para ${user.name}`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {!isLoading && users.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">
            Mostrando {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}{' '}
            usuarios
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="rounded p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Página anterior"
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
                  onClick={() => handlePageChange(pageNum)}
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
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="rounded p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Siguiente página"
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
    </div>
  );
};

export default UserTable;
