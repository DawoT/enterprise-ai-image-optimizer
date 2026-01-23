#!/usr/bin/env node

/**
 * Script de Ingestión desde Google Drive
 *
 * Usage:
 *   npm run ingest:drive              // Ejecuta un ciclo de ingestión
 *   npm run ingest:drive -- --watch   // Ejecuta en modo polling continuo
 *
 * Configuración requerida en .env:
 *   GOOGLE_CLIENT_ID=your-client-id
 *   GOOGLE_CLIENT_SECRET=your-client-secret
 *   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
 *   GOOGLE_REFRESH_TOKEN=your-refresh-token
 *   GOOGLE_DRIVE_FOLDER_ID=your-folder-id
 */

import { GoogleDriveIngestorService } from '../src/infrastructure/ingestion/google-drive-ingestor';
import { getContainer } from '../src/infrastructure/di/container';

async function runIngestion(watchMode: boolean = false) {
  console.log('===========================================');
  console.log('  Google Drive Ingestion Script');
  console.log('===========================================\n');

  try {
    const container = getContainer();
    const ingestor = container.get<GoogleDriveIngestorService>(Symbol.for('GoogleDriveIngestor'));

    if (watchMode) {
      console.log('[Ingestión] Modo polling habilitado');
      console.log('[Ingestión] Presiona Ctrl+C para detener\n');

      // Polling cada 60 segundos
      const intervalMs = 60 * 1000;

      // Ejecutar inmediatamente
      await runCycle(ingestor);

      // Configurar intervalo
      const interval = setInterval(async () => {
        await runCycle(ingestor);
      }, intervalMs);

      // Manejar signals de termination
      process.on('SIGINT', () => {
        console.log('\n[Ingestión] Deteniendo...');
        clearInterval(interval);
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log('\n[Ingestión] Deteniendo...');
        clearInterval(interval);
        process.exit(0);
      });
    } else {
      // Solo un ciclo
      await runCycle(ingestor);
      console.log('[Ingestión] Ciclo completado');
      process.exit(0);
    }
  } catch (error) {
    console.error('[Ingestión] Error fatal:', error);
    process.exit(1);
  }
}

async function runCycle(ingestor: GoogleDriveIngestorService): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] Iniciando ciclo de ingestión...`);

  try {
    const results = await ingestor.runIngestionCycle();

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`[Ingestión] Resultados:`);
    console.log(`  - Procesados exitosamente: ${successCount}`);
    console.log(`  - Fallidos: ${failCount}`);

    if (failCount > 0) {
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`    - ${r.fileName}: ${r.error}`);
        });
    }
  } catch (error) {
    console.error('[Ingestión] Error en el ciclo:', error);
  }
}

// Parsear argumentos
const args = process.argv.slice(2);
const watchMode = args.includes('--watch') || args.includes('-w');

runIngestion(watchMode);
