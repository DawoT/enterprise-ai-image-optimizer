import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Mock subscription data
const mockSubscription = {
  id: 'sub_123456',
  planName: 'Pro',
  status: 'active',
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  cancelAtPeriodEnd: false,
  paymentMethod: {
    id: 'pm_123',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2025,
  },
  amount: 4900,
  currency: 'usd',
  interval: 'month',
};

// GET /api/admin/billing/subscription
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, fetch from Stripe and database
    // const subscription = await stripe.subscriptions.retrieve(...);
    // const user = await prisma.user.findUnique(...);

    return NextResponse.json({ data: mockSubscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}

// POST /api/admin/billing/subscribe
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // In production:
    // 1. Fetch plan from database
    // 2. Update Stripe subscription
    // 3. Update user record in database
    // 4. Send confirmation email

    // Mock successful plan change
    const planNames: Record<string, string> = {
      plan_free: 'Free',
      plan_pro: 'Pro',
      plan_enterprise: 'Enterprise',
    };

    mockSubscription.planName = planNames[planId] || 'Unknown';

    // Log the change for audit
    console.log(
      `[AUDIT] User ${session.user.email} changed subscription to ${planId} at ${new Date().toISOString()}`
    );

    return NextResponse.json({
      success: true,
      data: mockSubscription,
    });
  } catch (error) {
    console.error('Error changing subscription:', error);
    return NextResponse.json({ error: 'Failed to change subscription' }, { status: 500 });
  }
}

// POST /api/admin/billing/cancel
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // In production:
    // const subscription = await stripe.subscriptions.retrieve(...);
    // if (action === 'cancel') {
    //   await stripe.subscriptions.update(subscription.id, {
    //     cancel_at_period_end: true,
    //   });
    // } else if (action === 'resume') {
    //   await stripe.subscriptions.update(subscription.id, {
    //     cancel_at_period_end: false,
    //   });
    // }

    if (action === 'cancel') {
      mockSubscription.cancelAtPeriodEnd = true;
    } else if (action === 'resume') {
      mockSubscription.cancelAtPeriodEnd = false;
    }

    // Log the change for audit
    console.log(
      `[AUDIT] User ${session.user.email} ${action} subscription at ${new Date().toISOString()}`
    );

    return NextResponse.json({
      success: true,
      data: mockSubscription,
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
