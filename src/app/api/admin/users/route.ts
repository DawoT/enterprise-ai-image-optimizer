/**
 * GET /api/admin/users
 * Lista los usuarios del sistema con paginación y filtros
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { container } from '@/infrastructure/di/container';
import { UserRepository } from '@/core/domain/interfaces/user.repository.interface';
import { DomainError } from '@/core/domain/errors/domain-error';
import { z } from 'zod';

/**
 * Schema de validación para listar usuarios
 */
const listUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']).optional(),
});

/**
 * GET /api/admin/users
 * Lista los usuarios del sistema con paginación y filtros
 */
export async function GET(request: NextRequest) {
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

    // Validar parámetros de query
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validation = listUsersSchema.safeParse(searchParams);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, search, role, status } = validation.data;

    // Resolver dependencias
    const userRepository = container.resolve<UserRepository>('UserRepository');

    // Obtener usuarios con filtros
    const { users, total } = await userRepository.findWithFilters({
      search,
      role,
      status,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);

    // Calcular uso de API para cada usuario (simulado por ahora)
    const usersWithUsage = users.map((user) => ({
      id: user.id.value,
      name: user.name.value,
      email: user.email.value,
      role: user.role,
      status: user.status,
      usageCount: Math.floor(Math.random() * 200), // TODO: Implementar contador real
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin?.toISOString(),
    }));

    return NextResponse.json({
      data: usersWithUsage,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error al listar usuarios:', error);

    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
