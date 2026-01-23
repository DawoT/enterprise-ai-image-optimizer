import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Enterprise AI Image Optimizer',
  description: 'Plataforma enterprise para optimización de imágenes con IA para ecommerce',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn(inter.className, 'min-h-screen bg-background font-sans antialiased')}>
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center space-x-4 px-4 sm:justify-between sm:space-x-0">
              <div className="flex gap-6 md:gap-10">
                <a href="/" className="flex items-center space-x-2">
                  <span className="inline-block text-xl font-bold">AI Image Optimizer</span>
                </a>
                <nav className="flex gap-6">
                  <a
                    href="/"
                    className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/upload"
                    className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    Subir Imagen
                  </a>
                  <a
                    href="/jobs"
                    className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    Trabajos
                  </a>
                  <a
                    href="/settings"
                    className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    Configuración
                  </a>
                </nav>
              </div>
              <div className="flex flex-1 items-center justify-end space-x-4">
                <nav className="flex items-center space-x-1">
                  <span className="rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">
                    {process.env.NODE_ENV ?? 'development'}
                  </span>
                </nav>
              </div>
            </div>
          </header>
          <main className="flex-1">
            <div className="container px-4 py-6">{children}</div>
          </main>
          <footer className="border-t py-6 md:py-0">
            <div className="container flex flex-col items-center justify-between gap-4 px-4 md:h-24 md:flex-row">
              <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                Enterprise AI Image Optimization Platform - Versión 1.0.0
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
