import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Mock usage stats data
const mockUsageStats = {
  used: 7250,
  limit: 10000,
  resetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  metricName: 'Images Processed',
  usageByDay: [
    { date: '2024-01-15', count: 450 },
    { date: '2024-01-16', count: 520 },
    { date: '2024-01-17', count: 380 },
    { date: '2024-01-18', count: 610 },
    { date: '2024-01-19', count: 490 },
    { date: '2024-01-20', count: 320 },
    { date: '2024-01-21', count: 550 },
  ],
};

// GET /api/admin/billing/usage-stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, calculate from database
    // const usage = await prisma.imageProcessing.aggregate({
    //   where: {
    //     userId: session.user.id,
    //     createdAt: { gte: startOfMonth },
    //   },
    //   _count: true,
    // });

    return NextResponse.json({ data: mockUsageStats });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json({ error: 'Failed to fetch usage stats' }, { status: 500 });
  }
}

// POST /api/admin/billing/usage-alerts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { threshold } = body;

    if (!threshold || threshold < 50 || threshold > 100) {
      return NextResponse.json({ error: 'Threshold must be between 50 and 100' }, { status: 400 });
    }

    // In production, save to database
    // await prisma.user.update({
    //   where: { id: session.user.id },
    //   data: { usageAlertThreshold: threshold },
    // });

    return NextResponse.json({
      success: true,
      message: `Alert threshold set to ${threshold}%`,
    });
  } catch (error) {
    console.error('Error setting usage alert:', error);
    return NextResponse.json({ error: 'Failed to set usage alert' }, { status: 500 });
  }
}
