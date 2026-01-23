import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/admin/billing/create-portal-session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, create Stripe Customer Portal session
    // const session = await stripe.billingPortal.sessions.create({
    //   customer: user.stripeCustomerId,
    //   return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing`,
    // });

    // Mock response
    const mockPortalUrl = 'https://billing.stripe.com/p/session/test_123';

    return NextResponse.json({
      url: mockPortalUrl,
      sessionId: 'portal_session_123',
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 });
  }
}
