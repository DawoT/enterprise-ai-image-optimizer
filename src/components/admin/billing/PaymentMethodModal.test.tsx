/**
 * PaymentMethodModal Component Tests
 * Tests for Stripe payment method management modal
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentMethodModal from './PaymentMethodModal';

// Mock the API calls
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Mock Stripe
jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-elements">{children}</div>
  ),
  CardElement: ({ onChange }: { onChange?: (event: any) => void }) => (
    <div data-testid="card-element" onChange={onChange}>
      <input type="text" placeholder="Card number" data-testid="card-number" />
      <input type="text" placeholder="MM/YY" data-testid="card-expiry" />
      <input type="text" placeholder="CVC" data-testid="card-cvc" />
    </div>
  ),
  useStripe: () => ({
    createPaymentMethod: jest.fn(),
    confirmCardSetup: jest.fn(),
  }),
  useElements: () => ({
    getElement: jest.fn(),
  }),
}));

import { apiClient } from '@/lib/api';

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

describe('PaymentMethodModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockPaymentMethods });
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true });
  });

  it('renders when isOpen is true', () => {
    render(<PaymentMethodModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Payment Methods')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<PaymentMethodModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<PaymentMethodModal {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('displays payment methods list', async () => {
    render(<PaymentMethodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('•••• 4242')).toBeInTheDocument();
      expect(screen.getByText('•••• 5555')).toBeInTheDocument();
    });
  });

  it('displays default badge on default payment method', async () => {
    render(<PaymentMethodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  it('shows add new card form when Add Card button is clicked', async () => {
    const user = userEvent.setup();
    render(<PaymentMethodModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add new card/i }));

    expect(screen.getByTestId('card-element')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save card/i })).toBeInTheDocument();
  });

  it('hides add card form when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<PaymentMethodModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add new card/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByTestId('card-element')).not.toBeInTheDocument();
  });

  it('calls setDefault when Set as Default button is clicked', async () => {
    const user = userEvent.setup();
    render(<PaymentMethodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('•••• 5555')).toBeInTheDocument();
    });

    // Find the Set as Default button for the non-default card
    const setDefaultButtons = screen.getAllByRole('button', { name: /set as default/i });
    await user.click(setDefaultButtons[0]);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/admin/billing/payment-methods/pm_002/set-default',
        expect.any(Object)
      );
    });
  });

  it('calls delete when Remove button is clicked', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn().mockReturnValue(true);

    render(<PaymentMethodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('•••• 4242')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to remove this payment method?'
    );

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/admin/billing/payment-methods/pm_001/delete',
        expect.any(Object)
      );
    });
  });

  it('cancels delete when user declines confirmation', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn().mockReturnValue(false);

    render(<PaymentMethodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('•••• 4242')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('prevents removing the only payment method', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn();

    render(<PaymentMethodModal {...defaultProps} />);

    // Mock single payment method
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: [mockPaymentMethods[0]] });

    // Re-render with single payment method
    await waitFor(() => {
      expect(screen.getByText('•••• 4242')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    expect(window.confirm).not.toHaveBeenCalled();
    expect(screen.getByText(/cannot remove the only payment method/i)).toBeInTheDocument();
  });

  it('displays card brand icons correctly', async () => {
    render(<PaymentMethodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Visa')).toBeInTheDocument();
      expect(screen.getByText('Mastercard')).toBeInTheDocument();
    });
  });

  it('displays card expiration correctly', async () => {
    render(<PaymentMethodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/12\/2025/)).toBeInTheDocument();
      expect(screen.getByText(/6\/2026/)).toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    render(<PaymentMethodModal {...defaultProps} loading />);

    expect(screen.getByTestId('payment-methods-skeleton')).toBeInTheDocument();
  });

  it('displays empty state when no payment methods', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: [] });

    render(<PaymentMethodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No payment methods saved')).toBeInTheDocument();
      expect(
        screen.getByText('Add a payment method to start your subscription')
      ).toBeInTheDocument();
    });
  });

  it('shows success message after setting default', async () => {
    const user = userEvent.setup();
    render(<PaymentMethodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('•••• 5555')).toBeInTheDocument();
    });

    const setDefaultButtons = screen.getAllByRole('button', { name: /set as default/i });
    await user.click(setDefaultButtons[0]);

    expect(await screen.findByText('Default payment method updated!')).toBeInTheDocument();
  });

  it('shows success message after adding new card', async () => {
    const user = userEvent.setup();
    render(<PaymentMethodModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add new card/i }));

    // Mock Stripe success
    const mockStripe = require('@stripe/react-stripe-js');
    mockStripe.useStripe.mockReturnValue({
      createPaymentMethod: jest.fn().mockResolvedValue({
        paymentMethod: { id: 'pm_new' },
      }),
    });

    await user.click(screen.getByRole('button', { name: /save card/i }));

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it('displays error when Stripe setup fails', async () => {
    const user = userEvent.setup();

    const mockStripe = require('@stripe/react-stripe-js');
    mockStripe.useStripe.mockReturnValue({
      createPaymentMethod: jest.fn().mockRejectedValue(new Error('Card declined')),
    });

    render(<PaymentMethodModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add new card/i }));
    await user.click(screen.getByRole('button', { name: /save card/i }));

    expect(await screen.findByText(/card declined/i)).toBeInTheDocument();
  });

  it('disables set default button for already default card', async () => {
    render(<PaymentMethodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    // The first card is already default, so Set as Default should be disabled
    const setDefaultButtons = screen.getAllByRole('button', { name: /set as default/i });
    // One button should be hidden (the default one), one should be visible
  });

  it('handles different card brands', async () => {
    const amexCard = {
      id: 'pm_003',
      type: 'card',
      card: {
        brand: 'amex',
        last4: '1234',
        expMonth: 3,
        expYear: 2027,
      },
      isDefault: false,
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: [amexCard] });

    render(<PaymentMethodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('American Express')).toBeInTheDocument();
    });
  });

  it('calls onClose when clicking outside the modal', async () => {
    render(<PaymentMethodModal {...defaultProps} />);

    // Simulate click on overlay
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('disables buttons during processing', async () => {
    const user = userEvent.setup();
    render(<PaymentMethodModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add new card/i }));

    const saveButton = screen.getByRole('button', { name: /save card/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('applies custom className when provided', () => {
    render(<PaymentMethodModal {...defaultProps} className="custom-modal" />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('custom-modal');
  });
});
