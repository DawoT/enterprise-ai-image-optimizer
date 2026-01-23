/**
 * GeneralSettings Component Tests
 * Tests for general system configuration management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GeneralSettings from './GeneralSettings';

// Mock the API calls
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api';

const mockSettings = {
  appName: 'Enterprise AI Image Optimizer',
  timezone: 'America/New_York',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  defaultLanguage: 'en',
  maintenanceMode: false,
  logLevel: 'info',
};

const mockUpdateSettings = {
  appName: 'Updated App Name',
  timezone: 'Europe/London',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  defaultLanguage: 'es',
  maintenanceMode: true,
  logLevel: 'debug',
};

describe('GeneralSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockSettings });
    (apiClient.put as jest.Mock).mockResolvedValue({ success: true });
  });

  it('renders loading state initially', () => {
    render(<GeneralSettings />);
    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });

  it('loads and displays general settings after mounting', async () => {
    render(<GeneralSettings />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/admin/settings/general');
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Application Name')).toHaveValue(
        'Enterprise AI Image Optimizer'
      );
      expect(screen.getByLabelText('Timezone')).toHaveValue('America/New_York');
      expect(screen.getByLabelText('Date Format')).toHaveValue('YYYY-MM-DD');
    });
  });

  it('displays all configuration fields correctly', async () => {
    render(<GeneralSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Application Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Timezone')).toBeInTheDocument();
      expect(screen.getByLabelText('Date Format')).toBeInTheDocument();
      expect(screen.getByLabelText('Time Format')).toBeInTheDocument();
      expect(screen.getByLabelText('Default Language')).toBeInTheDocument();
      expect(screen.getByLabelText('Maintenance Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Log Level')).toBeInTheDocument();
    });
  });

  it('enables save button when settings are modified', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Application Name')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    expect(saveButton).toBeDisabled();

    const appNameInput = screen.getByLabelText('Application Name');
    await user.clear(appNameInput);
    await user.type(appNameInput, 'New App Name');

    expect(saveButton).not.toBeDisabled();
  });

  it('saves settings successfully when form is submitted', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Application Name')).toBeInTheDocument();
    });

    const appNameInput = screen.getByLabelText('Application Name');
    await user.clear(appNameInput);
    await user.type(appNameInput, 'Updated App Name');

    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith('/admin/settings/general', {
        appName: 'Updated App Name',
        timezone: 'America/New_York',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        defaultLanguage: 'en',
        maintenanceMode: false,
        logLevel: 'info',
      });
    });

    expect(await screen.findByText('Settings saved successfully!')).toBeInTheDocument();
  });

  it('shows error message when save fails', async () => {
    const user = userEvent.setup();
    (apiClient.put as jest.Mock).mockRejectedValue(new Error('Failed to save settings'));

    render(<GeneralSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Application Name')).toBeInTheDocument();
    });

    const appNameInput = screen.getByLabelText('Application Name');
    await user.clear(appNameInput);
    await user.type(appNameInput, 'New App Name');

    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    await user.click(saveButton);

    expect(
      await screen.findByText('Failed to save settings. Please try again.')
    ).toBeInTheDocument();
  });

  it('resets form when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<GeneralSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Application Name')).toBeInTheDocument();
    });

    const appNameInput = screen.getByLabelText('Application Name');
    await user.clear(appNameInput);
    await user.type(appNameInput, 'Modified Name');

    const resetButton = screen.getByRole('button', { name: 'Reset to Defaults' });
    await user.click(resetButton);

    expect(appNameInput).toHaveValue('Enterprise AI Image Optimizer');
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    (apiClient.put as jest.Mock).mockResolvedValue({ success: true });

    render(<GeneralSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Application Name')).toBeInTheDocument();
    });

    const appNameInput = screen.getByLabelText('Application Name');
    await user.clear(appNameInput);

    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    await user.click(saveButton);

    expect(await screen.findByText('Application name is required')).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it('displays timezone options correctly', async () => {
    render(<GeneralSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Timezone')).toBeInTheDocument();
    });

    const timezoneSelect = screen.getByLabelText('Timezone');

    expect(timezoneSelect).toHaveValue('America/New_York');

    // Check that common timezones are available
    expect(screen.getByRole('option', { name: 'UTC' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Europe/London' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Asia/Tokyo' })).toBeInTheDocument();
  });
});
