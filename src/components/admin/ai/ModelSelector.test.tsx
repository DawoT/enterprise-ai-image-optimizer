/**
 * ModelSelector Component Tests
 * Tests for AI model configuration and selection component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModelSelector from './ModelSelector';

// Mock the API calls
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api';

const mockModels = [
  {
    id: 'openai-dalle3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    status: 'active',
    apiKeyConfigured: true,
    description: 'High-quality image generation with natural language understanding',
    features: ['Natural language prompts', 'High resolution output', 'Content moderation'],
    pricing: { perImage: 0.04 },
  },
  {
    id: 'stability-sdxl',
    name: 'Stable Diffusion XL',
    provider: 'Stability AI',
    status: 'inactive',
    apiKeyConfigured: false,
    description: 'Open-source model with extensive customization options',
    features: ['Style control', 'Negative prompts', 'Multiple aspect ratios'],
    pricing: { perImage: 0.005 },
  },
  {
    id: 'local-ollama',
    name: 'Ollama (Local)',
    provider: 'Local',
    status: 'active',
    apiKeyConfigured: true,
    description: 'Run models locally with privacy and zero API costs',
    features: ['Offline operation', 'Privacy preserved', 'No per-image costs'],
    pricing: { perImage: 0 },
  },
];

describe('ModelSelector', () => {
  const defaultProps = {
    initialModels: mockModels,
    onModelSelect: jest.fn(),
    onConfigSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockModels });
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true });
  });

  it('renders loading state initially', () => {
    render(<ModelSelector {...defaultProps} loading />);
    expect(screen.getByTestId('models-skeleton')).toBeInTheDocument();
  });

  it('displays all models correctly', async () => {
    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('DALL-E 3')).toBeInTheDocument();
      expect(screen.getByText('Stable Diffusion XL')).toBeInTheDocument();
      expect(screen.getByText('Ollama (Local)')).toBeInTheDocument();
    });
  });

  it('displays model provider names', async () => {
    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Stability AI')).toBeInTheDocument();
      expect(screen.getByText('Local')).toBeInTheDocument();
    });
  });

  it('shows active status badge correctly', async () => {
    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      const activeBadge = screen.getByText('Active');
      expect(activeBadge).toBeInTheDocument();
      expect(activeBadge).toHaveClass('bg-green-100 text-green-800');
    });
  });

  it('shows inactive status badge correctly', async () => {
    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      const inactiveBadge = screen.getByText('Inactive');
      expect(inactiveBadge).toBeInTheDocument();
      expect(inactiveBadge).toHaveClass('bg-gray-100 text-gray-800');
    });
  });

  it('highlights selected model', async () => {
    render(<ModelSelector {...defaultProps} selectedModelId="openai-dalle3" />);

    await waitFor(() => {
      const dalleCard = screen.getByText('DALL-E 3').closest('div');
      expect(dalleCard?.parentElement).toHaveClass('border-blue-500');
    });
  });

  it('calls onModelSelect when model card is clicked', async () => {
    const user = userEvent.setup();
    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('DALL-E 3')).toBeInTheDocument();
    });

    await user.click(screen.getByText('DALL-E 3'));
    expect(defaultProps.onModelSelect).toHaveBeenCalledWith('openai-dalle3');
  });

  it('opens configuration modal when Configure button is clicked', async () => {
    const user = userEvent.setup();
    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('DALL-E 3')).toBeInTheDocument();
    });

    const configureButtons = screen.getAllByRole('button', { name: /configure/i });
    await user.click(configureButtons[0]);

    expect(screen.getByRole('dialog', { name: /configure model/i })).toBeInTheDocument();
  });

  it('hides API key by default', async () => {
    const user = userEvent.setup();
    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      const configureButtons = screen.getAllByRole('button', { name: /configure/i });
      user.click(configureButtons[0]);
    });

    const apiKeyInput = screen.getByLabelText(/api key/i);
    expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  it('reveals API key when show toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      const configureButtons = screen.getAllByRole('button', { name: /configure/i });
      user.click(configureButtons[0]);
    });

    const showButton = screen.getByRole('button', { name: /show/i });
    await user.click(showButton);

    const apiKeyInput = screen.getByLabelText(/api key/i);
    expect(apiKeyInput).toHaveAttribute('type', 'text');
  });

  it('validates required API key', async () => {
    const user = userEvent.setup();
    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      const configureButtons = screen.getAllByRole('button', { name: /configure/i });
      user.click(configureButtons[1]); // Stability AI - no API key configured
    });

    const saveButton = screen.getByRole('button', { name: /save configuration/i });
    await user.click(saveButton);

    expect(await screen.findByText('API key is required')).toBeInTheDocument();
  });

  it('shows connection testing state', async () => {
    const user = userEvent.setup();
    (apiClient.post as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      const configureButtons = screen.getAllByRole('button', { name: /configure/i });
      user.click(configureButtons[0]);
    });

    const testButton = screen.getByRole('button', { name: /test connection/i });
    await user.click(testButton);

    expect(await screen.findByText('Testing...')).toBeInTheDocument();
    expect(testButton).toBeDisabled();
  });

  it('shows success message after successful connection test', async () => {
    const user = userEvent.setup();
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true });

    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      const configureButtons = screen.getAllByRole('button', { name: /configure/i });
      user.click(configureButtons[0]);
    });

    const testButton = screen.getByRole('button', { name: /test connection/i });
    await user.click(testButton);

    await waitFor(() => {
      expect(screen.getByText('Connection successful!')).toBeInTheDocument();
    });
  });

  it('shows error message after failed connection test', async () => {
    const user = userEvent.setup();
    (apiClient.post as jest.Mock).mockRejectedValue(new Error('Invalid API key'));

    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      const configureButtons = screen.getAllByRole('button', { name: /configure/i });
      user.click(configureButtons[0]);
    });

    const testButton = screen.getByRole('button', { name: /test connection/i });
    await user.click(testButton);

    await waitFor(() => {
      expect(screen.getByText('Connection failed: Invalid API key')).toBeInTheDocument();
    });
  });

  it('displays model features', async () => {
    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Natural language prompts')).toBeInTheDocument();
      expect(screen.getByText('High resolution output')).toBeInTheDocument();
    });
  });

  it('displays pricing information', async () => {
    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('$0.04/image')).toBeInTheDocument();
      expect(screen.getByText('$0.005/image')).toBeInTheDocument();
      expect(screen.getByText('Free')).toBeInTheDocument();
    });
  });

  it('filters models by provider', async () => {
    render(<ModelSelector {...defaultProps} />);

    const filterSelect = screen.getByRole('combobox', { name: /filter by provider/i });
    fireEvent.change(filterSelect, { target: { value: 'OpenAI' } });

    await waitFor(() => {
      expect(screen.getByText('DALL-E 3')).toBeInTheDocument();
      expect(screen.queryByText('Stable Diffusion XL')).not.toBeInTheDocument();
    });
  });

  it('shows all models when filter is reset', async () => {
    render(<ModelSelector {...defaultProps} />);

    const filterSelect = screen.getByRole('combobox', { name: /filter by provider/i });
    fireEvent.change(filterSelect, { target: { value: 'all' } });

    await waitFor(() => {
      expect(screen.getByText('DALL-E 3')).toBeInTheDocument();
      expect(screen.getByText('Stable Diffusion XL')).toBeInTheDocument();
      expect(screen.getByText('Ollama (Local)')).toBeInTheDocument();
    });
  });

  it('displays model description', async () => {
    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText('High-quality image generation with natural language understanding')
      ).toBeInTheDocument();
    });
  });

  it('calls onConfigSave when configuration is saved', async () => {
    const user = userEvent.setup();
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true });

    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      const configureButtons = screen.getAllByRole('button', { name: /configure/i });
      user.click(configureButtons[0]);
    });

    const saveButton = screen.getByRole('button', { name: /save configuration/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(defaultProps.onConfigSave).toHaveBeenCalled();
    });
  });

  it('handles API error during configuration save', async () => {
    const user = userEvent.setup();
    (apiClient.post as jest.Mock).mockRejectedValue(new Error('Save failed'));

    render(<ModelSelector {...defaultProps} />);

    await waitFor(() => {
      const configureButtons = screen.getAllByRole('button', { name: /configure/i });
      user.click(configureButtons[0]);
    });

    const saveButton = screen.getByRole('button', { name: /save configuration/i });
    await user.click(saveButton);

    expect(await screen.findByText('Failed to save configuration')).toBeInTheDocument();
  });

  it('disables configuration for inactive models when required', async () => {
    render(<ModelSelector {...defaultProps} requireActiveForConfig />);

    await waitFor(() => {
      const configureButtons = screen.getAllByRole('button', { name: /configure/i });
      expect(configureButtons[1]).toBeDisabled();
    });
  });

  it('applies custom className when provided', async () => {
    render(<ModelSelector {...defaultProps} className="custom-selector" />);

    const container = screen.getByTestId('model-selector-container');
    expect(container).toHaveClass('custom-selector');
  });

  it('displays add custom model option', async () => {
    render(<ModelSelector {...defaultProps} allowCustomModels />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add custom model/i })).toBeInTheDocument();
    });
  });

  it.skip('opens add model modal when button is clicked', async () => {
    const user = userEvent.setup();
    render(<ModelSelector {...defaultProps} allowCustomModels />);

    await user.click(screen.getByRole('button', { name: /add custom model/i }));

    expect(screen.getByRole('dialog', { name: /add custom model/i })).toBeInTheDocument();
  });
});
