/**
 * SubscriptionStatusCard Component Tests
 * Tests for subscription status display component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubscriptionStatusCard from './SubscriptionStatusCard';

// Mock the API calls
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api';

const mockSubscription = {
  id: 'sub_123456',
  planName: 'Pro Tier',
  status: 'active',
  currentPeriodEnd: '2024-02-01T00:00:00Z',
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

describe('SubscriptionStatusCard', () => {
  const defaultProps = {
    subscription: mockSubscription,
    onUpdatePayment: jest.fn(),
    onCancelSubscription: jest.fn(),
    onManageSubscription: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders subscription plan name correctly', () => {
    render(<SubscriptionStatusCard {...defaultProps} />);

    expect(screen.getByText('Pro Tier')).toBeInTheDocument();
    expect(screen.getByText('Current Plan')).toBeInTheDocument();
  });

  it('displays active status badge correctly', () => {
    render(<SubscriptionStatusCard {...defaultProps} />);

    const statusBadge = screen.getByText('Active');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-green-100 text-green-800');
  });

  it('displays past_due status badge correctly', () => {
    const pastDueSubscription = {
      ...mockSubscription,
      status: 'past_due',
    };
    render(<SubscriptionStatusCard {...defaultProps} subscription={pastDueSubscription} />);

    const statusBadge = screen.getByText('Payment Failed');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-red-100 text-red-800');
  });

  it('displays canceled status badge correctly', () => {
    const canceledSubscription = {
      ...mockSubscription,
      status: 'canceled',
    };
    render(<SubscriptionStatusCard {...defaultProps} subscription={canceledSubscription} />);

    const statusBadge = screen.getByText('Canceled');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-gray-100 text-gray-800');
  });

  it('displays trialing status badge correctly', () => {
    const trialingSubscription = {
      ...mockSubscription,
      status: 'trialing',
    };
    render(<SubscriptionStatusCard {...defaultProps} subscription={trialingSubscription} />);

    const statusBadge = screen.getByText('Trial');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-blue-100 text-blue-800');
  });

  it('formats billing date correctly', () => {
    render(<SubscriptionStatusCard {...defaultProps} />);

    expect(screen.getByText(/Next billing date/)).toBeInTheDocument();
    expect(screen.getByText(/February 1, 2024/)).toBeInTheDocument();
  });

  it('displays payment method card icon and last 4 digits', () => {
    render(<SubscriptionStatusCard {...defaultProps} />);

    expect(screen.getByText('•••• 4242')).toBeInTheDocument();
    expect(screen.getByText('Visa')).toBeInTheDocument();
  });

  it('displays amount and currency correctly', () => {
    render(<SubscriptionStatusCard {...defaultProps} />);

    expect(screen.getByText('$49.00')).toBeInTheDocument();
    expect(screen.getByText('/ month')).toBeInTheDocument();
  });

  it('shows cancel warning when cancel_at_period_end is true', () => {
    const cancelPendingSubscription = {
      ...mockSubscription,
      cancelAtPeriodEnd: true,
    };
    render(<SubscriptionStatusCard {...defaultProps} subscription={cancelPendingSubscription} />);

    expect(screen.getByText(/Your subscription will end/)).toBeInTheDocument();
    expect(screen.getByText(/February 1, 2024/)).toBeInTheDocument();
  });

  it('does not show cancel warning when not canceling', () => {
    render(<SubscriptionStatusCard {...defaultProps} />);

    expect(screen.queryByText(/Your subscription will end/)).not.toBeInTheDocument();
  });

  it('calls onUpdatePayment when Update Payment Method is clicked', async () => {
    const user = userEvent.setup();
    render(<SubscriptionStatusCard {...defaultProps} />);

    const updateButton = screen.getByRole('button', { name: 'Update Payment Method' });
    await user.click(updateButton);

    expect(defaultProps.onUpdatePayment).toHaveBeenCalledTimes(1);
  });

  it('calls onManageSubscription when Manage Subscription is clicked', async () => {
    const user = userEvent.setup();
    render(<SubscriptionStatusCard {...defaultProps} />);

    const manageButton = screen.getByRole('button', { name: 'Manage Subscription' });
    await user.click(manageButton);

    expect(defaultProps.onManageSubscription).toHaveBeenCalledTimes(1);
  });

  it('calls onCancelSubscription when Cancel Subscription is clicked', async () => {
    const user = userEvent.setup();
    render(<SubscriptionStatusCard {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel Subscription' });
    await user.click(cancelButton);

    expect(defaultProps.onCancelSubscription).toHaveBeenCalledTimes(1);
  });

  it('hides cancel button when already canceled', () => {
    const canceledSubscription = {
      ...mockSubscription,
      status: 'canceled',
    };
    render(<SubscriptionStatusCard {...defaultProps} subscription={canceledSubscription} />);

    expect(screen.queryByRole('button', { name: 'Cancel Subscription' })).not.toBeInTheDocument();
  });

  it('displays yearly interval correctly', () => {
    const yearlySubscription = {
      ...mockSubscription,
      interval: 'year',
    };
    render(<SubscriptionStatusCard {...defaultProps} subscription={yearlySubscription} />);

    expect(screen.getByText('/ year')).toBeInTheDocument();
  });

  it('displays monthly interval correctly', () => {
    render(<SubscriptionStatusCard {...defaultProps} />);

    expect(screen.getByText('/ month')).toBeInTheDocument();
  });

  it('handles missing payment method', () => {
    const noPaymentMethodSubscription = {
      ...mockSubscription,
      paymentMethod: null,
    };
    render(<SubscriptionStatusCard {...defaultProps} subscription={noPaymentMethodSubscription} />);

    expect(screen.getByText('No payment method')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Payment Method' })).toBeInTheDocument();
  });

  it('displays different card brands correctly', () => {
    const mastercardSubscription = {
      ...mockSubscription,
      paymentMethod: {
        ...mockSubscription.paymentMethod,
        brand: 'mastercard',
      },
    };
    render(<SubscriptionStatusCard {...defaultProps} subscription={mastercardSubscription} />);

    expect(screen.getByText('Mastercard')).toBeInTheDocument();
  });

  it('displays amex brand correctly', () => {
    const amexSubscription = {
      ...mockSubscription,
      paymentMethod: {
        ...mockSubscription.paymentMethod,
        brand: 'amex',
      },
    };
    render(<SubscriptionStatusCard {...defaultProps} subscription={amexSubscription} />);

    expect(screen.getByText('American Express')).toBeInTheDocument();
  });

  it('handles expired card display', () => {
    const expiredSubscription = {
      ...mockSubscription,
      paymentMethod: {
        ...mockSubscription.paymentMethod,
        expMonth: 1,
        expYear: 2023,
      },
    };
    render(<SubscriptionStatusCard {...defaultProps} subscription={expiredSubscription} />);

    expect(screen.getByText(/Card expired/)).toBeInTheDocument();
  });

  it('applies custom CSS class when provided', () => {
    render(<SubscriptionStatusCard {...defaultProps} className="custom-card" />);

    const card = screen.getByTestId('subscription-status-card');
    expect(card).toHaveClass('custom-card');
  });

  it('renders with loading state when loading prop is true', () => {
    render(<SubscriptionStatusCard {...defaultProps} loading />);

    expect(screen.getByTestId('subscription-skeleton')).toBeInTheDocument();
  });

  it('handles past_due status with action required indicator', () => {
    const pastDueSubscription = {
      ...mockSubscription,
      status: 'past_due',
    };
    render(<SubscriptionStatusCard {...defaultProps} subscription={pastDueSubscription} />);

    expect(screen.getByText(/Action required/)).toBeInTheDocument();
  });
});
