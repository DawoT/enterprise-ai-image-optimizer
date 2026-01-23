import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Mock in-memory storage for demo purposes
let plans = [
  {
    id: 'plan_free',
    name: 'Free',
    description: 'Get started with basic features',
    priceId: 'price_free',
    amount: 0,
    currency: 'usd',
    interval: 'month',
    isActive: true,
    features: ['100 images/month', 'Basic optimization', 'Email support'],
    limits: { images: 100, storageGB: 1 },
    popular: false,
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    description: 'Perfect for growing businesses',
    priceId: 'price_pro',
    amount: 4900,
    currency: 'usd',
    interval: 'month',
    isActive: true,
    features: ['10,000 images/month', 'Advanced optimization', 'Priority support', 'API access'],
    limits: { images: 10000, storageGB: 50 },
    popular: true,
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    priceId: 'price_enterprise',
    amount: 49900,
    currency: 'usd',
    interval: 'month',
    isActive: true,
    features: [
      'Unlimited images',
      'Custom optimization',
      'Dedicated support',
      'SLA guarantee',
      'SSO integration',
    ],
    limits: { images: -1, storageGB: 1000 },
    popular: false,
  },
];

// GET /api/admin/billing/plans
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ data: plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

// POST /api/admin/billing/plans
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Plan name is required' }, { status: 400 });
    }

    if (body.amount === undefined || body.amount === null || body.amount < 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }

    if (!body.features || !Array.isArray(body.features) || body.features.length === 0) {
      return NextResponse.json({ error: 'At least one feature is required' }, { status: 400 });
    }

    // Check for duplicate name
    if (plans.some((p) => p.name.toLowerCase() === body.name.toLowerCase())) {
      return NextResponse.json({ error: 'Plan name must be unique' }, { status: 400 });
    }

    const newPlan = {
      id: `plan_${Date.now()}`,
      name: body.name,
      description: body.description || '',
      priceId: body.priceId || `price_${Date.now()}`,
      amount: body.amount,
      currency: body.currency || 'usd',
      interval: body.interval || 'month',
      isActive: body.isActive !== false,
      features: body.features,
      limits: {
        images: body.limits?.images || 1000,
        storageGB: body.limits?.storageGB || 10,
      },
      popular: body.popular || false,
    };

    plans.push(newPlan);

    // Log the change for audit
    console.log(
      `[AUDIT] Admin ${session.user.email} created plan ${newPlan.id} at ${new Date().toISOString()}`
    );

    return NextResponse.json({ data: newPlan }, { status: 201 });
  } catch (error) {
    console.error('Error creating plan:', error);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}
