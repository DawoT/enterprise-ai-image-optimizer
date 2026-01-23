import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Mock data storage
const plans = [
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
];

// GET /api/admin/billing/plans/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = plans.find((p) => p.id === params.id);

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ data: plan });
  } catch (error) {
    console.error('Error fetching plan:', error);
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 });
  }
}

// PUT /api/admin/billing/plans/[id]
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const planIndex = plans.findIndex((p) => p.id === params.id);

    if (planIndex === -1) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Prevent changing the free plan ID
    if (params.id === 'plan_free' && body.id && body.id !== 'plan_free') {
      return NextResponse.json({ error: 'Cannot change the ID of the free plan' }, { status: 400 });
    }

    // Check for duplicate name
    if (body.name && body.name !== plans[planIndex].name) {
      if (
        plans.some((p) => p.name.toLowerCase() === body.name.toLowerCase() && p.id !== params.id)
      ) {
        return NextResponse.json({ error: 'Plan name must be unique' }, { status: 400 });
      }
    }

    // Update plan
    plans[planIndex] = {
      ...plans[planIndex],
      name: body.name ?? plans[planIndex].name,
      description: body.description ?? plans[planIndex].description,
      amount: body.amount ?? plans[planIndex].amount,
      currency: body.currency ?? plans[planIndex].currency,
      interval: body.interval ?? plans[planIndex].interval,
      isActive: body.isActive ?? plans[planIndex].isActive,
      features: body.features ?? plans[planIndex].features,
      limits: body.limits ?? plans[planIndex].limits,
      popular: body.popular ?? plans[planIndex].popular,
      priceId: body.priceId ?? plans[planIndex].priceId,
    };

    // Log the change for audit
    console.log(
      `[AUDIT] Admin ${session.user.email} updated plan ${params.id} at ${new Date().toISOString()}`
    );

    return NextResponse.json({ data: plans[planIndex] });
  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

// DELETE /api/admin/billing/plans/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (params.id === 'plan_free') {
      return NextResponse.json({ error: 'Cannot delete the free plan' }, { status: 400 });
    }

    const planIndex = plans.findIndex((p) => p.id === params.id);

    if (planIndex === -1) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const deletedPlan = plans.splice(planIndex, 1)[0];

    // Log the change for audit
    console.log(
      `[AUDIT] Admin ${session.user.email} deleted plan ${params.id} at ${new Date().toISOString()}`
    );

    return NextResponse.json({ success: true, data: deletedPlan });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}
