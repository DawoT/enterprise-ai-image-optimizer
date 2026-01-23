import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Mock in-memory storage for demo purposes
let generalSettings = {
  appName: 'Enterprise AI Image Optimizer',
  timezone: 'America/New_York',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  defaultLanguage: 'en',
  maintenanceMode: false,
  logLevel: 'info',
};

// GET /api/admin/settings/general
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, fetch from database
    // const settings = await prisma.systemSettings.findUnique({
    //   where: { category: 'general' },
    // });

    return NextResponse.json({ data: generalSettings });
  } catch (error) {
    console.error('Error fetching general settings:', error);
    return NextResponse.json({ error: 'Failed to fetch general settings' }, { status: 500 });
  }
}

// PUT /api/admin/settings/general
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.appName || typeof body.appName !== 'string') {
      return NextResponse.json({ error: 'Application name is required' }, { status: 400 });
    }

    if (body.appName.length > 100) {
      return NextResponse.json(
        { error: 'Application name must be less than 100 characters' },
        { status: 400 }
      );
    }

    // Validate timezone
    const validTimezones = [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Singapore',
      'Australia/Sydney',
    ];
    if (!validTimezones.includes(body.timezone)) {
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
    }

    // Update settings
    generalSettings = {
      appName: body.appName,
      timezone: body.timezone || generalSettings.timezone,
      dateFormat: body.dateFormat || generalSettings.dateFormat,
      timeFormat: body.timeFormat || generalSettings.timeFormat,
      defaultLanguage: body.defaultLanguage || generalSettings.defaultLanguage,
      maintenanceMode: body.maintenanceMode || false,
      logLevel: body.logLevel || 'info',
    };

    // In production, save to database
    // await prisma.systemSettings.upsert({
    //   where: { category: 'general' },
    //   update: { data: JSON.stringify(generalSettings) },
    //   create: { category: 'general', data: JSON.stringify(generalSettings) },
    // });

    // Log the change for audit
    console.log(
      `[AUDIT] Admin ${session.user.email} updated general settings at ${new Date().toISOString()}`
    );

    return NextResponse.json({
      success: true,
      data: generalSettings,
    });
  } catch (error) {
    console.error('Error updating general settings:', error);
    return NextResponse.json({ error: 'Failed to update general settings' }, { status: 500 });
  }
}
