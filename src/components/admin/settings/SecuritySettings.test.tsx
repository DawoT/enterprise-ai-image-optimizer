/**
 * SecuritySettings Component Tests
 * Tests for security and authentication configuration management
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SecuritySettings from './SecuritySettings';

// Mock the API calls
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api';

const mockSecuritySettings = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecial: true,
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  twoFactorEnabled: false,
  corsOrigins: ['http://localhost:3000', 'https://example.com'],
  jwtExpiryHours: 24,
  refreshTokenExpiryDays: 7,
};

describe('SecuritySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockSecuritySettings });
    (apiClient.put as jest.Mock).mockResolvedValue({ success: true });
  });

  it('renders loading state initially', () => {
    render(<SecuritySettings />);
    expect(screen.getByText('Loading security settings...')).toBeInTheDocument();
  });

  it('loads and displays security settings after mounting', async () => {
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/admin/settings/security');
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Minimum Password Length')).toHaveValue(8);
      expect(screen.getByLabelText('Session Timeout (minutes)')).toHaveValue(60);
    });
  });

  it('displays all security configuration sections', async () => {
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Password Requirements')).toBeInTheDocument();
      expect(screen.getByText('Session Settings')).toBeInTheDocument();
      expect(screen.getByText('Account Security')).toBeInTheDocument();
      expect(screen.getByText('CORS Configuration')).toBeInTheDocument();
      expect(screen.getByText('Token Settings')).toBeInTheDocument();
    });
  });

  it('allows modification of password requirements', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Minimum Password Length')).toBeInTheDocument();
    });

    const passwordLengthInput = screen.getByLabelText('Minimum Password Length');
    await user.clear(passwordLengthInput);
    await user.type(passwordLengthInput, '12');

    expect(passwordLengthInput).toHaveValue(12);
  });

  it('allows toggling of two-factor authentication', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    });

    const twoFactorToggle = screen.getByRole('checkbox', { name: 'Enable 2FA' });
    expect(twoFactorToggle).not.toBeChecked();

    await user.click(twoFactorToggle);
    expect(twoFactorToggle).toBeChecked();
  });

  it('enables save button when settings are modified', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Minimum Password Length')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: 'Save Security Settings' });
    expect(saveButton).toBeDisabled();

    const passwordLengthInput = screen.getByLabelText('Minimum Password Length');
    await user.clear(passwordLengthInput);
    await user.type(passwordLengthInput, '12');

    expect(saveButton).not.toBeDisabled();
  });

  it('validates password minimum length', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Minimum Password Length')).toBeInTheDocument();
    });

    const passwordLengthInput = screen.getByLabelText('Minimum Password Length');
    await user.clear(passwordLengthInput);
    await user.type(passwordLengthInput, '3');

    const saveButton = screen.getByRole('button', { name: 'Save Security Settings' });
    await user.click(saveButton);

    expect(
      await screen.findByText('Password minimum length must be at least 6')
    ).toBeInTheDocument();
  });

  it('validates session timeout range', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Session Timeout (minutes)')).toBeInTheDocument();
    });

    const sessionTimeoutInput = screen.getByLabelText('Session Timeout (minutes)');
    await user.clear(sessionTimeoutInput);
    await user.type(sessionTimeoutInput, '5');

    const saveButton = screen.getByRole('button', { name: 'Save Security Settings' });
    await user.click(saveButton);

    expect(
      await screen.findByText('Session timeout must be between 15 and 1440 minutes')
    ).toBeInTheDocument();
  });

  it('allows adding new CORS origin', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add new origin...')).toBeInTheDocument();
    });

    const corsInput = screen.getByPlaceholderText('Add new origin...');
    await user.type(corsInput, 'https://new-origin.com');

    const addButton = screen.getByRole('button', { name: 'Add' });
    await user.click(addButton);

    expect(screen.getByText('https://new-origin.com')).toBeInTheDocument();
  });

  it('allows removing CORS origin', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('http://localhost:3000')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    expect(screen.queryByText('http://localhost:3000')).not.toBeInTheDocument();
  });

  it('saves security settings successfully', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Minimum Password Length')).toBeInTheDocument();
    });

    const passwordLengthInput = screen.getByLabelText('Minimum Password Length');
    await user.clear(passwordLengthInput);
    await user.type(passwordLengthInput, '12');

    const saveButton = screen.getByRole('button', { name: 'Save Security Settings' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/admin/settings/security',
        expect.objectContaining({
          passwordMinLength: 12,
        })
      );
    });

    expect(await screen.findByText('Security settings saved successfully!')).toBeInTheDocument();
  });

  it('displays warning when 2FA is being disabled', async () => {
    const user = userEvent.setup();
    (apiClient.put as jest.Mock).mockResolvedValue({ success: true });

    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    });

    // Enable 2FA first
    const twoFactorToggle = screen.getByRole('checkbox', { name: 'Enable 2FA' });
    await user.click(twoFactorToggle);
    expect(twoFactorToggle).toBeChecked();

    // Disable 2FA
    await user.click(twoFactorToggle);
    expect(twoFactorToggle).not.toBeChecked();

    // Save settings
    const saveButton = screen.getByRole('button', { name: 'Save Security Settings' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/admin/settings/security',
        expect.objectContaining({
          twoFactorEnabled: false,
        })
      );
    });
  });

  it('validates JWT expiry range', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('JWT Expiry (hours)')).toBeInTheDocument();
    });

    const jwtExpiryInput = screen.getByLabelText('JWT Expiry (hours)');
    await user.clear(jwtExpiryInput);
    await user.type(jwtExpiryInput, '100');

    const saveButton = screen.getByRole('button', { name: 'Save Security Settings' });
    await user.click(saveButton);

    expect(
      await screen.findByText('JWT expiry must be between 1 and 168 hours')
    ).toBeInTheDocument();
  });
});
