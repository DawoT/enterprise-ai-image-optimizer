'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'react-toastify';

interface GeneralSettingsData {
  appName: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  defaultLanguage: string;
  maintenanceMode: boolean;
  logLevel: string;
}

interface GeneralSettingsProps {
  onSettingsChange?: (hasChanges: boolean) => void;
}

const defaultSettings: GeneralSettingsData = {
  appName: '',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  defaultLanguage: 'en',
  maintenanceMode: false,
  logLevel: 'info',
};

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const dateFormats = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD' },
];

const timeFormatOptions = [
  { value: '12h', label: '12-hour (AM/PM)' },
  { value: '24h', label: '24-hour' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'pt', label: 'Portuguese' },
];

const logLevels = [
  { value: 'error', label: 'Error' },
  { value: 'warn', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'debug', label: 'Debug' },
  { value: 'trace', label: 'Trace' },
];

export default function GeneralSettings({ onSettingsChange }: GeneralSettingsProps) {
  const [settings, setSettings] = useState<GeneralSettingsData>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<GeneralSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof GeneralSettingsData, string>>>({});

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<GeneralSettingsData>('/admin/settings/general');
      const fetchedSettings = response.data;
      setSettings(fetchedSettings);
      setOriginalSettings(fetchedSettings);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings. Please try again.');
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
    const newErrors: Partial<Record<keyof GeneralSettingsData, string>> = {};

    if (!settings.appName.trim()) {
      newErrors.appName = 'Application name is required';
    }

    if (settings.appName.length > 100) {
      newErrors.appName = 'Application name must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = <K extends keyof GeneralSettingsData>(
    key: K,
    value: GeneralSettingsData[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));

    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.put('/admin/settings/general', settings);
      setOriginalSettings(settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
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
          <div className="text-gray-500">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">General Settings</h2>

      <div className="space-y-6">
        {/* Application Name */}
        <div>
          <label htmlFor="appName" className="mb-2 block text-sm font-medium text-gray-700">
            Application Name
          </label>
          <input
            type="text"
            id="appName"
            value={settings.appName}
            onChange={(e) => handleChange('appName', e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.appName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter application name"
          />
          {errors.appName && <p className="mt-1 text-sm text-red-600">{errors.appName}</p>}
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="mb-2 block text-sm font-medium text-gray-700">
            Timezone
          </label>
          <select
            id="timezone"
            value={settings.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            All timestamps will be displayed in this timezone
          </p>
        </div>

        {/* Date and Time Formats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="dateFormat" className="mb-2 block text-sm font-medium text-gray-700">
              Date Format
            </label>
            <select
              id="dateFormat"
              value={settings.dateFormat}
              onChange={(e) => handleChange('dateFormat', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {dateFormats.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="timeFormat" className="mb-2 block text-sm font-medium text-gray-700">
              Time Format
            </label>
            <select
              id="timeFormat"
              value={settings.timeFormat}
              onChange={(e) => handleChange('timeFormat', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeFormatOptions.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Default Language */}
        <div>
          <label htmlFor="defaultLanguage" className="mb-2 block text-sm font-medium text-gray-700">
            Default Language
          </label>
          <select
            id="defaultLanguage"
            value={settings.defaultLanguage}
            onChange={(e) => handleChange('defaultLanguage', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Maintenance Mode */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Maintenance Mode</h3>
            <p className="text-sm text-gray-500">
              When enabled, only administrators can access the application
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
          </label>
        </div>

        {/* Log Level */}
        <div>
          <label htmlFor="logLevel" className="mb-2 block text-sm font-medium text-gray-700">
            Log Level
          </label>
          <select
            id="logLevel"
            value={settings.logLevel}
            onChange={(e) => handleChange('logLevel', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {logLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Higher log levels generate more detailed logs but consume more storage
          </p>
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
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
