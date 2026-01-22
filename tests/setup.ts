import '@testing-library/jest-dom';

// Configurar variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock de fetch global
global.fetch = jest.fn();

// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
});

// Silenciar console en tests (opcional)
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  if (process.env.SILENCE_CONSOLE === 'true') {
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
