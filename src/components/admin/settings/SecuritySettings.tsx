'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'react-toastify';

interface SecuritySettingsData {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecial: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  twoFactorEnabled: boolean;
  corsOrigins: string[];
  jwtExpiryHours: number;
  refreshTokenExpiryDays: number;
}

interface SecuritySettingsProps {
  onSettingsChange?: (hasChanges: boolean) => void;
}

const defaultSettings: SecuritySettingsData = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecial: false,
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  twoFactorEnabled: false,
  corsOrigins: [],
  jwtExpiryHours: 24,
  refreshTokenExpiryDays: 7,
};

export default function SecuritySettings({ onSettingsChange }: SecuritySettingsProps) {
  const [settings, setSettings] = useState<SecuritySettingsData>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<SecuritySettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newCorsOrigin, setNewCorsOrigin] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof SecuritySettingsData, string>>>({});

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<SecuritySettingsData>('/admin/settings/security');
      const fetchedSettings = response.data;
      setSettings(fetchedSettings);
      setOriginalSettings(fetchedSettings);
    } catch (error) {
      console.error('Failed to fetch security settings:', error);
      toast.error('Failed to load security settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange(hasChanges);
    }
  }, [hasChanges, onSettingsChange]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof SecuritySettingsData, string>> = {};

    if (settings.passwordMinLength < 6 || settings.passwordMinLength > 32) {
      newErrors.passwordMinLength = 'Password minimum length must be between 6 and 32';
    }

    if (settings.sessionTimeoutMinutes < 15 || settings.sessionTimeoutMinutes > 1440) {
      newErrors.sessionTimeoutMinutes = 'Session timeout must be between 15 and 1440 minutes';
    }

    if (settings.maxLoginAttempts < 3 || settings.maxLoginAttempts > 10) {
      newErrors.maxLoginAttempts = 'Max login attempts must be between 3 and 10';
    }

    if (settings.lockoutDurationMinutes < 5 || settings.lockoutDurationMinutes > 1440) {
      newErrors.lockoutDurationMinutes = 'Lockout duration must be between 5 and 1440 minutes';
    }

    if (settings.jwtExpiryHours < 1 || settings.jwtExpiryHours > 168) {
      newErrors.jwtExpiryHours = 'JWT expiry must be between 1 and 168 hours';
    }

    if (settings.refreshTokenExpiryDays < 1 || settings.refreshTokenExpiryDays > 30) {
      newErrors.refreshTokenExpiryDays = 'Refresh token expiry must be between 1 and 30 days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = <K extends keyof SecuritySettingsData>(
    key: K,
    value: SecuritySettingsData[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));

    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleAddCorsOrigin = () => {
    if (newCorsOrigin && !settings.corsOrigins.includes(newCorsOrigin)) {
      const validUrl = newCorsOrigin.startsWith('http://') || newCorsOrigin.startsWith('https://');
      if (!validUrl) {
        toast.error('CORS origin must be a valid URL starting with http:// or https://');
        return;
      }
      setSettings((prev) => ({
        ...prev,
        corsOrigins: [...prev.corsOrigins, newCorsOrigin],
      }));
      setNewCorsOrigin('');
    }
  };

  const handleRemoveCorsOrigin = (origin: string) => {
    setSettings((prev) => ({
      ...prev,
      corsOrigins: prev.corsOrigins.filter((o) => o !== origin),
    }));
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.put('/admin/settings/security', settings);
      setOriginalSettings(settings);
      toast.success('Security settings saved successfully!');
    } catch (error) {
      console.error('Failed to save security settings:', error);
      toast.error('Failed to save security settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setErrors({});
    toast.info('Settings reset to last saved values');
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex h-32 items-center justify-center">
          <div className="text-gray-500">Loading security settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">Security Settings</h2>

      <div className="space-y-8">
        {/* Password Requirements */}
        <div>
          <h3 className="mb-4 text-lg font-medium text-gray-900">Password Requirements</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="passwordMinLength"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Minimum Password Length
              </label>
              <input
                type="number"
                id="passwordMinLength"
                min={6}
                max={32}
                value={settings.passwordMinLength}
                onChange={(e) => handleChange('passwordMinLength', parseInt(e.target.value, 10))}
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.passwordMinLength ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.passwordMinLength && (
                <p className="mt-1 text-sm text-red-600">{errors.passwordMinLength}</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.passwordRequireUppercase}
                  onChange={(e) => handleChange('passwordRequireUppercase', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Require uppercase letters</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.passwordRequireLowercase}
                  onChange={(e) => handleChange('passwordRequireLowercase', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Require lowercase letters</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.passwordRequireNumbers}
                  onChange={(e) => handleChange('passwordRequireNumbers', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Require numbers</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.passwordRequireSpecial}
                  onChange={(e) => handleChange('passwordRequireSpecial', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Require special characters</span>
              </label>
            </div>
          </div>
        </div>

        {/* Session Settings */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Session Settings</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="sessionTimeoutMinutes"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                id="sessionTimeoutMinutes"
                min={15}
                max={1440}
                value={settings.sessionTimeoutMinutes}
                onChange={(e) =>
                  handleChange('sessionTimeoutMinutes', parseInt(e.target.value, 10))
                }
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.sessionTimeoutMinutes ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.sessionTimeoutMinutes && (
                <p className="mt-1 text-sm text-red-600">{errors.sessionTimeoutMinutes}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="jwtExpiryHours"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                JWT Expiry (hours)
              </label>
              <input
                type="number"
                id="jwtExpiryHours"
                min={1}
                max={168}
                value={settings.jwtExpiryHours}
                onChange={(e) => handleChange('jwtExpiryHours', parseInt(e.target.value, 10))}
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.jwtExpiryHours ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.jwtExpiryHours && (
                <p className="mt-1 text-sm text-red-600">{errors.jwtExpiryHours}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="refreshTokenExpiryDays"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Refresh Token Expiry (days)
              </label>
              <input
                type="number"
                id="refreshTokenExpiryDays"
                min={1}
                max={30}
                value={settings.refreshTokenExpiryDays}
                onChange={(e) =>
                  handleChange('refreshTokenExpiryDays', parseInt(e.target.value, 10))
                }
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.refreshTokenExpiryDays ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.refreshTokenExpiryDays && (
                <p className="mt-1 text-sm text-red-600">{errors.refreshTokenExpiryDays}</p>
              )}
            </div>
          </div>
        </div>

        {/* Account Security */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Account Security</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="maxLoginAttempts"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Maximum Login Attempts
              </label>
              <input
                type="number"
                id="maxLoginAttempts"
                min={3}
                max={10}
                value={settings.maxLoginAttempts}
                onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value, 10))}
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxLoginAttempts ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.maxLoginAttempts && (
                <p className="mt-1 text-sm text-red-600">{errors.maxLoginAttempts}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="lockoutDurationMinutes"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Lockout Duration (minutes)
              </label>
              <input
                type="number"
                id="lockoutDurationMinutes"
                min={5}
                max={1440}
                value={settings.lockoutDurationMinutes}
                onChange={(e) =>
                  handleChange('lockoutDurationMinutes', parseInt(e.target.value, 10))
                }
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.lockoutDurationMinutes ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.lockoutDurationMinutes && (
                <p className="mt-1 text-sm text-red-600">{errors.lockoutDurationMinutes}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center rounded-lg bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={settings.twoFactorEnabled}
                onChange={(e) => handleChange('twoFactorEnabled', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900">Two-Factor Authentication</span>
                <p className="text-sm text-gray-500">
                  Require 2FA for all user accounts (recommended for enhanced security)
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* CORS Configuration */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-4 text-lg font-medium text-gray-900">CORS Configuration</h3>
          <p className="mb-4 text-sm text-gray-500">
            Allowed origins for Cross-Origin Resource Sharing. Leave empty to allow all origins.
          </p>

          <div className="mb-4 flex gap-2">
            <input
              type="url"
              value={newCorsOrigin}
              onChange={(e) => setNewCorsOrigin(e.target.value)}
              placeholder="Add new origin..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddCorsOrigin}
              disabled={!newCorsOrigin}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {settings.corsOrigins.map((origin, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
              >
                <span className="font-mono text-sm text-gray-700">{origin}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCorsOrigin(origin)}
                  className="rounded p-1 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
                  aria-label="Remove origin"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
            {settings.corsOrigins.length === 0 && (
              <p className="text-sm italic text-gray-500">No CORS origins configured</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              !hasChanges || isSaving
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Security Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
