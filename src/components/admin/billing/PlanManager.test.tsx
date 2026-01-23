/**
 * PlanManager Component Tests
 * Tests for subscription plan CRUD management component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlanManager from './PlanManager';

// Mock the API calls
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api';

const mockPlans = [
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

describe('PlanManager', () => {
  const defaultProps = {
    initialPlans: mockPlans,
    onPlanSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockPlans });
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true });
    (apiClient.put as jest.Mock).mockResolvedValue({ success: true });
    (apiClient.delete as jest.Mock).mockResolvedValue({ success: true });
  });

  it('renders loading state initially', () => {
    render(<PlanManager {...defaultProps} loading />);
    expect(screen.getByTestId('plans-skeleton')).toBeInTheDocument();
  });

  it('displays all plans correctly', async () => {
    render(<PlanManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText('Enterprise')).toBeInTheDocument();
    });
  });

  it('displays plan prices correctly', async () => {
    render(<PlanManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('$0')).toBeInTheDocument();
      expect(screen.getByText('$49')).toBeInTheDocument();
      expect(screen.getByText('$499')).toBeInTheDocument();
    });
  });

  it('displays plan features', async () => {
    render(<PlanManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('100 images/month')).toBeInTheDocument();
      expect(screen.getByText('API access')).toBeInTheDocument();
    });
  });

  it('shows popular badge on popular plan', async () => {
    render(<PlanManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });
  });

  it('opens create plan modal when Add Plan button is clicked', async () => {
    const user = userEvent.setup();
    render(<PlanManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add plan/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add plan/i }));

    expect(screen.getByRole('dialog', { name: /create new plan/i })).toBeInTheDocument();
  });

  it('opens edit plan modal when Edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<PlanManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[1]); // Pro plan

    expect(screen.getByRole('dialog', { name: /edit plan/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pro')).toBeInTheDocument();
  });

  it('validates required fields in form', async () => {
    const user = userEvent.setup();
    render(<PlanManager {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add plan/i }));

    const saveButton = screen.getByRole('button', { name: /save plan/i });
    await user.click(saveButton);

    expect(await screen.findByText('Plan name is required')).toBeInTheDocument();
    expect(await screen.findByText('Price is required')).toBeInTheDocument();
  });

  it('validates price must be positive', async () => {
    const user = userEvent.setup();
    render(<PlanManager {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add plan/i }));

    const priceInput = screen.getByLabelText(/price/i);
    await user.clear(priceInput);
    await user.type(priceInput, '-100');

    const saveButton = screen.getByRole('button', { name: /save plan/i });
    await user.click(saveButton);

    expect(await screen.findByText('Price must be greater than 0')).toBeInTheDocument();
  });

  it('validates features list is not empty', async () => {
    const user = userEvent.setup();
    render(<PlanManager {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add plan/i }));

    const featureInput = screen.getByPlaceholderText(/add feature/i);
    await user.type(featureInput, 'New Feature');
    await user.keyboard('{Enter}');

    const saveButton = screen.getByRole('button', { name: /save plan/i });
    await user.click(saveButton);

    // At least one feature is added, so this should pass validation
    expect(screen.queryByText(/at least one feature/i)).not.toBeInTheDocument();
  });

  it('creates new plan successfully', async () => {
    const user = userEvent.setup();
    render(<PlanManager {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add plan/i }));

    await user.type(screen.getByLabelText(/plan name/i), 'Starter');
    await user.type(screen.getByLabelText(/description/i), 'For small teams');
    await user.type(screen.getByLabelText(/price/i), '2900');
    await user.type(screen.getByPlaceholderText(/add feature/i), '500 images/month');
    await user.keyboard('{Enter}');
    await user.type(screen.getByPlaceholderText(/add feature/i), 'Basic support');
    await user.keyboard('{Enter}');

    await user.click(screen.getByRole('button', { name: /save plan/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/admin/billing/plans',
        expect.objectContaining({
          name: 'Starter',
          amount: 2900,
        })
      );
    });

    expect(await screen.findByText('Plan created successfully!')).toBeInTheDocument();
  });

  it('updates plan successfully', async () => {
    const user = userEvent.setup();
    render(<PlanManager {...defaultProps} />);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[1]); // Pro plan

    await user.clear(screen.getByDisplayValue('Pro'));
    await user.type(screen.getByDisplayValue('Pro'), 'Professional');

    await user.click(screen.getByRole('button', { name: /save plan/i }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/admin/billing/plans/plan_pro',
        expect.objectContaining({
          name: 'Professional',
        })
      );
    });

    expect(await screen.findByText('Plan updated successfully!')).toBeInTheDocument();
  });

  it('deletes plan after confirmation', async () => {
    const user = userEvent.setup();
    // Mock confirm dialog
    window.confirm = jest.fn().mockReturnValue(true);

    render(<PlanManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    const moreButtons = screen.getAllByRole('button', { name: /more actions/i });
    await user.click(moreButtons[0]); // Free plan

    const deleteOption = await screen.findByRole('menuitem', { name: /delete/i });
    await user.click(deleteOption);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete the Free plan?');

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/admin/billing/plans/plan_free');
    });

    expect(await screen.findByText('Plan deleted successfully!')).toBeInTheDocument();
  });

  it('cancels delete when user declines confirmation', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn().mockReturnValue(false);

    render(<PlanManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    const moreButtons = screen.getAllByRole('button', { name: /more actions/i });
    await user.click(moreButtons[0]);

    const deleteOption = await screen.findByRole('menuitem', { name: /delete/i });
    await user.click(deleteOption);

    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('toggles plan active status', async () => {
    const user = userEvent.setup();
    (apiClient.put as jest.Mock).mockResolvedValue({ success: true });

    render(<PlanManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    const moreButtons = screen.getAllByRole('button', { name: /more actions/i });
    await user.click(moreButtons[0]);

    const toggleOption = await screen.findByRole('menuitem', { name: /deactivate/i });
    await user.click(toggleOption);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/admin/billing/plans/plan_free',
        expect.objectContaining({
          isActive: false,
        })
      );
    });
  });

  it('shows toggle yearly/monthly pricing', async () => {
    render(<PlanManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /monthly/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /monthly/i }));
    await userEvent.click(screen.getByRole('button', { name: /yearly/i }));

    expect(screen.getByRole('button', { name: /yearly/i })).toHaveClass('bg-blue-600 text-white');
  });

  it('calculates yearly discount correctly', async () => {
    const user = userEvent.setup();
    render(<PlanManager {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /monthly/i }));
    await user.click(screen.getByRole('button', { name: /yearly/i }));

    // Pro plan: $49/month = $588/year
    // With 20% discount: $470.40/year
    expect(screen.getByText('$470')).toBeInTheDocument();
    expect(screen.getByText('/year')).toBeInTheDocument();
  });

  it('calls onPlanSelect when Select Plan button is clicked', async () => {
    const user = userEvent.setup();
    render(<PlanManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    const selectButtons = screen.getAllByRole('button', { name: /select/i });
    await user.click(selectButtons[1]);

    expect(defaultProps.onPlanSelect).toHaveBeenCalledWith(mockPlans[1]);
  });

  it('displays plan limits correctly', async () => {
    render(<PlanManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('10,000 images/month')).toBeInTheDocument();
      expect(screen.getByText('50 GB storage')).toBeInTheDocument();
    });
  });

  it('handles API error when creating plan', async () => {
    const user = userEvent.setup();
    (apiClient.post as jest.Mock).mockRejectedValue(new Error('Failed to create plan'));

    render(<PlanManager {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add plan/i }));

    await user.type(screen.getByLabelText(/plan name/i), 'Test Plan');
    await user.type(screen.getByLabelText(/price/i), '1000');
    await user.type(screen.getByPlaceholderText(/add feature/i), 'Test feature');
    await user.keyboard('{Enter}');

    await user.click(screen.getByRole('button', { name: /save plan/i }));

    expect(await screen.findByText('Failed to create plan. Please try again.')).toBeInTheDocument();
  });

  it('disables free plan from deletion', async () => {
    const user = userEvent.setup();

    render(<PlanManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    const moreButtons = screen.getAllByRole('button', { name: /more actions/i });
    await user.click(moreButtons[0]);

    const deleteOption = await screen.findByRole('menuitem', { name: /delete/i });
    expect(deleteOption).toHaveAttribute('aria-disabled', 'true');
  });

  it('adds features to list', async () => {
    const user = userEvent.setup();
    render(<PlanManager {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add plan/i }));

    const featureInput = screen.getByPlaceholderText(/add feature/i);
    await user.type(featureInput, 'Custom feature');
    await user.keyboard('{Enter}');

    expect(screen.getByText('Custom feature')).toBeInTheDocument();
  });

  it('removes features from list', async () => {
    const user = userEvent.setup();
    render(<PlanManager {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add plan/i }));

    const featureInput = screen.getByPlaceholderText(/add feature/i);
    await user.type(featureInput, 'Feature to remove');
    await user.keyboard('{Enter}');

    const removeButton = screen.getByRole('button', { name: /remove feature/i });
    await user.click(removeButton);

    expect(screen.queryByText('Feature to remove')).not.toBeInTheDocument();
  });

  it('validates unique plan name', async () => {
    const user = userEvent.setup();
    render(<PlanManager {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add plan/i }));

    await user.type(screen.getByLabelText(/plan name/i), 'Pro'); // Duplicate name

    const saveButton = screen.getByRole('button', { name: /save plan/i });
    await user.click(saveButton);

    expect(await screen.findByText('Plan name must be unique')).toBeInTheDocument();
  });
});
