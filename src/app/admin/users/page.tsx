/**
 * Admin Users Management Page
 * Enterprise AI Image Optimizer - Panel de Administración
 * Page for managing system users with role-based access control
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { UserTable } from '@/components/admin/users/UserTable';
import { UserEditModal } from '@/components/admin/users/UserEditModal';
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
 * Datos de actualización de usuario
 */
interface UserUpdateData {
  role: User['role'];
  status: User['status'];
}

/**
 * Página de Gestión de Usuarios
 */
export default function AdminUsersPage: React.FC = () => {
  // Estados
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estado del modal de edición
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Notificaciones mockeadas para el layout
  const [notifications] = useState([
    { id: 1, message: 'Usuario creado exitosamente', time: '5 min', read: false },
  ]);

  /**
   * Carga la lista de usuarios desde la API
   */
  const loadUsers = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/admin/users?${params}`);

      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();

      setUsers(data.data);
      setPagination((prev) => ({
        ...prev,
        total: data.meta.total,
        totalPages: data.meta.totalPages,
      }));
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setError('Error al cargar la lista de usuarios. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm]);

  // Cargar usuarios al montar el componente o cambiar página/búsqueda
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /**
   * Maneja el cambio de página
   */
  const handlePageChange = (newPage: number): void => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  /**
   * Maneja la búsqueda
   */
  const handleSearch = (term: string): void => {
    setSearchTerm(term);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset a página 1 al buscar
  };

  /**
   * Abre el modal de edición
   */
  const handleEditUser = (user: User): void => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  /**
   * Cierra el modal de edición
   */
  const handleCloseModal = (): void => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  /**
   * Guarda los cambios del usuario
   */
  const handleSaveUser = async (data: UserUpdateData): Promise<void> => {
    if (!editingUser) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar usuario');
      }

      // Mostrar mensaje de éxito
      setSuccessMessage('Usuario actualizado correctamente');

      // Cerrar modal y recargar usuarios
      handleCloseModal();
      loadUsers();

      // Ocultar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Error al guardar usuario:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Maneja otras acciones del usuario (ver logs, suspender, etc.)
   */
  const handleUserAction = (action: string, user: User): void => {
    console.log(`Acción ${action} en usuario ${user.id}`);

    switch (action) {
      case 'logs':
        // Navegar a la página de logs del usuario
        window.location.href = `/admin/audit?userId=${user.id}`;
        break;
      case 'suspend':
        handleEditUser({ ...user, status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' });
        break;
      case 'delete':
        if (confirm(`¿Estás seguro de que deseas eliminar a ${user.name}?`)) {
          console.log('Eliminar usuario:', user.id);
        }
        break;
      default:
        console.log('Acción no reconocida:', action);
    }
  };

  return (
    <AdminLayout notifications={notifications}>
      <div className="space-y-6">
        {/* Header de la página */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
            <p className="text-slate-500 mt-1">
              Administra los usuarios del sistema y sus roles de acceso
            </p>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Crear Usuario
          </button>
        </div>

        {/* Mensajes de feedback */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
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
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm text-emerald-700">{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-500 hover:text-emerald-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Tabla de usuarios */}
        <UserTable
          users={users}
          isLoading={isLoading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          onEditUser={handleEditUser}
          onAction={handleUserAction}
        />

        {/* Modal de edición de usuario */}
        <UserEditModal
          isOpen={isModalOpen}
          user={editingUser}
          onClose={handleCloseModal}
          onSave={handleSaveUser}
          isLoading={isSaving}
        />
      </div>
    </AdminLayout>
  );
}
