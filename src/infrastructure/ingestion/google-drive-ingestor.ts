import { google, drive_v3 } from 'googleapis';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../core/types';
import { ImageStorageService } from '../../core/interfaces/image-storage-service.interface';
import { ImageJobRepository } from '../../core/interfaces/image-job.repository.interface';
import { CreateImageJobUseCase } from '../../core/use-cases/create-image-job.use-case';

/**
 * Configuración para la autenticación de Google Drive.
 */
export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
  folderId: string;
}

/**
 * Archivo encontrado en Google Drive.
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  webViewLink?: string;
}

/**
 * Resultado de la ingestión desde Google Drive.
 */
export interface IngestionResult {
  success: boolean;
  jobId?: string;
  fileName: string;
  error?: string;
}

/**
 * Puerto para el servicio de ingestión de Google Drive.
 */
export interface GoogleDriveIngestor {
  /**
   * Lista archivos nuevos en la carpeta configurada.
   */
  listNewFiles(): Promise<DriveFile[]>;

  /**
   * Descarga un archivo de Google Drive.
   */
  downloadFile(fileId: string): Promise<Buffer>;

  /**
   * Procesa un archivo de Google Drive y crea un trabajo de procesamiento.
   */
  ingestFile(fileId: string, fileName: string): Promise<IngestionResult>;

  /**
   * Ejecuta el ciclo completo de ingestión.
   */
  runIngestionCycle(): Promise<IngestionResult[]>;
}

/**
 * Implementación del ingestor de Google Drive.
 */
@injectable()
export class GoogleDriveIngestorService implements GoogleDriveIngestor {
  private drive: drive_v3.Drive | null = null;
  private processedFilesCache: Set<string> = new Set();

  constructor(
    @inject(TYPES.ImageStorageService) private readonly storageService: ImageStorageService,
    @inject(TYPES.ImageJobRepository) private readonly imageJobRepository: ImageJobRepository,
    @inject(TYPES.CreateImageJobUseCase)
    private readonly createImageJobUseCase: CreateImageJobUseCase
  ) {}

  /**
   * Inicializa el cliente de Google Drive.
   */
  private getDriveClient(): drive_v3.Drive {
    if (this.drive) return this.drive;

    const config: GoogleDriveConfig = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri:
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google',
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
    };

    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    if (config.refreshToken) {
      oauth2Client.setCredentials({
        refresh_token: config.refreshToken,
      });
    }

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
    return this.drive;
  }

  /**
   * Lista archivos nuevos en la carpeta de Google Drive.
   * Filtra por imágenes y excluye archivos ya procesados.
   */
  async listNewFiles(): Promise<DriveFile[]> {
    const drive = this.getDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID no está configurado');
    }

    try {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
        orderBy: 'createdTime desc',
        pageSize: 50,
      });

      const files = response.data.files || [];

      // Filtrar archivos ya procesados
      const newFiles = files.filter((file) => !this.processedFilesCache.has(file.id!));

      return newFiles.map((file) => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size || '0',
        createdTime: file.createdTime!,
        webViewLink: file.webViewLink,
      }));
    } catch (error) {
      console.error('Error listing Google Drive files:', error);
      throw new Error('Error al listar archivos de Google Drive');
    }
  }

  /**
   * Descarga el contenido de un archivo de Google Drive.
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    const drive = this.getDriveClient();

    try {
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      console.error(`Error downloading file ${fileId}:`, error);
      throw new Error(`Error al descargar archivo de Google Drive: ${fileId}`);
    }
  }

  /**
   * Procesa un archivo de Google Drive y crea un trabajo de procesamiento.
   */
  async ingestFile(fileId: string, fileName: string): Promise<IngestionResult> {
    try {
      // Marcar como procesado para evitar duplicados
      this.processedFilesCache.add(fileId);

      // Descargar el archivo
      const fileBuffer = await this.downloadFile(fileId);

      // Determinar el tipo MIME
      const mimeType = this.getMimeType(fileName);

      // Extraer productId del nombre del archivo si está disponible
      // Formato esperado: {productId}_{...}
      const productId = this.extractProductId(fileName);

      // Crear el trabajo de procesamiento
      const job = await this.createImageJobUseCase.execute({
        fileName,
        fileBuffer,
        mimeType,
        source: 'google-drive',
        metadata: {
          driveFileId: fileId,
          driveWebLink: `https://drive.google.com/file/d/${fileId}/view`,
        },
        productContext: productId
          ? {
              id: productId,
              category: 'imported',
              attributes: ['imported-from-drive'],
            }
          : undefined,
      });

      return {
        success: true,
        jobId: job.id.value,
        fileName,
      };
    } catch (error) {
      console.error(`Error ingesting file ${fileId}:`, error);
      return {
        success: false,
        fileName,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Ejecuta un ciclo completo de ingestión.
   * Lista archivos nuevos, los procesa y retorna los resultados.
   */
  async runIngestionCycle(): Promise<IngestionResult[]> {
    console.log('[GoogleDriveIngestor] Iniciando ciclo de ingestión...');

    try {
      const newFiles = await this.listNewFiles();
      console.log(`[GoogleDriveIngestor] Archivos nuevos encontrados: ${newFiles.length}`);

      const results: IngestionResult[] = [];

      for (const file of newFiles) {
        console.log(`[GoogleDriveIngestor] Procesando archivo: ${file.name}`);
        const result = await this.ingestFile(file.id, file.name);
        results.push(result);

        if (result.success) {
          console.log(
            `[GoogleDriveIngestor] Archivo procesado exitosamente: ${file.name}, Job ID: ${result.jobId}`
          );
        } else {
          console.error(
            `[GoogleDriveIngestor] Error procesando archivo ${file.name}: ${result.error}`
          );
        }
      }

      return results;
    } catch (error) {
      console.error('[GoogleDriveIngestor] Error en ciclo de ingestión:', error);
      throw error;
    }
  }

  /**
   * Determina el tipo MIME a partir del nombre del archivo.
   */
  private getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      tiff: 'image/tiff',
    };

    return mimeTypes[extension || ''] || 'image/jpeg';
  }

  /**
   * Extrae el productId del nombre del archivo.
   * Espera formato: {productId}_{variant}_{resolution}.{format}
   */
  private extractProductId(fileName: string): string | null {
    // Verificar si el nombre sigue la convención enterprise
    const parts = fileName.split('_');
    if (parts.length >= 2) {
      // El productId debería ser la primera parte si tiene formato válido
      // Validamos que no parezca un UUID (que indicaría formato legacy)
      const firstPart = parts[0];
      if (!firstPart.match(/^[0-9a-f]{8}-[0-9a-f]{4}/)) {
        return firstPart;
      }
    }
    return null;
  }
}
