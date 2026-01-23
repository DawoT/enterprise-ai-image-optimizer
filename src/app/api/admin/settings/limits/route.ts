import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Mock in-memory storage for demo purposes
let limitsSettings = {
  maxRequestsPerUser: 1000,
  maxConcurrentProcesses: 5,
  maxFileSizeMB: 50,
  maxStoragePerUserMB: 10240,
  rateLimitWindowMinutes: 15,
  allowedFileTypes: ['jpg', 'png', 'webp', 'gif'],
  maxImageDimensions: { width: 4096, height: 4096 },
  quotaWarningThreshold: 80,
  maxWebhooks: 10,
};

// GET /api/admin/settings/limits
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ data: limitsSettings });
  } catch (error) {
    console.error('Error fetching limits settings:', error);
    return NextResponse.json({ error: 'Failed to fetch limits settings' }, { status: 500 });
  }
}

// PUT /api/admin/settings/limits
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request limits
    if (body.maxRequestsPerUser !== undefined) {
      if (body.maxRequestsPerUser < 100 || body.maxRequestsPerUser > 100000) {
        return NextResponse.json(
          { error: 'Max requests must be between 100 and 100,000' },
          { status: 400 }
        );
      }
    }

    if (body.maxConcurrentProcesses !== undefined) {
      if (body.maxConcurrentProcesses < 1 || body.maxConcurrentProcesses > 50) {
        return NextResponse.json(
          { error: 'Max concurrent processes must be between 1 and 50' },
          { status: 400 }
        );
      }
    }

    // Validate storage limits
    if (body.maxFileSizeMB !== undefined) {
      if (body.maxFileSizeMB < 1 || body.maxFileSizeMB > 200) {
        return NextResponse.json(
          { error: 'Max file size must be between 1 and 200 MB' },
          { status: 400 }
        );
      }
    }

    if (body.maxStoragePerUserMB !== undefined) {
      if (body.maxStoragePerUserMB < 1024 || body.maxStoragePerUserMB > 1048576) {
        return NextResponse.json(
          { error: 'Max storage must be between 1 GB and 1 TB' },
          { status: 400 }
        );
      }
    }

    if (body.rateLimitWindowMinutes !== undefined) {
      if (body.rateLimitWindowMinutes < 1 || body.rateLimitWindowMinutes > 60) {
        return NextResponse.json(
          { error: 'Rate limit window must be between 1 and 60 minutes' },
          { status: 400 }
        );
      }
    }

    // Validate file types
    if (body.allowedFileTypes !== undefined) {
      if (!Array.isArray(body.allowedFileTypes)) {
        return NextResponse.json({ error: 'Allowed file types must be an array' }, { status: 400 });
      }
      for (const type of body.allowedFileTypes) {
        if (typeof type !== 'string' || !/^[a-z0-9]+$/.test(type)) {
          return NextResponse.json(
            { error: 'Invalid file type. Only alphanumeric characters allowed.' },
            { status: 400 }
          );
        }
      }
    }

    // Validate image dimensions
    if (body.maxImageDimensions !== undefined) {
      if (body.maxImageDimensions.width !== undefined) {
        if (body.maxImageDimensions.width < 100 || body.maxImageDimensions.width > 8192) {
          return NextResponse.json(
            { error: 'Max width must be between 100 and 8192 pixels' },
            { status: 400 }
          );
        }
      }
      if (body.maxImageDimensions.height !== undefined) {
        if (body.maxImageDimensions.height < 100 || body.maxImageDimensions.height > 8192) {
          return NextResponse.json(
            { error: 'Max height must be between 100 and 8192 pixels' },
            { status: 400 }
          );
        }
      }
    }

    // Validate quota threshold
    if (body.quotaWarningThreshold !== undefined) {
      if (body.quotaWarningThreshold < 50 || body.quotaWarningThreshold > 100) {
        return NextResponse.json(
          { error: 'Quota warning threshold must be between 50 and 100' },
          { status: 400 }
        );
      }
    }

    // Validate webhooks limit
    if (body.maxWebhooks !== undefined) {
      if (body.maxWebhooks < 1 || body.maxWebhooks > 100) {
        return NextResponse.json(
          { error: 'Max webhooks must be between 1 and 100' },
          { status: 400 }
        );
      }
    }

    // Update settings
    limitsSettings = {
      maxRequestsPerUser: body.maxRequestsPerUser ?? limitsSettings.maxRequestsPerUser,
      maxConcurrentProcesses: body.maxConcurrentProcesses ?? limitsSettings.maxConcurrentProcesses,
      maxFileSizeMB: body.maxFileSizeMB ?? limitsSettings.maxFileSizeMB,
      maxStoragePerUserMB: body.maxStoragePerUserMB ?? limitsSettings.maxStoragePerUserMB,
      rateLimitWindowMinutes: body.rateLimitWindowMinutes ?? limitsSettings.rateLimitWindowMinutes,
      allowedFileTypes: body.allowedFileTypes ?? limitsSettings.allowedFileTypes,
      maxImageDimensions: body.maxImageDimensions ?? limitsSettings.maxImageDimensions,
      quotaWarningThreshold: body.quotaWarningThreshold ?? limitsSettings.quotaWarningThreshold,
      maxWebhooks: body.maxWebhooks ?? limitsSettings.maxWebhooks,
    };

    // Log the change for audit
    console.log(
      `[AUDIT] Admin ${session.user.email} updated limits settings at ${new Date().toISOString()}`
    );

    return NextResponse.json({
      success: true,
      data: limitsSettings,
    });
  } catch (error) {
    console.error('Error updating limits settings:', error);
    return NextResponse.json({ error: 'Failed to update limits settings' }, { status: 500 });
  }
}
