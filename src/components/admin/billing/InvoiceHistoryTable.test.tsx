/**
 * InvoiceHistoryTable Component Tests
 * Tests for invoice history display and download functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoiceHistoryTable from './InvoiceHistoryTable';

// Mock the API calls
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api';

const mockInvoices = [
  {
    id: 'inv_001',
    created: 1704067200,
    amount_paid: 4900,
    currency: 'usd',
    status: 'paid',
    pdf_url: 'https://example.com/invoice-001.pdf',
    description: 'Pro Tier - January 2024',
  },
  {
    id: 'inv_002',
    created: 1701388800,
    amount_paid: 4900,
    currency: 'usd',
    status: 'paid',
    pdf_url: 'https://example.com/invoice-002.pdf',
    description: 'Pro Tier - December 2023',
  },
  {
    id: 'inv_003',
    created: 1698710400,
    amount_paid: 4900,
    currency: 'usd',
    status: 'paid',
    pdf_url: 'https://example.com/invoice-003.pdf',
    description: 'Pro Tier - November 2023',
  },
];

const mockInvoicesWithVoid = [
  ...mockInvoices,
  {
    id: 'inv_004',
    created: 1696118400,
    amount_paid: 0,
    currency: 'usd',
    status: 'void',
    pdf_url: 'https://example.com/invoice-004.pdf',
    description: 'Canceled subscription',
  },
];

describe('InvoiceHistoryTable', () => {
  const defaultProps = {
    invoices: mockInvoices,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.open
    window.open = jest.fn();
  });

  it('renders table headers correctly', () => {
    render(<InvoiceHistoryTable {...defaultProps} />);
    
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument());
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('displays all invoices correctly', () => {
    render(<InvoiceHistoryTable {...defaultProps} />);
    
    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('Dec 1, 2023')).toBeInTheDocument();
    expect(screen.getByText('Nov 1, 2023')).toBeInTheDocument();
  });

  it('displays invoice ID correctly', () => {
    render(<InvoiceHistoryTable {...defaultProps} />);
    
    expect(screen.getByText('inv_001')).toBeInTheDocument();
    expect(screen.getByText('inv_002')).toBeInTheDocument();
  });

  it('formats currency correctly', () => {
    render(<InvoiceHistoryTable {...defaultProps} />);
    
    expect(screen.getByText('$49.00')).toBeInTheDocument();
  });

  it('displays paid status badge correctly', () => {
    render(<InvoiceHistoryTable {...defaultProps} />);
    
    const paidBadges = screen.getAllByText('Paid');
    expect(paidBadges).toHaveLength(3);
    paidBadges.forEach((badge) => {
      expect(badge).toHaveClass('bg-green-100 text-green-800');
    });
  });

  it('displays void status badge correctly', () => {
    render(<InvoiceHistoryTable invoices={mockInvoicesWithVoid} />);
    
    const voidBadge = screen.getByText('Void');
    expect(voidBadge).toHaveClass('bg-gray-100 text-gray-800');
  });

  it('displays open status badge correctly', () => {
    const openInvoice = {
      id: 'inv_005',
      created: Date.now() / 1000,
      amount_paid: 0,
      currency: 'usd',
      status: 'open',
      pdf_url: 'https://example.com/invoice-005.pdf',
      description: 'Pending payment',
    };
    render(<InvoiceHistoryTable invoices={[openInvoice]} />);
    
    const openBadge = screen.getByText('Open');
    expect(openBadge).toHaveClass('bg-yellow-100 text-yellow-800');
  });

  it('displays uncollectible status badge correctly', () => {
    const uncollectibleInvoice = {
      id: 'inv_006',
      created: Date.now() / 1000,
      amount_paid: 0,
      currency: 'usd',
      status: 'uncollectible',
      pdf_url: 'https://example.com/invoice-006.pdf',
      description: 'Failed payment',
    };
    render(<InvoiceHistoryTable invoices={[uncollectibleInvoice]} />);
    
    const uncollectibleBadge = screen.getByText('Uncollectible');
    expect(uncollectibleBadge).toHaveClass('bg-red-100 text-red-800');
  });

  it('opens PDF download when download button is clicked', async () => {
    const user = userEvent.setup();
    render(<InvoiceHistoryTable {...defaultProps} />);
    
    const downloadButtons = screen.getAllByRole('button', { name: /download/i });
    await user.click(downloadButtons[0]);
    
    expect(window.open).toHaveBeenCalledWith('https://example.com/invoice-001.pdf', '_blank');
  });

  it('calls onDownload callback when provided', async () => {
    const user = userEvent.setup();
    const onDownload = jest.fn();
    render(<InvoiceHistoryTable {...defaultProps} onDownload={onDownload} />);
    
    const downloadButtons = screen.getAllByRole('button', { name: /download/i });
    await user.click(downloadButtons[0]);
    
    expect(onDownload).toHaveBeenCalledWith(mockInvoices[0]);
  });

  it('shows empty state when no invoices', () => {
    render(<InvoiceHistoryTable invoices={[]} />);
    
    expect(screen.getByText('No invoices found')).toBeInTheDocument();
    expect(screen.getByText('Your billing history will appear here')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    render(<InvoiceHistoryTable invoices={[]} loading />);
    
    expect(screen.getByTestId('invoice-table-skeleton')).toBeInTheDocument();
  });

  it('sorts invoices by date in descending order by default', () => {
    render(<InvoiceHistoryTable {...defaultProps} />);
    
    const rows = screen.getAllByRole('row');
    // First row is header, so data starts from index 1
    expect(rows[1]).toHaveTextContent('inv_001');
    expect(rows[2]).toHaveTextContent('inv_002');
    expect(rows[3]).toHaveTextContent('inv_003');
  });

  it('sorts by amount when clicking amount header', async () => {
    const user = userEvent.setup();
    render(<InvoiceHistoryTable {...defaultProps} />);
    
    const amountHeader = screen.getByRole('columnheader', { name: /amount/i });
    await user.click(amountHeader);
    
    // Re-render with sorted invoices
    expect(screen.getByRole('columnheader', { name: /amount/i })).toHaveAttribute('aria-sort', 'ascending');
  });

  it('displays invoice description', () => {
    render(<InvoiceHistoryTable {...defaultProps} showDescription />);
    
    expect(screen.getByText('Pro Tier - January 2024')).toBeInTheDocument();
  });

  it('hides description column when showDescription is false', () => {
    render(<InvoiceHistoryTable {...defaultProps} showDescription={false} />);
    
    expect(screen.queryByText('Pro Tier - January 2024')).not.toBeInTheDocument();
  });

  it('displays customer name when provided', () => {
    render(<InvoiceHistoryTable {...defaultProps} customerName="Acme Corp" />);
    
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('displays zero amount for void invoices', () => {
    render(<InvoiceHistoryTable invoices={mockInvoicesWithVoid} />);
    
    // The void invoice should show $0.00
    const rows = screen.getAllByRole('row');
    const voidRow = rows.find((row) => row.textContent?.includes('inv_004'));
    expect(voidRow).toHaveTextContent('$0.00');
  });

  it('disables download button for void invoices', async () => {
    const user = userEvent.setup();
    render(<InvoiceHistoryTable invoices={mockInvoicesWithVoid} />);
    
    const rows = screen.getAllByRole('row');
    const voidRow = rows.find((row) => row.textContent?.includes('inv_004'));
    
    if (voidRow) {
      const downloadButton = voidRow.querySelector('button');
      expect(downloadButton).toBeDisabled();
    }
  });

  it('handles different currencies', () => {
    const euroInvoice = {
      id: 'inv_007',
      created: Date.now() / 1000,
      amount_paid: 4900,
      currency: 'eur',
      status: 'paid',
      pdf_url: 'https://example.com/invoice-007.pdf',
      description: 'Pro Tier - Euro',
    };
    render(<InvoiceHistoryTable invoices={[euroInvoice]} />);
    
    expect(screen.getByText('€49.00')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(<InvoiceHistoryTable {...defaultProps} className="custom-table" />);
    
    const tableContainer = screen.getByTestId('invoice-history-table');
    expect(tableContainer).toHaveClass('custom-table');
  });

  it('displays correct date format for different locales', () => {
    render(<InvoiceHistoryTable {...defaultProps} />);
    
    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
  });

  it('shows tooltip on hover over invoice ID', async () => {
    const user = userEvent.setup();
    render(<InvoiceHistoryTable {...defaultProps} />);
    
    const invoiceId = screen.getByText('inv_001');
    await user.hover(invoiceId);
    
    expect(await screen.findByText(/Copy invoice ID/)).toBeInTheDocument();
  });

  it('filters invoices by status when filter is provided', () => {
    render(<InvoiceHistoryTable invoices={mockInvoicesWithVoid} statusFilter="paid" />);
    
    expect(screen.queryByText('Void')).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 paid invoices
  });

  it('renders pagination controls when total exceeds page size', () => {
    const manyInvoices = Array.from({ length: 25 }, (_, i) => ({
      id: `inv_${i}`,
      created: Date.now() / 1000 - i * 86400,
      amount_paid: 4900,
      currency: 'usd',
      status: 'paid',
      pdf_url: `https://example.com/invoice-${i}.pdf`,
      description: `Invoice ${i}`,
    }));
    
    render(<InvoiceHistoryTable invoices={manyInvoices} pageSize={10} />);
    
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText(/1.*2.*3/)).toBeInTheDocument();
  });
});
