/**
 * Interfaz base para todos los casos de uso del dominio.
 * Define el contrato que todo caso de uso debe cumplir.
 */
export interface UseCase<TInput, TOutput> {
  /**
   * Ejecuta el caso de uso con los parámetros dados.
   */
  execute(params: TInput): Promise<TOutput> | TOutput;
}

/**
 * Interfaz para casos de uso de solo lectura (queries).
 */
export interface Query<TInput, TOutput> extends UseCase<TInput, TOutput> {
  // Marker interface for queries
}

/**
 * Interfaz para casos de uso que modifican estado (commands).
 */
export interface Command<TInput, TOutput> extends UseCase<TInput, TOutput> {
  // Marker interface for commands
}

/**
 * Resultado nulo para casos de uso que no retornan datos.
 */
export interface UnitResult {
  readonly success: boolean;
}

/**
 * Crea un resultado de unidad exitoso.
 */
export function unitResult(): UnitResult {
  return { success: true };
}
