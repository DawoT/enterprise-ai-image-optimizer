'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'react-toastify';

interface LimitsSettingsData {
  maxRequestsPerUser: number;
  maxConcurrentProcesses: number;
  maxFileSizeMB: number;
  maxStoragePerUserMB: number;
  rateLimitWindowMinutes: number;
  allowedFileTypes: string[];
  maxImageDimensions: {
    width: number;
    height: number;
  };
  quotaWarningThreshold: number;
  maxWebhooks: number;
}

interface LimitsSettingsProps {
  onSettingsChange?: (hasChanges: boolean) => void;
}

const defaultSettings: LimitsSettingsData = {
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

export default function LimitsSettings({ onSettingsChange }: LimitsSettingsProps) {
  const [settings, setSettings] = useState<LimitsSettingsData>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<LimitsSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newFileType, setNewFileType] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof LimitsSettingsData, string>>>({});

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<LimitsSettingsData>('/admin/settings/limits');
      const fetchedSettings = response.data;
      setSettings(fetchedSettings);
      setOriginalSettings(fetchedSettings);
    } catch (error) {
      console.error('Failed to fetch limits settings:', error);
      toast.error('Failed to load limits settings. Please try again.');
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
    const newErrors: Partial<Record<keyof LimitsSettingsData, string>> = {};

    if (settings.maxRequestsPerUser < 100 || settings.maxRequestsPerUser > 100000) {
      newErrors.maxRequestsPerUser = 'Max requests must be between 100 and 100,000';
    }

    if (settings.maxConcurrentProcesses < 1 || settings.maxConcurrentProcesses > 50) {
      newErrors.maxConcurrentProcesses = 'Max concurrent processes must be between 1 and 50';
    }

    if (settings.maxFileSizeMB < 1 || settings.maxFileSizeMB > 200) {
      newErrors.maxFileSizeMB = 'Max file size must be between 1 and 200 MB';
    }

    if (settings.maxStoragePerUserMB < 1024 || settings.maxStoragePerUserMB > 1048576) {
      newErrors.maxStoragePerUserMB = 'Max storage must be between 1 GB and 1 TB';
    }

    if (settings.rateLimitWindowMinutes < 1 || settings.rateLimitWindowMinutes > 60) {
      newErrors.rateLimitWindowMinutes = 'Rate limit window must be between 1 and 60 minutes';
    }

    if (settings.maxImageDimensions.width < 100 || settings.maxImageDimensions.width > 8192) {
      newErrors.maxImageDimensions = 'Max dimension must not exceed 8192 pixels';
    }

    if (settings.quotaWarningThreshold < 50 || settings.quotaWarningThreshold > 100) {
      newErrors.quotaWarningThreshold = 'Quota warning threshold must be between 50 and 100';
    }

    if (settings.maxWebhooks < 1 || settings.maxWebhooks > 100) {
      newErrors.maxWebhooks = 'Max webhooks must be between 1 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = <K extends keyof LimitsSettingsData>(
    key: K,
    value: LimitsSettingsData[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));

    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleDimensionChange = (dimension: 'width' | 'height', value: number) => {
    setSettings((prev) => ({
      ...prev,
      maxImageDimensions: {
        ...prev.maxImageDimensions,
        [dimension]: value,
      },
    }));
  };

  const handleAddFileType = () => {
    if (newFileType) {
      const normalizedType = newFileType.toLowerCase().trim();
      if (settings.allowedFileTypes.includes(normalizedType)) {
        toast.error('File type already exists');
        return;
      }
      if (!/^[a-z0-9]+$/.test(normalizedType)) {
        toast.error('Invalid file type. Only alphanumeric characters allowed.');
        return;
      }
      setSettings((prev) => ({
        ...prev,
        allowedFileTypes: [...prev.allowedFileTypes, normalizedType],
      }));
      setNewFileType('');
    }
  };

  const handleRemoveFileType = (fileType: string) => {
    setSettings((prev) => ({
      ...prev,
      allowedFileTypes: prev.allowedFileTypes.filter((t) => t !== fileType),
    }));
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.put('/admin/settings/limits', settings);
      setOriginalSettings(settings);
      toast.success('Limits settings saved successfully!');
    } catch (error) {
      console.error('Failed to save limits settings:', error);
      toast.error('Failed to save limits settings. Please try again.');
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
          <div className="text-gray-500">Loading limits...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">Limits & Quotas</h2>

      <div className="space-y-8">
        {/* Request Limits */}
        <div>
          <h3 className="mb-4 text-lg font-medium text-gray-900">Request Limits</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="maxRequestsPerUser"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Max Requests per User
              </label>
              <input
                type="number"
                id="maxRequestsPerUser"
                min={100}
                max={100000}
                value={settings.maxRequestsPerUser}
                onChange={(e) => handleChange('maxRequestsPerUser', parseInt(e.target.value, 10))}
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxRequestsPerUser ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.maxRequestsPerUser && (
                <p className="mt-1 text-sm text-red-600">{errors.maxRequestsPerUser}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="rateLimitWindowMinutes"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Rate Limit Window (minutes)
              </label>
              <input
                type="number"
                id="rateLimitWindowMinutes"
                min={1}
                max={60}
                value={settings.rateLimitWindowMinutes}
                onChange={(e) =>
                  handleChange('rateLimitWindowMinutes', parseInt(e.target.value, 10))
                }
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.rateLimitWindowMinutes ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.rateLimitWindowMinutes && (
                <p className="mt-1 text-sm text-red-600">{errors.rateLimitWindowMinutes}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="maxConcurrentProcesses"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Max Concurrent Processes
              </label>
              <input
                type="number"
                id="maxConcurrentProcesses"
                min={1}
                max={50}
                value={settings.maxConcurrentProcesses}
                onChange={(e) =>
                  handleChange('maxConcurrentProcesses', parseInt(e.target.value, 10))
                }
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxConcurrentProcesses ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.maxConcurrentProcesses && (
                <p className="mt-1 text-sm text-red-600">{errors.maxConcurrentProcesses}</p>
              )}
            </div>

            <div>
              <label htmlFor="maxWebhooks" className="mb-2 block text-sm font-medium text-gray-700">
                Max Webhooks per User
              </label>
              <input
                type="number"
                id="maxWebhooks"
                min={1}
                max={100}
                value={settings.maxWebhooks}
                onChange={(e) => handleChange('maxWebhooks', parseInt(e.target.value, 10))}
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxWebhooks ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.maxWebhooks && (
                <p className="mt-1 text-sm text-red-600">{errors.maxWebhooks}</p>
              )}
            </div>
          </div>
        </div>

        {/* Storage Limits */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Storage Limits</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="maxFileSizeMB"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Max File Size (MB)
              </label>
              <input
                type="number"
                id="maxFileSizeMB"
                min={1}
                max={200}
                value={settings.maxFileSizeMB}
                onChange={(e) => handleChange('maxFileSizeMB', parseInt(e.target.value, 10))}
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxFileSizeMB ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.maxFileSizeMB && (
                <p className="mt-1 text-sm text-red-600">{errors.maxFileSizeMB}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="maxStoragePerUserMB"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Max Storage per User (MB)
              </label>
              <input
                type="number"
                id="maxStoragePerUserMB"
                min={1024}
                max={1048576}
                value={settings.maxStoragePerUserMB}
                onChange={(e) => handleChange('maxStoragePerUserMB', parseInt(e.target.value, 10))}
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxStoragePerUserMB ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.maxStoragePerUserMB && (
                <p className="mt-1 text-sm text-red-600">{errors.maxStoragePerUserMB}</p>
              )}
            </div>
          </div>
        </div>

        {/* File Constraints */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-4 text-lg font-medium text-gray-900">File Constraints</h3>

          {/* Allowed File Types */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Allowed File Types
            </label>
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={newFileType}
                onChange={(e) => setNewFileType(e.target.value)}
                placeholder="Add file type..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddFileType()}
              />
              <button
                type="button"
                onClick={handleAddFileType}
                disabled={!newFileType}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.allowedFileTypes.map((type, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
                >
                  {type}
                  <button
                    type="button"
                    onClick={() => handleRemoveFileType(type)}
                    className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none"
                    aria-label={`Remove ${type}`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Max Image Dimensions */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="maxWidth" className="mb-2 block text-sm font-medium text-gray-700">
                Max Width (px)
              </label>
              <input
                type="number"
                id="maxWidth"
                min={100}
                max={8192}
                value={settings.maxImageDimensions.width}
                onChange={(e) => handleDimensionChange('width', parseInt(e.target.value, 10))}
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxImageDimensions ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>

            <div>
              <label htmlFor="maxHeight" className="mb-2 block text-sm font-medium text-gray-700">
                Max Height (px)
              </label>
              <input
                type="number"
                id="maxHeight"
                min={100}
                max={8192}
                value={settings.maxImageDimensions.height}
                onChange={(e) => handleDimensionChange('height', parseInt(e.target.value, 10))}
                className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxImageDimensions ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
          </div>
          {errors.maxImageDimensions && (
            <p className="mt-1 text-sm text-red-600">{errors.maxImageDimensions}</p>
          )}
        </div>

        {/* Quota Alerts */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Quota Alerts</h3>
          <div>
            <label
              htmlFor="quotaWarningThreshold"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Quota Warning Threshold (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                id="quotaWarningThreshold"
                min={50}
                max={100}
                value={settings.quotaWarningThreshold}
                onChange={(e) =>
                  handleChange('quotaWarningThreshold', parseInt(e.target.value, 10))
                }
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200"
              />
              <span className="w-12 text-sm font-medium text-gray-700">
                {settings.quotaWarningThreshold}%
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Users will receive a warning when they reach {settings.quotaWarningThreshold}% of
              their quota
            </p>
            {errors.quotaWarningThreshold && (
              <p className="mt-1 text-sm text-red-600">{errors.quotaWarningThreshold}</p>
            )}
          </div>
        </div>

        {/* Current Configuration Display */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Current Configuration</h3>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <span className="text-gray-500">Requests/day:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {settings.maxRequestsPerUser.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Concurrent:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {settings.maxConcurrentProcesses} processes
                </span>
              </div>
              <div>
                <span className="text-gray-500">File size:</span>
                <span className="ml-2 font-medium text-gray-900">{settings.maxFileSizeMB} MB</span>
              </div>
              <div>
                <span className="text-gray-500">Storage:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {(settings.maxStoragePerUserMB / 1024).toFixed(0)} GB
                </span>
              </div>
            </div>
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
            {isSaving ? 'Saving...' : 'Save Limits Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
