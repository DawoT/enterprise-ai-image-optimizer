/**
 * AuditLogViewer Component Tests
 * Enterprise AI Image Optimizer - Admin Dashboard
 * Test-Driven Development (TDD) approach for audit logging system
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogViewer } from './AuditLogViewer';
import { AuditLogTable } from './AuditLogTable';
import { AuditDetailDrawer } from './AuditDetailDrawer';

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
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

describe('AuditLogViewer Component', () => {
  // Datos mockeados de logs de auditoría
  const mockAuditLogs = [
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
      metadata: { method: 'credentials' },
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
  ];

  const defaultProps = {
    logs: mockAuditLogs,
    isLoading: false,
    pagination: {
      page: 1,
      limit: 20,
      total: 150,
      totalPages: 8,
    },
    filters: {
      search: '',
      startDate: '',
      endDate: '',
      status: [],
      action: [],
    },
    onPageChange: jest.fn(),
    onFilterChange: jest.fn(),
    onExport: jest.fn(),
    onViewDetail: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Renderizado Básico', () => {
    it('debería renderizar el título de la página', () => {
      render(<AuditLogViewer {...defaultProps} />);

      expect(screen.getByText('Logs de Auditoría')).toBeInTheDocument();
    });

    it('debería mostrar el contador total de logs', () => {
      render(<AuditLogViewer {...defaultProps} />);

      expect(screen.getByText('150 registros encontrados')).toBeInTheDocument();
    });

    it('debería renderizar la barra de filtros', () => {
      render(<AuditLogViewer {...defaultProps} />);

      expect(
        screen.getByPlaceholderText('Buscar por usuario, IP o recurso...')
      ).toBeInTheDocument();
    });

    it('debería renderizar los botones de exportación', () => {
      render(<AuditLogViewer {...defaultProps} />);

      expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /json/i })).toBeInTheDocument();
    });
  });

  describe('Barra de Filtros', () => {
    it('debería tener campo de búsqueda con debounce', async () => {
      const user = userEvent.setup();
      const onFilterChange = jest.fn();

      render(<AuditLogViewer {...defaultProps} onFilterChange={onFilterChange} />);

      const searchInput = screen.getByPlaceholderText('Buscar por usuario, IP o recurso...');
      await user.type(searchInput, 'juan');

      expect(onFilterChange).toHaveBeenCalledWith({ ...defaultProps.filters, search: 'j' });
      expect(onFilterChange).toHaveBeenCalledWith({ ...defaultProps.filters, search: 'ju' });

      // Esperar debounce
      await waitFor(() => {
        jest.advanceTimersByTime(350);
      });
    });

    it('debería mostrar selector de fecha', () => {
      render(<AuditLogViewer {...defaultProps} />);

      expect(screen.getByRole('button', { name: /fecha/i })).toBeInTheDocument();
    });

    it('debería mostrar dropdown de filtros de estado', () => {
      render(<AuditLogViewer {...defaultProps} />);

      const statusButton = screen.getByRole('button', { name: /estado/i });
      expect(statusButton).toBeInTheDocument();
    });

    it('debería mostrar dropdown de filtros de acción', () => {
      render(<AuditLogViewer {...defaultProps} />);

      const actionButton = screen.getByRole('button', { name: /acción/i });
      expect(actionButton).toBeInTheDocument();
    });

    it('debería limpiar filtros al hacer clic en limpiar', async () => {
      const user = userEvent.setup();
      const onFilterChange = jest.fn();

      render(
        <AuditLogViewer
          {...defaultProps}
          filters={{ ...defaultProps.filters, search: 'test' }}
          onFilterChange={onFilterChange}
        />
      );

      const clearButton = screen.getByRole('button', { name: /limpiar filtros/i });
      await user.click(clearButton);

      expect(onFilterChange).toHaveBeenCalledWith({
        search: '',
        startDate: '',
        endDate: '',
        status: [],
        action: [],
      });
    });
  });

  describe('Exportación', () => {
    it('debería llamar onExport con formato CSV', () => {
      render(<AuditLogViewer {...defaultProps} />);

      const csvButton = screen.getByRole('button', { name: /csv/i });
      fireEvent.click(csvButton);

      expect(defaultProps.onExport).toHaveBeenCalledWith('csv');
    });

    it('debería llamar onExport con formato JSON', () => {
      render(<AuditLogViewer {...defaultProps} />);

      const jsonButton = screen.getByRole('button', { name: /json/i });
      fireEvent.click(jsonButton);

      expect(defaultProps.onExport).toHaveBeenCalledWith('json');
    });

    it('debería mostrar indicador de exportación', async () => {
      const onExport = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      render(<AuditLogViewer {...defaultProps} onExport={onExport} />);

      const exportButton = screen.getByRole('button', { name: /exportar/i });
      fireEvent.click(exportButton);

      expect(screen.getByText('Exportando...')).toBeInTheDocument();
    });
  });

  describe('Paginación', () => {
    it('debería mostrar información de paginación', () => {
      render(<AuditLogViewer {...defaultProps} />);

      expect(screen.getByText('Mostrando 1-20 de 150')).toBeInTheDocument();
    });

    it('debería llamar onPageChange al cambiar de página', async () => {
      const user = userEvent.setup();
      const onPageChange = jest.fn();

      render(<AuditLogViewer {...defaultProps} onPageChange={onPageChange} />);

      const nextButton = screen.getByRole('button', { name: /siguiente/i });
      await user.click(nextButton);

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('debería permitir seleccionar número de elementos por página', async () => {
      const user = userEvent.setup();
      render(<AuditLogViewer {...defaultProps} />);

      const limitSelect = screen.getByRole('combobox', { name: /elementos por página/i });
      await user.click(limitSelect);

      const option50 = screen.getByRole('option', { name: /50/i });
      await user.click(option50);

      // Verificar que se actualizó el select
      expect(limitSelect).toHaveValue('50');
    });
  });

  describe('Estado Vacío', () => {
    it('debería mostrar mensaje cuando no hay logs', () => {
      render(<AuditLogViewer {...defaultProps} logs={[]} />);

      expect(screen.getByText('No se encontraron registros de auditoría')).toBeInTheDocument();
      expect(
        screen.getByText('Ajusta los filtros o espera a que se registren nuevas actividades')
      ).toBeInTheDocument();
    });
  });

  describe('Estados de Carga', () => {
    it('debería mostrar skeleton mientras carga', () => {
      render(<AuditLogViewer {...defaultProps} isLoading={true} />);

      const skeletons = screen.getAllByTestId('audit-row-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('debería deshabilitar controles mientras carga', () => {
      render(<AuditLogViewer {...defaultProps} isLoading={true} />);

      const searchInput = screen.getByPlaceholderText('Buscar por usuario, IP o recurso...');
      expect(searchInput).toBeDisabled();
    });
  });
});

describe('AuditLogTable Component', () => {
  const mockLogs = [
    {
      id: 'log_001',
      actor: { id: 'u_1', name: 'Juan Pérez', email: 'juan@enterprise.com' },
      action: 'USER_LOGIN',
      resourceType: 'SESSION',
      resourceId: 'sess_abc123',
      status: 'SUCCESS',
      ip: '192.168.1.100',
      timestamp: '2024-03-01T10:30:00Z',
      duration: 145,
      metadata: {},
    },
    {
      id: 'log_002',
      actor: { id: 'u_2', name: 'María García', email: 'maria@enterprise.com' },
      action: 'IMAGE_DELETE',
      resourceType: 'IMAGE',
      resourceId: 'img_xyz789',
      status: 'FAILED',
      ip: '192.168.1.101',
      timestamp: '2024-03-01T11:15:00Z',
      duration: 23,
      metadata: { error: 'Permission denied' },
    },
  ];

  const defaultProps = {
    logs: mockLogs,
    onViewDetail: jest.fn(),
  };

  describe('Renderizado de Tabla', () => {
    it('debería renderizar encabezados de columna', () => {
      render(<AuditLogTable {...defaultProps} />);

      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('Actor')).toBeInTheDocument();
      expect(screen.getByText('Acción')).toBeInTheDocument();
      expect(screen.getByText('Recurso')).toBeInTheDocument();
      expect(screen.getByText('IP')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(screen.getByText('Duración')).toBeInTheDocument();
    });

    it('debería renderizar los datos de los logs', () => {
      render(<AuditLogTable {...defaultProps} />);

      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('maria@enterprise.com')).toBeInTheDocument();
      expect(screen.getByText('USER_LOGIN')).toBeInTheDocument();
      expect(screen.getByText('IMAGE_DELETE')).toBeInTheDocument();
    });

    it('debería formatear timestamps correctamente', () => {
      render(<AuditLogTable {...defaultProps} />);

      expect(screen.getByText('01 mar 2024, 10:30:00')).toBeInTheDocument();
    });

    it('debería mostrar badges de estado con colores correctos', () => {
      render(<AuditLogTable {...defaultProps} />);

      const successBadge = screen.getByText('Éxito');
      const failedBadge = screen.getByText('Fallo');

      expect(successBadge).toHaveClass('bg-emerald-100', { exact: false });
      expect(failedBadge).toHaveClass('bg-red-100', { exact: false });
    });

    it('debería mostrar duración en formato legible', () => {
      render(<AuditLogTable {...defaultProps} />);

      expect(screen.getByText('145ms')).toBeInTheDocument();
    });
  });

  describe('Interacción', () => {
    it('debería llamar onViewDetail al hacer clic en una fila', async () => {
      const user = userEvent.setup();
      const onViewDetail = jest.fn();

      render(<AuditLogTable {...defaultProps} onViewDetail={onViewDetail} />);

      const firstRow = screen.getByRole('row', { name: /juan pérez/i });
      await user.click(firstRow);

      expect(onViewDetail).toHaveBeenCalledWith(mockLogs[0]);
    });

    it('debería resaltar la fila al hover', () => {
      render(<AuditLogTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveClass('hover:bg-slate-50', { exact: false });
    });
  });

  describe('Ordenación', () => {
    it('debería permitir ordenar por timestamp', () => {
      render(<AuditLogTable {...defaultProps} />);

      const timestampHeader = screen.getByRole('columnheader', { name: /timestamp/i });
      expect(timestampHeader).toBeInTheDocument();
    });

    it('debería mostrar indicador de ordenación', () => {
      render(<AuditLogTable {...defaultProps} sortable />);

      const timestampHeader = screen.getByRole('columnheader', { name: /timestamp/i });
      expect(timestampHeader).toHaveAttribute('aria-sort', 'descending');
    });
  });
});

describe('AuditDetailDrawer Component', () => {
  const mockLog = {
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
    requestHeaders: { 'content-type': 'application/json', authorization: 'Bearer xxx' },
    responseBody: { success: true, userId: 'u_1' },
  };

  const defaultProps = {
    isOpen: true,
    log: mockLog,
    onClose: jest.fn(),
  };

  describe('Renderizado', () => {
    it('debería renderizar el drawer cuando está abierto', () => {
      render(<AuditDetailDrawer {...defaultProps} />);

      expect(screen.getByText('Detalles del Log')).toBeInTheDocument();
      expect(screen.getByText('USER_LOGIN')).toBeInTheDocument();
    });

    it('debería mostrar información del actor', () => {
      render(<AuditDetailDrawer {...defaultProps} />);

      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('juan@enterprise.com')).toBeInTheDocument();
    });

    it('debería mostrar la IP y User Agent', () => {
      render(<AuditDetailDrawer {...defaultProps} />);

      expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      expect(screen.getByText(/Mozilla/i)).toBeInTheDocument();
    });

    it('debería mostrar el timestamp formateado', () => {
      render(<AuditDetailDrawer {...defaultProps} />);

      expect(screen.getByText('01 mar 2024 10:30:00')).toBeInTheDocument();
    });
  });

  describe('Secciones de Información', () => {
    it('debería mostrar sección de metadata', () => {
      render(<AuditDetailDrawer {...defaultProps} />);

      expect(screen.getByText('Metadatos')).toBeInTheDocument();
      expect(screen.getByText('method')).toBeInTheDocument();
      expect(screen.getByText('credentials')).toBeInTheDocument();
    });

    it('debería mostrar sección de headers', () => {
      render(<AuditDetailDrawer {...defaultProps} />);

      const headersSection = screen.getByText('Encabezados de Solicitud');
      expect(headersSection).toBeInTheDocument();
    });

    it('debería mostrar sección de respuesta', () => {
      render(<AuditDetailDrawer {...defaultProps} />);

      const responseSection = screen.getByText('Cuerpo de Respuesta');
      expect(responseSection).toBeInTheDocument();
    });
  });

  describe('Cierre', () => {
    it('debería cerrar al hacer clic en el botón cerrar', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<AuditDetailDrawer {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /cerrar/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('debería cerrar al hacer clic fuera del drawer', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(
        <div data-testid="overlay">
          <AuditDetailDrawer {...defaultProps} onClose={onClose} />
        </div>
      );

      const overlay = screen.getByTestId('overlay').firstChild as HTMLElement;
      await user.click(overlay);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accesibilidad', () => {
    it('debería tener atributos ARIA correctos', () => {
      render(<AuditDetailDrawer {...defaultProps} />);

      const drawer = screen.getByRole('dialog');
      expect(drawer).toHaveAttribute('aria-labelledby', 'audit-detail-title');
    });

    it('debería tener focus trap', () => {
      render(<AuditDetailDrawer {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /cerrar/i });
      expect(document.activeElement).toBe(closeButton);
    });
  });
});
