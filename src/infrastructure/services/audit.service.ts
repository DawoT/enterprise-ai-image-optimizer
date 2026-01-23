import { PrismaClient, AuditLog } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { TYPES } from '../types';

/**
 * Tipos de eventos auditables en el sistema.
 */
export enum AuditEventType {
  JOB_CREATED = 'JOB_CREATED',
  JOB_QUEUED = 'JOB_QUEUED',
  AI_ANALYSIS_STARTED = 'AI_ANALYSIS_STARTED',
  AI_ANALYSIS_COMPLETED = 'AI_ANALYSIS_COMPLETED',
  VERSION_GENERATION_STARTED = 'VERSION_GENERATION_STARTED',
  VERSIONS_GENERATED = 'VERSIONS_GENERATED',
  JOB_COMPLETED = 'JOB_COMPLETED',
  JOB_FAILED = 'JOB_FAILED',
  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_DOWNLOADED = 'FILE_DOWNLOADED',
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
}

/**
 * Contexto adicional para eventos de auditoría.
 */
export interface AuditContext {
  jobId?: string;
  fileName?: string;
  versionType?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Puerto para el servicio de auditoría.
 */
export interface AuditService {
  log(
    eventType: AuditEventType,
    entityType: string,
    entityId: string,
    performedBy?: string,
    context?: AuditContext
  ): Promise<void>;
  logJobCreated(
    jobId: string,
    fileName: string,
    source: string,
    context?: AuditContext
  ): Promise<void>;
  logAIAnalysisCompleted(
    jobId: string,
    hasSuggestedCrop: boolean,
    qualityScore: number,
    context?: AuditContext
  ): Promise<void>;
  logVersionsGenerated(jobId: string, versionCount: number, context?: AuditContext): Promise<void>;
  logJobFailed(jobId: string, errorMessage: string, context?: AuditContext): Promise<void>;
  getAuditLogs(
    entityType?: string,
    entityId?: string,
    eventType?: AuditEventType,
    limit?: number
  ): Promise<AuditLog[]>;
}

/**
 * Implementación del servicio de auditoría usando Prisma.
 */
@injectable()
export class PrismaAuditService implements AuditService {
  constructor(@inject(TYPES.PrismaClient) private readonly prisma: PrismaClient) {}

  /**
   * Registra un evento de auditoría genérico.
   */
  async log(
    eventType: AuditEventType,
    entityType: string,
    entityId: string,
    performedBy?: string,
    context?: AuditContext
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          entityType,
          entityId,
          action: eventType,
          performedBy: performedBy || 'system',
          metadata: {
            ...context?.metadata,
            jobId: context?.jobId,
            fileName: context?.fileName,
            versionType: context?.versionType,
            errorMessage: context?.errorMessage,
          } as Record<string, unknown>,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
      });
    } catch (error) {
      // No lanzar error para no interrumpir el flujo principal
      console.error('Error al registrar auditoría:', error);
    }
  }

  /**
   * Registra la creación de un trabajo.
   */
  async logJobCreated(
    jobId: string,
    fileName: string,
    source: string,
    context?: AuditContext
  ): Promise<void> {
    await this.log(AuditEventType.JOB_CREATED, 'ImageJob', jobId, 'system', {
      jobId,
      fileName,
      metadata: { source },
      ...context,
    });
  }

  /**
   * Registra la completación del análisis de IA.
   */
  async logAIAnalysisCompleted(
    jobId: string,
    hasSuggestedCrop: boolean,
    qualityScore: number,
    context?: AuditContext
  ): Promise<void> {
    await this.log(AuditEventType.AI_ANALYSIS_COMPLETED, 'ImageJob', jobId, 'ai-service', {
      jobId,
      metadata: {
        hasSuggestedCrop,
        qualityScore,
      },
      ...context,
    });
  }

  /**
   * Registra la generación de versiones.
   */
  async logVersionsGenerated(
    jobId: string,
    versionCount: number,
    context?: AuditContext
  ): Promise<void> {
    await this.log(AuditEventType.VERSIONS_GENERATED, 'ImageJob', jobId, 'system', {
      jobId,
      metadata: { versionCount },
      ...context,
    });
  }

  /**
   * Registra el fallo de un trabajo.
   */
  async logJobFailed(jobId: string, errorMessage: string, context?: AuditContext): Promise<void> {
    await this.log(AuditEventType.JOB_FAILED, 'ImageJob', jobId, 'system', {
      jobId,
      errorMessage,
      ...context,
    });
  }

  /**
   * Obtiene logs de auditoría con filtros opcionales.
   */
  async getAuditLogs(
    entityType?: string,
    entityId?: string,
    eventType?: AuditEventType,
    limit: number = 100
  ): Promise<AuditLog[]> {
    const where: Record<string, unknown> = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (eventType) where.action = eventType;

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
