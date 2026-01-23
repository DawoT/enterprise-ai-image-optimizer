/**
 * PATCH /api/admin/users/[id]
 * Actualiza el rol y estado de un usuario
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { container } from '@/infrastructure/di/container';
import { UserRepository } from '@/core/domain/interfaces/user.repository.interface';
import { DomainError } from '@/core/domain/errors/domain-error';
import { z } from 'zod';

/**
 * Schema de validación para actualizar usuario
 */
const updateUserSchema = z
  .object({
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER']).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']).optional(),
  })
  .refine((data) => data.role !== undefined || data.status !== undefined, {
    message: 'Debes proporcionar al menos un campo para actualizar',
    path: ['root'],
  });

/**
 * GET /api/admin/users/[id]
 * Obtiene los detalles de un usuario específico
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado', message: 'Debes iniciar sesión para acceder a este recurso' },
        { status: 401 }
      );
    }

    // Verificar rol de administrador
    const userRole = (session.user as { role?: string }).role;
    if (!userRole || !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json(
        {
          error: 'Prohibido',
          message: 'Se requiere rol de administrador para acceder a este recurso',
        },
        { status: 403 }
      );
    }

    const { id } = params;

    // Resolver dependencias
    const userRepository = container.resolve<UserRepository>('UserRepository');

    // Buscar usuario
    const user = await userRepository.findById(id);

    if (!user) {
      return NextResponse.json(
        { error: 'No encontrado', message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: user.id.value,
        name: user.name.value,
        email: user.email.value,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        lastLogin: user.lastLogin?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);

    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Actualiza el rol y/o estado de un usuario
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado', message: 'Debes iniciar sesión para acceder a este recurso' },
        { status: 401 }
      );
    }

    // Verificar rol de administrador
    const userRole = (session.user as { role?: string }).role;
    if (!userRole || !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json(
        {
          error: 'Prohibido',
          message: 'Se requiere rol de administrador para acceder a este recurso',
        },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Validar cuerpo de la solicitud
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { role, status } = validation.data;

    // Resolver dependencias
    const userRepository = container.resolve<UserRepository>('UserRepository');

    // Buscar usuario
    const user = await userRepository.findById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'No encontrado', message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Prevenir self-demotion (un admin no puede quitarse sus propios privilegios)
    const currentUserId = session.user?.email;
    if (user.email.value === currentUserId && role && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        {
          error: 'Operación no permitida',
          message: 'No puedes quitarte tus propios privilegios de administrador',
        },
        { status: 403 }
      );
    }

    // Verificar si es el último administrador
    if (role && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      const adminCount = await userRepository.countByRole(['ADMIN', 'SUPER_ADMIN']);
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error: 'Operación no permitida',
            message: 'No puedes quitar el rol de administrador al último administrador del sistema',
          },
          { status: 403 }
        );
      }
    }

    // Actualizar usuario
    if (role) {
      user.updateRole(role);
    }
    if (status) {
      user.updateStatus(status);
    }

    await userRepository.save(user);

    // Registrar en auditoría
    const auditService = container.resolve('AuditService');
    await auditService.log({
      action: 'USER_UPDATED',
      userId: session.user?.email as string,
      resourceType: 'USER',
      resourceId: id,
      details: { role, status },
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({
      message: 'Usuario actualizado correctamente',
      data: {
        id: user.id.value,
        name: user.name.value,
        email: user.email.value,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);

    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
