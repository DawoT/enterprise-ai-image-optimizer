/**
 * Puerto para el servicio de almacenamiento de imágenes.
 * Define las operaciones para guardar y recuperar archivos.
 */
export interface ImageStorageService {
  /**
   * Almacena un archivo y retorna la ruta donde fue guardado.
   */
  store(
    buffer: Buffer,
    jobId: string,
    fileName: string,
  ): Promise<string>;

  /**
   * Recupera un archivo por su ruta.
   */
  retrieve(filePath: string): Promise<Buffer>;

  /**
   * Elimina un archivo.
   */
  delete(filePath: string): Promise<void>;

  /**
   * Verifica si existe un archivo.
   */
  exists(filePath: string): Promise<boolean>;

  /**
   * Genera una URL pública para acceder al archivo.
   */
  getPublicUrl(filePath: string): Promise<string>;

  /**
   * Lista todos los archivos en un directorio.
   */
  listFiles(directory: string): Promise<string[]>;
}
