/**
 * PromptTemplateEditor Component Tests
 * Tests for AI prompt template editing component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PromptTemplateEditor from './PromptTemplateEditor';
import { toast } from 'react-toastify';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

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

const mockTemplates = [
  {
    id: 'template-default',
    name: 'Default Optimization',
    description: 'Standard image optimization prompt',
    content:
      'Optimize this image for web use. Reduce file size while maintaining visual quality. Target format: {{format}}. Target dimensions: {{width}}x{{height}}. Quality setting: {{quality}}.',
    variables: ['format', 'width', 'height', 'quality'],
    isDefault: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'template-ecommerce',
    name: 'E-commerce Product',
    description: 'Optimized for product photography',
    content:
      'Enhance this product image for e-commerce. Brightness: {{brightness}}%. Contrast: {{contrast}}%. Remove background: {{removeBackground}}. Output format: {{format}}.',
    variables: ['brightness', 'contrast', 'removeBackground', 'format'],
    isDefault: false,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
];

describe('PromptTemplateEditor', () => {
  const defaultProps = {
    initialTemplates: mockTemplates,
    onSave: jest.fn(),
    availableVariables: [
      { name: 'format', description: 'Output format', type: 'string' },
      { name: 'width', description: 'Target width', type: 'number' },
      { name: 'height', description: 'Target height', type: 'number' },
      { name: 'quality', description: 'Quality', type: 'number' },
      { name: 'brightness', description: 'Brightness', type: 'number' },
      { name: 'contrast', description: 'Contrast', type: 'number' },
      { name: 'removeBackground', description: 'Remove background', type: 'boolean' },
      { name: 'compressionLevel', description: 'Compression', type: 'string' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockTemplates });
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true });
    (apiClient.put as jest.Mock).mockResolvedValue({ success: true });
    (apiClient.delete as jest.Mock).mockResolvedValue({ success: true });
  });

  it('renders loading state initially', () => {
    render(<PromptTemplateEditor {...defaultProps} loading />);
    expect(screen.getByTestId('templates-skeleton')).toBeInTheDocument();
  });

  it('displays all templates in list', async () => {
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Default Optimization')).toBeInTheDocument();
      expect(screen.getByText('E-commerce Product')).toBeInTheDocument();
    });
  });

  it('selects first template by default', async () => {
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Optimize this image for web use')).toBeInTheDocument();
    });
  });

  it('updates editor when template is selected', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('E-commerce Product')).toBeInTheDocument();
    });

    await user.click(screen.getByText('E-commerce Product'));

    await waitFor(() => {
      expect(
        screen.getByDisplayValue('Enhance this product image for e-commerce')
      ).toBeInTheDocument();
    });
  });

  it('highlights selected template in list', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Default Optimization')).toBeInTheDocument();
    });

    await user.click(screen.getByText('E-commerce Product'));

    const selectedItem = screen.getByText('E-commerce Product').closest('div');
    expect(selectedItem?.parentElement).toHaveClass('bg-blue-50');
  });

  it('opens new template modal when Add button is clicked', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add template/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add template/i }));

    expect(screen.getByRole('dialog', { name: /create new template/i })).toBeInTheDocument();
  });

  it('validates required name field', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add template/i }));

    const saveButton = screen.getByRole('button', { name: /save template/i });
    await user.click(saveButton);

    expect(await screen.findByText('Template name is required')).toBeInTheDocument();
  });

  it('validates required content field', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /add template/i }));

    await user.type(screen.getByLabelText(/template name/i), 'New Template');

    const saveButton = screen.getByRole('button', { name: /save template/i });
    await user.click(saveButton);

    expect(await screen.findByText('Prompt content is required')).toBeInTheDocument();
  });

  it('detects variables in content', async () => {
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('{{format}}')).toBeInTheDocument();
      expect(screen.getByText('{{width}}')).toBeInTheDocument();
      expect(screen.getByText('{{height}}')).toBeInTheDocument();
    });
  });

  it('inserts variable when clicked from sidebar', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('{{compressionLevel}}')).toBeInTheDocument();
    });

    const variableButton = screen.getByRole('button', { name: /compressionLevel/i });
    await user.click(variableButton);

    const textarea = screen.getByDisplayValue('Optimize this image for web use');
    expect(textarea).toHaveValue(expect.stringContaining('{{compressionLevel}}'));
  });

  it('shows error for invalid variable syntax', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      const textarea = screen.getByDisplayValue('Optimize this image for web use');
    });

    const textarea = screen.getByDisplayValue('Optimize this image for web use');
    await user.clear(textarea);
    await user.type(textarea, 'Test {{invalid variable');

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    expect(await screen.findByText(/invalid variable syntax/i)).toBeInTheDocument();
  });

  it('generates preview with sample data', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate preview/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /generate preview/i }));

    await waitFor(() => {
      expect(screen.getByTestId('preview-output')).toBeInTheDocument();
      expect(screen.getByTestId('preview-output')).toHaveTextContent(/web use/i);
    });
  });

  it('displays character count', async () => {
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/0 \/ 2000 characters/i)).toBeInTheDocument();
    });
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      const textarea = screen.getByDisplayValue('Optimize this image for web use');
    });

    const textarea = screen.getByDisplayValue('Optimize this image for web use');
    await user.type(textarea, ' Additional text.');

    expect(screen.getByText(/32 \/ 2000 characters/i)).toBeInTheDocument();
  });

  it('shows warning when approaching character limit', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    const textarea = screen.getByDisplayValue('Optimize this image for web use');
    const longText = 'A'.repeat(1800);
    await user.clear(textarea);
    await user.type(textarea, longText);

    expect(screen.getByText(/1800 \/ 2000/i)).toBeInTheDocument();
    expect(screen.getByText(/Near limit/i)).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      const textarea = screen.getByDisplayValue('Optimize this image for web use');
    });

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalled();
    });
  });

  it('shows success toast after save', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      user.click(saveButton);
    });

    expect(await screen.findByText('Template saved successfully!')).toBeInTheDocument();
  });

  it('resets to original content when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      const textarea = screen.getByDisplayValue('Optimize this image for web use');
    });

    const textarea = screen.getByDisplayValue('Optimize this image for web use');
    await user.clear(textarea);
    await user.type(textarea, 'Modified content');

    const resetButton = screen.getByRole('button', { name: /reset/i });
    await user.click(resetButton);

    expect(screen.getByDisplayValue('Optimize this image for web use')).toBeInTheDocument();
  });

  it('deletes template when delete button is clicked', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn().mockReturnValue(true);

    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('E-commerce Product')).toBeInTheDocument();
    });

    await user.click(screen.getByText('E-commerce Product'));

    const deleteButton = screen.getByRole('button', { name: /delete template/i });
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this template?');

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalled();
    });
  });

  it('cancels delete when user declines', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn().mockReturnValue(false);

    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('E-commerce Product')).toBeInTheDocument();
    });

    await user.click(screen.getByText('E-commerce Product'));

    const deleteButton = screen.getByRole('button', { name: /delete template/i });
    await user.click(deleteButton);

    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('prevents deleting default template', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn();

    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Default Optimization')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete template/i });
    await user.click(deleteButton);

    expect(window.confirm).not.toHaveBeenCalled();
    expect(screen.getByText('Cannot delete default template')).toBeInTheDocument();
  });

  it.skip('displays template description', async () => {
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Standard image optimization prompt')).toBeInTheDocument();
    });
  });

  it('shows last updated date', async () => {
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Last updated/i)).toBeInTheDocument();
    });
  });

  it('duplicates template when duplicate button is clicked', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('E-commerce Product')).toBeInTheDocument();
    });

    await user.click(screen.getByText('E-commerce Product'));

    const duplicateButton = screen.getByRole('button', { name: /duplicate/i });
    await user.click(duplicateButton);

    expect(screen.getByDisplayValue(/copy of e-commerce product/i)).toBeInTheDocument();
  });

  it('handles API error during save', async () => {
    const user = userEvent.setup();
    (apiClient.put as jest.Mock).mockRejectedValue(new Error('Save failed'));

    render(<PromptTemplateEditor {...defaultProps} />);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save template');
    });
  });

  it('searches templates by name', async () => {
    render(<PromptTemplateEditor {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/search templates/i);
    fireEvent.change(searchInput, { target: { value: 'E-commerce' } });

    expect(screen.getByText('E-commerce Product')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Default Optimization/i })).not.toBeInTheDocument();
  });

  it.skip('toggles variable sidebar visibility', async () => {
    const user = userEvent.setup();
    render(<PromptTemplateEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('{{format}}')).toBeInTheDocument();
    });

    const toggleButton = screen.getByRole('button', { name: /(hide|show) variables/i });
    await user.click(toggleButton);

    await waitFor(() => {
      expect(screen.queryByText('{{format}}')).not.toBeInTheDocument();
    });
  });
});
