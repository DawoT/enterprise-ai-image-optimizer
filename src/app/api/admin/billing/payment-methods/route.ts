import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Mock payment methods data
const mockPaymentMethods = [
  {
    id: 'pm_001',
    type: 'card',
    card: {
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2025,
    },
    isDefault: true,
  },
  {
    id: 'pm_002',
    type: 'card',
    card: {
      brand: 'mastercard',
      last4: '5555',
      expMonth: 6,
      expYear: 2026,
    },
    isDefault: false,
  },
];

// GET /api/admin/billing/payment-methods
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, fetch from Stripe
    // const paymentMethods = await stripe.paymentMethods.list({
    //   customer: user.stripeCustomerId,
    //   type: 'card',
    // });

    return NextResponse.json({ data: mockPaymentMethods });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
  }
}

// POST /api/admin/billing/payment-methods
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 });
    }

    // In production:
    // 1. Attach payment method to customer
    // await stripe.paymentMethods.attach(paymentMethodId, {
    //   customer: user.stripeCustomerId,
    // });
    // 2. Set as default if it's the first payment method
    // 3. Send confirmation email

    // Log the change for audit
    console.log(
      `[AUDIT] User ${session.user.email} added payment method ${paymentMethodId} at ${new Date().toISOString()}`
    );

    return NextResponse.json({
      success: true,
      message: 'Payment method added successfully',
    });
  } catch (error) {
    console.error('Error adding payment method:', error);
    return NextResponse.json({ error: 'Failed to add payment method' }, { status: 500 });
  }
}
