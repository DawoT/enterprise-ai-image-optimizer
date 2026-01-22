/**
 * Interfaz base para todas las entidades del dominio.
 * Define el contrato fundamental que toda entidad debe cumplir.
 */
export interface Entity<TIdentity> {
  /**
   * Obtiene la identidad única de la entidad.
   */
  readonly id: TIdentity;

  /**
   * Compara dos entidades por igualdad de identidad.
   * Dos entidades son iguales si tienen el mismo ID.
   */
  equals(other: this): boolean;
}

/**
 * Interfaz para objetos de valor que representan conceptos medibles o descriptivos.
 */
export interface ValueObject<T> {
  /**
   * Compara dos objetos de valor por igualdad de contenido.
   */
  equals(other: this): boolean;

  /**
   * Obtiene el valor primitivo representado.
   */
  readonly value: T;
}

/**
 * Interfaz base para repositorios que definen operaciones de persistencia.
 */
export interface Repository<T, TIdentity, TPersist> {
  /**
   * Guarda una entidad en el repositorio.
   */
  save(entity: T): Promise<T>;

  /**
   * Busca una entidad por su identidad.
   */
  findById(id: TIdentity): Promise<T | null>;

  /**
   * Busca todas las entidades.
   */
  findAll(): Promise<T[]>;

  /**
   * Elimina una entidad del repositorio.
   */
  delete(id: TIdentity): Promise<void>;

  /**
   * Verifica si existe una entidad con la identidad dada.
   */
  exists(id: TIdentity): Promise<boolean>;
}

/**
 * Interfaz para servicios del dominio que contienen lógica de negocio compleja.
 */
export interface DomainService {
  // Marker interface for domain services
}

/**
 * Interfaz para factories que crean entidades del dominio.
 */
export interface Factory<T, TProps> {
  /**
   * Crea una nueva instancia de la entidad.
   */
  create(props: TProps): T;
}
