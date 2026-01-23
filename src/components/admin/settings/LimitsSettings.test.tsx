/**
 * LimitsSettings Component Tests
 * Tests for system limits and quota configuration management
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LimitsSettings from './LimitsSettings';

// Mock the API calls
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api';

const mockLimitsSettings = {
  maxRequestsPerUser: 1000,
  maxConcurrentProcesses: 5,
  maxFileSizeMB: 50,
  maxStoragePerUserMB: 10240,
  rateLimitWindowMinutes: 15,
  allowedFileTypes: ['jpg', 'png', 'webp', 'gif'],
  maxImageDimensions: { width: 4096, height: 4096 },
  quotaWarningThreshold: 80,
  maxWebhooks: 10,
};

describe('LimitsSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockLimitsSettings });
    (apiClient.put as jest.Mock).mockResolvedValue({ success: true });
  });

  it('renders loading state initially', () => {
    render(<LimitsSettings />);
    expect(screen.getByText('Loading limits...')).toBeInTheDocument();
  });

  it('loads and displays limits settings after mounting', async () => {
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/admin/settings/limits');
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Max Requests per User')).toHaveValue(1000);
      expect(screen.getByLabelText('Max Concurrent Processes')).toHaveValue(5);
    });
  });

  it('displays all limits configuration sections', async () => {
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(screen.getByText('Request Limits')).toBeInTheDocument();
      expect(screen.getByText('Storage Limits')).toBeInTheDocument();
      expect(screen.getByText('File Constraints')).toBeInTheDocument();
      expect(screen.getByText('Quota Alerts')).toBeInTheDocument();
    });
  });

  it('allows modification of request limits', async () => {
    const user = userEvent.setup();
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Max Requests per User')).toBeInTheDocument();
    });

    const requestsInput = screen.getByLabelText('Max Requests per User');
    await user.clear(requestsInput);
    await user.type(requestsInput, '5000');

    expect(requestsInput).toHaveValue(5000);
  });

  it('allows modification of storage limits', async () => {
    const user = userEvent.setup();
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Max Storage per User (MB)')).toBeInTheDocument();
    });

    const storageInput = screen.getByLabelText('Max Storage per User (MB)');
    await user.clear(storageInput);
    await user.type(storageInput, '20480');

    expect(storageInput).toHaveValue(20480);
  });

  it('enables save button when settings are modified', async () => {
    const user = userEvent.setup();
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Max Requests per User')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: 'Save Limits Settings' });
    expect(saveButton).toBeDisabled();

    const requestsInput = screen.getByLabelText('Max Requests per User');
    await user.clear(requestsInput);
    await user.type(requestsInput, '5000');

    expect(saveButton).not.toBeDisabled();
  });

  it('validates max requests minimum value', async () => {
    const user = userEvent.setup();
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Max Requests per User')).toBeInTheDocument();
    });

    const requestsInput = screen.getByLabelText('Max Requests per User');
    await user.clear(requestsInput);
    await user.type(requestsInput, '0');

    const saveButton = screen.getByRole('button', { name: 'Save Limits Settings' });
    await user.click(saveButton);

    expect(await screen.findByText('Max requests must be at least 100')).toBeInTheDocument();
  });

  it('validates max file size range', async () => {
    const user = userEvent.setup();
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Max File Size (MB)')).toBeInTheDocument();
    });

    const fileSizeInput = screen.getByLabelText('Max File Size (MB)');
    await user.clear(fileSizeInput);
    await user.type(fileSizeInput, '500');

    const saveButton = screen.getByRole('button', { name: 'Save Limits Settings' });
    await user.click(saveButton);

    expect(
      await screen.findByText('Max file size must be between 1 and 200 MB')
    ).toBeInTheDocument();
  });

  it('allows adding new file type', async () => {
    const user = userEvent.setup();
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add file type...')).toBeInTheDocument();
    });

    const fileTypeInput = screen.getByPlaceholderText('Add file type...');
    await user.type(fileTypeInput, 'tiff');

    const addButton = screen.getByRole('button', { name: 'Add' });
    await user.click(addButton);

    expect(screen.getByText('tiff')).toBeInTheDocument();
  });

  it('allows removing file type', async () => {
    const user = userEvent.setup();
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(screen.getByText('jpg')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    expect(screen.queryByText('jpg')).not.toBeInTheDocument();
  });

  it('validates max dimensions', async () => {
    const user = userEvent.setup();
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Max Width (px)')).toBeInTheDocument();
      expect(screen.getByLabelText('Max Height (px)')).toBeInTheDocument();
    });

    const widthInput = screen.getByLabelText('Max Width (px)');
    await user.clear(widthInput);
    await user.type(widthInput, '10000');

    const saveButton = screen.getByRole('button', { name: 'Save Limits Settings' });
    await user.click(saveButton);

    expect(
      await screen.findByText('Max dimension must not exceed 8192 pixels')
    ).toBeInTheDocument();
  });

  it('validates quota warning threshold range', async () => {
    const user = userEvent.setup();
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Quota Warning Threshold (%)')).toBeInTheDocument();
    });

    const thresholdInput = screen.getByLabelText('Quota Warning Threshold (%)');
    await user.clear(thresholdInput);
    await user.type(thresholdInput, '150');

    const saveButton = screen.getByRole('button', { name: 'Save Limits Settings' });
    await user.click(saveButton);

    expect(
      await screen.findByText('Quota warning threshold must be between 50 and 100')
    ).toBeInTheDocument();
  });

  it('saves limits settings successfully', async () => {
    const user = userEvent.setup();
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Max Requests per User')).toBeInTheDocument();
    });

    const requestsInput = screen.getByLabelText('Max Requests per User');
    await user.clear(requestsInput);
    await user.type(requestsInput, '5000');

    const saveButton = screen.getByRole('button', { name: 'Save Limits Settings' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/admin/settings/limits',
        expect.objectContaining({
          maxRequestsPerUser: 5000,
        })
      );
    });

    expect(await screen.findByText('Limits settings saved successfully!')).toBeInTheDocument();
  });

  it('displays current usage indicators', async () => {
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(screen.getByText('Current Configuration')).toBeInTheDocument();
    });

    // Verify that usage indicators are displayed for relevant limits
    expect(screen.getByText('5 concurrent processes allowed')).toBeInTheDocument();
    expect(screen.getByText('50 MB max file size')).toBeInTheDocument();
  });

  it('prevents adding duplicate file types', async () => {
    const user = userEvent.setup();
    render(<LimitsSettings />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add file type...')).toBeInTheDocument();
    });

    const fileTypeInput = screen.getByPlaceholderText('Add file type...');
    await user.type(fileTypeInput, 'jpg');

    const addButton = screen.getByRole('button', { name: 'Add' });
    await user.click(addButton);

    expect(await screen.findByText('File type already exists')).toBeInTheDocument();
  });
});
