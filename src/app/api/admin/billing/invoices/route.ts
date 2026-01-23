import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Mock invoices data
const mockInvoices = [
  {
    id: 'inv_001',
    created: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60,
    amount_paid: 4900,
    currency: 'usd',
    status: 'paid',
    pdf_url: 'https://example.com/invoices/inv-001.pdf',
    description: 'Pro Tier - January 2024',
  },
  {
    id: 'inv_002',
    created: Math.floor(Date.now() / 1000) - 37 * 24 * 60 * 60,
    amount_paid: 4900,
    currency: 'usd',
    status: 'paid',
    pdf_url: 'https://example.com/invoices/inv-002.pdf',
    description: 'Pro Tier - December 2023',
  },
  {
    id: 'inv_003',
    created: Math.floor(Date.now() / 1000) - 67 * 24 * 60 * 60,
    amount_paid: 4900,
    currency: 'usd',
    status: 'paid',
    pdf_url: 'https://example.com/invoices/inv-003.pdf',
    description: 'Pro Tier - November 2023',
  },
];

// GET /api/admin/billing/invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // In production, fetch from Stripe
    // const invoices = await stripe.invoices.list({
    //   customer: user.stripeCustomerId,
    //   limit,
    //   starting_after: offset,
    // });

    let filteredInvoices = mockInvoices;

    if (status && status !== 'all') {
      filteredInvoices = mockInvoices.filter((inv) => inv.status === status);
    }

    const paginatedInvoices = filteredInvoices.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedInvoices,
      total: filteredInvoices.length,
      hasMore: offset + limit < filteredInvoices.length,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
