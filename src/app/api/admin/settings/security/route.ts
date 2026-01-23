import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Mock in-memory storage for demo purposes
let securitySettings = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecial: false,
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  twoFactorEnabled: false,
  corsOrigins: ['http://localhost:3000'],
  jwtExpiryHours: 24,
  refreshTokenExpiryDays: 7,
};

// GET /api/admin/settings/security
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ data: securitySettings });
  } catch (error) {
    console.error('Error fetching security settings:', error);
    return NextResponse.json({ error: 'Failed to fetch security settings' }, { status: 500 });
  }
}

// PUT /api/admin/settings/security
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate password settings
    if (body.passwordMinLength !== undefined) {
      if (body.passwordMinLength < 6 || body.passwordMinLength > 32) {
        return NextResponse.json(
          { error: 'Password minimum length must be between 6 and 32' },
          { status: 400 }
        );
      }
    }

    // Validate session settings
    if (body.sessionTimeoutMinutes !== undefined) {
      if (body.sessionTimeoutMinutes < 15 || body.sessionTimeoutMinutes > 1440) {
        return NextResponse.json(
          { error: 'Session timeout must be between 15 and 1440 minutes' },
          { status: 400 }
        );
      }
    }

    if (body.maxLoginAttempts !== undefined) {
      if (body.maxLoginAttempts < 3 || body.maxLoginAttempts > 10) {
        return NextResponse.json(
          { error: 'Max login attempts must be between 3 and 10' },
          { status: 400 }
        );
      }
    }

    if (body.lockoutDurationMinutes !== undefined) {
      if (body.lockoutDurationMinutes < 5 || body.lockoutDurationMinutes > 1440) {
        return NextResponse.json(
          { error: 'Lockout duration must be between 5 and 1440 minutes' },
          { status: 400 }
        );
      }
    }

    // Validate JWT settings
    if (body.jwtExpiryHours !== undefined) {
      if (body.jwtExpiryHours < 1 || body.jwtExpiryHours > 168) {
        return NextResponse.json(
          { error: 'JWT expiry must be between 1 and 168 hours' },
          { status: 400 }
        );
      }
    }

    if (body.refreshTokenExpiryDays !== undefined) {
      if (body.refreshTokenExpiryDays < 1 || body.refreshTokenExpiryDays > 30) {
        return NextResponse.json(
          { error: 'Refresh token expiry must be between 1 and 30 days' },
          { status: 400 }
        );
      }
    }

    // Validate CORS origins
    if (body.corsOrigins !== undefined) {
      if (!Array.isArray(body.corsOrigins)) {
        return NextResponse.json({ error: 'CORS origins must be an array' }, { status: 400 });
      }
      for (const origin of body.corsOrigins) {
        if (typeof origin !== 'string') {
          return NextResponse.json({ error: 'CORS origins must be strings' }, { status: 400 });
        }
        if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
          return NextResponse.json(
            { error: 'CORS origin must be a valid URL starting with http:// or https://' },
            { status: 400 }
          );
        }
      }
    }

    // Update settings
    securitySettings = {
      passwordMinLength: body.passwordMinLength ?? securitySettings.passwordMinLength,
      passwordRequireUppercase:
        body.passwordRequireUppercase ?? securitySettings.passwordRequireUppercase,
      passwordRequireLowercase:
        body.passwordRequireLowercase ?? securitySettings.passwordRequireLowercase,
      passwordRequireNumbers:
        body.passwordRequireNumbers ?? securitySettings.passwordRequireNumbers,
      passwordRequireSpecial:
        body.passwordRequireSpecial ?? securitySettings.passwordRequireSpecial,
      sessionTimeoutMinutes: body.sessionTimeoutMinutes ?? securitySettings.sessionTimeoutMinutes,
      maxLoginAttempts: body.maxLoginAttempts ?? securitySettings.maxLoginAttempts,
      lockoutDurationMinutes:
        body.lockoutDurationMinutes ?? securitySettings.lockoutDurationMinutes,
      twoFactorEnabled: body.twoFactorEnabled ?? securitySettings.twoFactorEnabled,
      corsOrigins: body.corsOrigins ?? securitySettings.corsOrigins,
      jwtExpiryHours: body.jwtExpiryHours ?? securitySettings.jwtExpiryHours,
      refreshTokenExpiryDays:
        body.refreshTokenExpiryDays ?? securitySettings.refreshTokenExpiryDays,
    };

    // Log the change for audit
    console.log(
      `[AUDIT] Admin ${session.user.email} updated security settings at ${new Date().toISOString()}`
    );

    return NextResponse.json({
      success: true,
      data: securitySettings,
    });
  } catch (error) {
    console.error('Error updating security settings:', error);
    return NextResponse.json({ error: 'Failed to update security settings' }, { status: 500 });
  }
}
