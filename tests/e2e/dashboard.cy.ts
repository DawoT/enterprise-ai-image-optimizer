/// <reference types="cypress" />

describe('Dashboard Page', () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept('GET', '/api/health', {
      statusCode: 200,
      body: {
        status: 'ok',
        services: {
          imageProcessor: true,
          storage: true,
          aiService: true,
          database: true,
        },
      },
    }).as('getHealth');

    cy.intercept('GET', '/api/jobs*', {
      statusCode: 200,
      body: {
        data: [
          {
            id: 'test-job-1',
            fileName: 'product-image-1.jpg',
            status: 'COMPLETED',
            statusDescription: 'Completado',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            versions: [],
          },
          {
            id: 'test-job-2',
            fileName: 'product-image-2.jpg',
            status: 'PROCESSING',
            statusDescription: 'Procesando',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            versions: [],
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          totalJobs: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        stats: {
          totalJobs: 10,
          pendingJobs: 2,
          processingJobs: 1,
          completedJobs: 6,
          failedJobs: 1,
          averageProcessingTimeMs: 2500,
          totalStorage: 52428800,
        },
      },
    }).as('getJobs');

    cy.visit('/');
    cy.wait(['@getHealth', '@getJobs']);
  });

  it('should display the dashboard header correctly', () => {
    cy.contains('h1', 'Dashboard').should('be.visible');
    cy.contains('p', 'Bienvenido a la plataforma de optimización de imágenes con IA').should(
      'be.visible',
    );
  });

  it('should display statistics cards', () => {
    cy.contains('Total de Trabajos').should('be.visible');
    cy.contains('Procesados').should('be.visible');
    cy.contains('En Progreso').should('be.visible');
    cy.contains('Storage Usado').should('be.visible');

    cy.contains('.text-2xl', '10').should('be.visible');
    cy.contains('.text-2xl', '6').should('be.visible');
    cy.contains('.text-2xl', '1').should('be.visible');
  });

  it('should display recent jobs', () => {
    cy.contains('Trabajos Recientes').should('be.visible');
    cy.contains('product-image-1.jpg').should('be.visible');
    cy.contains('product-image-2.jpg').should('be.visible');
  });

  it('should display status badges with correct colors', () => {
    cy.contains('Completado')
      .parent()
      .should('have.class', 'bg-green-100');

    cy.contains('Procesando')
      .parent()
      .should('have.class', 'bg-purple-100');
  });

  it('should have quick actions', () => {
    cy.contains('Acciones Rápidas').should('be.visible');
    cy.contains('Subir Imagen').should('be.visible');
    cy.contains('Ver Todos los Trabajos').should('be.visible');
    cy.contains('Configuración').should('be.visible');
  });

  it('should navigate to upload page when clicking upload button', () => {
    cy.contains('button', 'Subir Imagen').click();
    cy.url().should('include', '/upload');
  });

  it('should display empty state when no jobs exist', () => {
    cy.intercept('GET', '/api/jobs*', {
      statusCode: 200,
      body: {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          totalJobs: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        stats: {
          totalJobs: 0,
          pendingJobs: 0,
          processingJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          averageProcessingTimeMs: 0,
          totalStorage: 0,
        },
      },
    }).as('getEmptyJobs');

    cy.reload();
    cy.wait('@getEmptyJobs');

    cy.contains('No hay trabajos recientes').should('be.visible');
    cy.contains('Subir tu primera imagen').should('be.visible');
  });
});

describe('Upload Page', () => {
  beforeEach(() => {
    cy.visit('/upload');
  });

  it('should display upload page header', () => {
    cy.contains('h1', 'Subir Imagen').should('be.visible');
    cy.contains('Sube una imagen para procesarla con IA').should('be.visible');
  });

  it('should display drop zone', () => {
    cy.contains('Arrastra y suelta tu imagen').should('be.visible');
    cy.contains('Formatos soportados: JPEG, PNG, WEBP, TIFF').should('be.visible');
    cy.contains('Tamaño máximo: 50 MB').should('be.visible');
  });

  it('should show error when uploading non-image file', () => {
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('test content'),
      fileName: 'test.txt',
      mimeType: 'text/plain',
    });

    cy.contains('Error al subir').should('be.visible');
  });

  it('should display processing options', () => {
    cy.contains('Opciones de Procesamiento').should('be.visible');
    cy.contains('Análisis con IA').should('be.visible');
    cy.contains('Vertical del Producto').should('be.visible');
    cy.contains('Tono de Marca').should('be.visible');
  });

  it('should navigate to dashboard when clicking cancel', () => {
    cy.contains('button', 'Cancelar').click();
    cy.url().should('include', '/');
  });
});

describe('Health Check API', () => {
  it('should return health status', () => {
    cy.request('/api/health').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('status');
      expect(response.body).to.have.property('services');
    });
  });
});
