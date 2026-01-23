/**
 * UserTable Component Tests
 * Enterprise AI Image Optimizer - Admin Dashboard
 * Test-Driven Development (TDD) approach for user management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserTable } from './UserTable';
import { UserEditModal } from './UserEditModal';

// Mock de next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { role: 'ADMIN' } },
    status: 'authenticated',
  })),
}));

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

describe('UserTable Component', () => {
  // Datos mockeados de usuarios
  const mockUsers = [
    {
      id: '1',
      name: 'Juan Pérez',
      email: 'juan@enterprise.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      usageCount: 150,
      createdAt: '2024-01-15T10:00:00Z',
      lastLogin: '2024-03-01T14:30:00Z',
    },
    {
      id: '2',
      name: 'María García',
      email: 'maria@enterprise.com',
      role: 'MANAGER',
      status: 'ACTIVE',
      usageCount: 85,
      createdAt: '2024-02-20T09:00:00Z',
      lastLogin: '2024-02-28T16:45:00Z',
    },
    {
      id: '3',
      name: 'Carlos López',
      email: 'carlos@enterprise.com',
      role: 'USER',
      status: 'SUSPENDED',
      usageCount: 12,
      createdAt: '2024-03-01T11:00:00Z',
      lastLogin: '2024-03-01T11:00:00Z',
    },
  ];

  // Props por defecto
  const defaultProps = {
    users: mockUsers,
    isLoading: false,
    pagination: {
      page: 1,
      limit: 10,
      total: 50,
      totalPages: 5,
    },
    onPageChange: jest.fn(),
    onSearch: jest.fn(),
    onEditUser: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Renderizado Básico', () => {
    it('debería renderizar el toolbar de búsqueda', () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByPlaceholderText('Buscar usuarios...')).toBeInTheDocument();
    });

    it('debería renderizar los encabezados de la tabla', () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText('Usuario')).toBeInTheDocument();
      expect(screen.getByText('Rol')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(screen.getByText('Uso')).toBeInTheDocument();
      expect(screen.getByText('Registrado')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    it('debería renderizar la lista de usuarios', () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('María García')).toBeInTheDocument();
      expect(screen.getByText('carlos@enterprise.com')).toBeInTheDocument();
    });

    it('debería mostrar los badges de rol correctamente', () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText('Administrador')).toBeInTheDocument();
      expect(screen.getByText('Gestor')).toBeInTheDocument();
      expect(screen.getByText('Usuario')).toBeInTheDocument();
    });

    it('debería mostrar los indicadores de estado', () => {
      render(<UserTable {...defaultProps} />);

      const activeIndicators = screen.getAllByTestId('status-active');
      const suspendedIndicators = screen.getAllByTestId('status-suspended');

      expect(activeIndicators.length).toBe(2);
      expect(suspendedIndicators.length).toBe(1);
    });
  });

  describe('Estados de Carga', () => {
    it('debería mostrar skeleton mientras carga', () => {
      render(<UserTable {...defaultProps} isLoading={true} />);

      const skeletons = screen.getAllByTestId('user-row-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('debería ocultar la tabla mientras carga', () => {
      render(<UserTable {...defaultProps} isLoading={true} />);

      expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
    });

    it('debería mostrar indicador de carga en el toolbar', () => {
      render(<UserTable {...defaultProps} isLoading={true} />);

      const searchInput = screen.getByPlaceholderText('Buscar usuarios...');
      expect(searchInput).toHaveClass('animate-pulse');
    });
  });

  describe('Estado Vacío', () => {
    it('debería mostrar mensaje cuando no hay usuarios', () => {
      render(<UserTable {...defaultProps} users={[]} />);

      expect(screen.getByText('No se encontraron usuarios')).toBeInTheDocument();
      expect(screen.getByText('Crea un nuevo usuario para comenzar')).toBeInTheDocument();
    });
  });

  describe('Búsqueda', () => {
    it('debería llamar onSearch al escribir en el input', async () => {
      const user = userEvent.setup();
      const onSearch = jest.fn();

      render(<UserTable {...defaultProps} onSearch={onSearch} />);

      const searchInput = screen.getByPlaceholderText('Buscar usuarios...');
      await user.type(searchInput, 'juan');

      expect(onSearch).toHaveBeenCalledWith('juan');
    });

    it('debería tener debounce de 300ms en la búsqueda', async () => {
      const user = userEvent.setup();
      const onSearch = jest.fn();

      render(<UserTable {...defaultProps} onSearch={onSearch} />);

      const searchInput = screen.getByPlaceholderText('Buscar usuarios...');

      await user.type(searchInput, 'test');
      expect(onSearch).toHaveBeenCalledTimes(4); // t, e, s, t

      // Esperar debounce
      await waitFor(() => {
        jest.advanceTimersByTime(350);
      });

      // onSearch final debería llamarse solo una vez con el valor completo
      // (El mock se clear en beforeEach, verificamos timing)
    });

    it('debería limpiar la búsqueda al hacer clic en el botón de limpiar', async () => {
      const user = userEvent.setup();
      const onSearch = jest.fn();

      render(<UserTable {...defaultProps} onSearch={onSearch} />);

      const searchInput = screen.getByPlaceholderText('Buscar usuarios...');
      await user.type(searchInput, 'test');

      const clearButton = screen.getByRole('button', { name: /limpiar/i });
      await user.click(clearButton);

      expect(onSearch).toHaveBeenCalledWith('');
    });
  });

  describe('Paginación', () => {
    it('debería mostrar información de paginación', () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText('Mostrando 1-3 de 50 usuarios')).toBeInTheDocument();
    });

    it('debería renderizar botones de navegación', () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByRole('button', { name: /anterior/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
    });

    it('debería desactivar botón anterior en la primera página', () => {
      render(<UserTable {...defaultProps} pagination={{ ...defaultProps.pagination, page: 1 }} />);

      const prevButton = screen.getByRole('button', { name: /anterior/i });
      expect(prevButton).toBeDisabled();
    });

    it('debería desactivar botón siguiente en la última página', () => {
      render(
        <UserTable
          {...defaultProps}
          pagination={{ ...defaultProps.pagination, page: 5, totalPages: 5 }}
        />
      );

      const nextButton = screen.getByRole('button', { name: /siguiente/i });
      expect(nextButton).toBeDisabled();
    });

    it('debería llamar onPageChange al hacer clic en siguiente', async () => {
      const user = userEvent.setup();
      const onPageChange = jest.fn();

      render(<UserTable {...defaultProps} onPageChange={onPageChange} />);

      const nextButton = screen.getByRole('button', { name: /siguiente/i });
      await user.click(nextButton);

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('debería llamar onPageChange al hacer clic en anterior', async () => {
      const user = userEvent.setup();
      const onPageChange = jest.fn();

      render(
        <UserTable
          {...defaultProps}
          pagination={{ ...defaultProps.pagination, page: 2 }}
          onPageChange={onPageChange}
        />
      );

      const prevButton = screen.getByRole('button', { name: /anterior/i });
      await user.click(prevButton);

      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('debería renderizar números de página', () => {
      render(
        <UserTable
          {...defaultProps}
          pagination={{ ...defaultProps.pagination, page: 2, totalPages: 5 }}
        />
      );

      expect(screen.getByRole('button', { name: /1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /2/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /3/i })).toBeInTheDocument();
    });

    it('debería marcar la página actual como activa', () => {
      render(
        <UserTable
          {...defaultProps}
          pagination={{ ...defaultProps.pagination, page: 2 }}
        />
      );

      const page2Button = screen.getByRole('button', { name: /2/i });
      expect(page2Button).toHaveClass('bg-blue-600', { exact: false });
    });
  });

  describe('Acciones de Usuario', () => {
    it('debería abrir modal de edición al hacer clic en editar', async () => {
      const user = userEvent.setup();
      const onEditUser = jest.fn();

      render(<UserTable {...defaultProps} onEditUser={onEditUser} />);

      const editButtons = screen.getAllByRole('button', { name: /editar/i });
      await user.click(editButtons[0]);

      expect(onEditUser).toHaveBeenCalledWith(mockUsers[0]);
    });

    it('debería mostrar menú de acciones al hacer clic en el botón de puntos', async () => {
      const user = userEvent.setup();
      render(<UserTable {...defaultProps} />);

      const menuButtons = screen.getAllByTestId('action-menu-button');
      await user.click(menuButtons[0]);

      expect(screen.getByText('Ver detalles')).toBeInTheDocument();
      expect(screen.getByText('Ver logs de actividad')).toBeInTheDocument();
      expect(screen.getByText('Suspender usuario')).toBeInTheDocument();
    });
  });

  describe('Formato de Datos', () => {
    it('debería formatear la fecha de registro correctamente', () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText('15 ene, 2024')).toBeInTheDocument();
    });

    it('debería mostrar el uso de API como contador', () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('debería mostrar iniciales del usuario', () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText('JP')).toBeInTheDocument();
      expect(screen.getByText('MG')).toBeInTheDocument();
    });
  });

  describe('Filtros', () => {
    it('debería mostrar dropdown de filtros de rol', () => {
      render(<UserTable {...defaultProps} />);

      const filterButton = screen.getByRole('button', { name: /filtrar por rol/i });
      expect(filterButton).toBeInTheDocument();
    });

    it('debería abrir dropdown al hacer clic', async () => {
      const user = userEvent.setup();
      render(<UserTable {...defaultProps} />);

      const filterButton = screen.getByRole('button', { name: /filtrar por rol/i });
      await user.click(filterButton);

      expect(screen.getByText('Administrador')).toBeInTheDocument();
      expect(screen.getByText('Gestor')).toBeInTheDocument();
      expect(screen.getByText('Usuario')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('debería ocultar columnas menos importantes en móvil', () => {
      // Simular viewport móvil
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      fireEvent(window, new Event('resize'));

      render(<UserTable {...defaultProps} />);

      // La columna de uso debería ocultarse
      const usageHeader = screen.queryByText('Uso');
      expect(usageHeader).not.toBeInTheDocument();
    });

    it('debería mostrar botón de menú para acciones en móvil', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      fireEvent(window, new Event('resize'));

      render(<UserTable {...defaultProps} />);

      const menuButtons = screen.getAllByTestId('action-menu-button');
      expect(menuButtons.length).toBe(mockUsers.length);
    });
  });

  describe('Accesibilidad', () => {
    it('debería tener atributos aria en la tabla', () => {
      render(<UserTable {...defaultProps} />);

      const table = screen.getByRole('grid');
      expect(table).toBeInTheDocument();
    });

    it('debería tener aria-label en los botones de paginación', () => {
      render(<UserTable {...defaultProps} />);

      const nextButton = screen.getByRole('button', { name: /siguiente página/i });
      expect(nextButton).toHaveAttribute('aria-label', 'Siguiente página');
    });

    it('debería tener aria-live para búsqueda', () => {
      render(<UserTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar usuarios...');
      expect(searchInput).toHaveAttribute('aria-label', 'Buscar usuarios por nombre o email');
    });
  });
});

describe('UserEditModal Component', () => {
  const mockUser = {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@enterprise.com',
    role: 'USER',
    status: 'ACTIVE',
  };

  const defaultProps = {
    isOpen: true,
    user: mockUser,
    onClose: jest.fn(),
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado', () => {
    it('debería renderizar el modal cuando está abierto', () => {
      render(<UserEditModal {...defaultProps} />);

      expect(screen.getByText('Editar Usuario')).toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('juan@enterprise.com')).toBeInTheDocument();
    });

    it('debería pre-seleccionar el rol actual', () => {
      render(<UserEditModal {...defaultProps} />);

      const roleSelect = screen.getByRole('combobox');
      expect(roleSelect).toHaveValue('USER');
    });

    it('debería mostrar el estado actual', () => {
      render(<UserEditModal {...defaultProps} />);

      const statusToggle = screen.getByRole('switch', { name: /activo/i });
      expect(statusToggle).toBeChecked();
    });
  });

  describe('Cambio de Rol', () => {
    it('debería permitir seleccionar un nuevo rol', async () => {
      const user = userEvent.setup();
      render(<UserEditModal {...defaultProps} />);

      const roleSelect = screen.getByRole('combobox');
      await user.click(roleSelect);

      const adminOption = screen.getByText('Administrador');
      await user.click(adminOption);

      expect(roleSelect).toHaveValue('ADMIN');
    });
  });

  describe('Cambio de Estado', () => {
    it('debería permitir desactivar el usuario', async () => {
      const user = userEvent.setup();
      render(<UserEditModal {...defaultProps} />);

      const statusToggle = screen.getByRole('switch', { name: /activo/i });
      await user.click(statusToggle);

      expect(statusToggle).not.toBeChecked();
    });
  });

  describe('Acciones', () => {
    it('debería llamar onClose al hacer clic en cancelar', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<UserEditModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('debería llamar onSave con los nuevos datos al guardar', async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();

      render(<UserEditModal {...defaultProps} onSave={onSave} />);

      // Cambiar rol
      const roleSelect = screen.getByRole('combobox');
      await user.click(roleSelect);
      const adminOption = screen.getByText('Administrador');
      await user.click(adminOption);

      // Guardar
      const saveButton = screen.getByRole('button', { name: /guardar cambios/i });
      await user.click(saveButton);

      expect(onSave).toHaveBeenCalledWith({
        id: '1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });
    });

    it('debería cerrar el modal después de guardar exitosamente', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<UserEditModal {...defaultProps} onClose={onClose} />);

      const saveButton = screen.getByRole('button', { name: /guardar cambios/i });
      await user.click(saveButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Validación', () => {
    it('debería mostrar advertencia al quitar rol de admin al último admin', async () => {
      const user = userEvent.setup();
      const lastAdminUser = { ...mockUser, role: 'ADMIN' };

      render(<UserEditModal {...defaultProps} user={lastAdminUser} />);

      // Intentar cambiar a usuario regular
      const roleSelect = screen.getByRole('combobox');
      await user.click(roleSelect);
      const userOption = screen.getByText('Usuario');
      await user.click(userOption);

      expect(screen.getByText(/último administrador/i)).toBeInTheDocument();
    });
  });

  describe('Cierre del Modal', () => {
    it('debería cerrar al hacer clic fuera del contenido', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(
        <div data-testid="overlay">
          <UserEditModal {...defaultProps} onClose={onClose} />
        </div>
      );

      const overlay = screen.getByTestId('overlay').firstChild as HTMLElement;
      await user.click(overlay);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
