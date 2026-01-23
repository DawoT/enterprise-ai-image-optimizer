'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'react-toastify';

interface Model {
  id: string;
  name: string;
  provider: string;
  status: 'active' | 'inactive' | 'error' | 'testing';
  apiKeyConfigured: boolean;
  description: string;
  features: string[];
  pricing: {
    perImage: number;
    currency?: string;
  };
  config?: {
    apiEndpoint?: string;
    modelVersion?: string;
    maxTokens?: number;
    temperature?: number;
  };
}

interface ModelSelectorProps {
  initialModels?: Model[];
  selectedModelId?: string;
  onModelSelect?: (modelId: string) => void;
  onConfigSave?: (modelId: string, config: Record<string, unknown>) => void;
  loading?: boolean;
  className?: string;
  requireActiveForConfig?: boolean;
  allowCustomModels?: boolean;
}

const defaultModels: Model[] = [
  {
    id: 'openai-dalle3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    status: 'active',
    apiKeyConfigured: true,
    description: 'High-quality image generation with natural language understanding',
    features: ['Natural language prompts', 'High resolution output', 'Content moderation'],
    pricing: { perImage: 0.04, currency: 'USD' },
  },
  {
    id: 'stability-sdxl',
    name: 'Stable Diffusion XL',
    provider: 'Stability AI',
    status: 'inactive',
    apiKeyConfigured: false,
    description: 'Open-source model with extensive customization options',
    features: ['Style control', 'Negative prompts', 'Multiple aspect ratios'],
    pricing: { perImage: 0.005, currency: 'USD' },
  },
  {
    id: 'local-ollama',
    name: 'Ollama (Local)',
    provider: 'Local',
    status: 'active',
    apiKeyConfigured: true,
    description: 'Run models locally with privacy and zero API costs',
    features: ['Offline operation', 'Privacy preserved', 'No per-image costs'],
    pricing: { perImage: 0, currency: 'USD' },
  },
];

export default function ModelSelector({
  initialModels = defaultModels,
  selectedModelId,
  onModelSelect,
  onConfigSave,
  loading = false,
  className = '',
  requireActiveForConfig = false,
  allowCustomModels = false,
}: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>(initialModels);
  const [activeModelId, setActiveModelId] = useState(selectedModelId || 'openai-dalle3');
  const [isLoading, setIsLoading] = useState(loading);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configuringModel, setConfiguringModel] = useState<Model | null>(null);
  const [configForm, setConfigForm] = useState({
    apiKey: '',
    showApiKey: false,
    apiEndpoint: '',
    modelVersion: '',
    temperature: 0.7,
    maxTokens: 1000,
  });
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchModels = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<Model[]>('/admin/ai/models');
      setModels(response.data);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      toast.error('Failed to load AI models');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialModels.length === 0) {
      fetchModels();
    }
  }, [initialModels.length, fetchModels]);

  const handleModelSelect = (modelId: string) => {
    setActiveModelId(modelId);
    onModelSelect?.(modelId);
  };

  const openConfigModal = (model: Model) => {
    if (requireActiveForConfig && model.status !== 'active') {
      toast.error('Model must be active to configure');
      return;
    }
    setConfiguringModel(model);
    setConfigForm({
      apiKey: model.config?.apiEndpoint || '',
      showApiKey: false,
      apiEndpoint: model.config?.apiEndpoint || '',
      modelVersion: model.config?.modelVersion || '',
      temperature: model.config?.temperature || 0.7,
      maxTokens: model.config?.maxTokens || 1000,
    });
    setConnectionStatus('idle');
    setErrors({});
    setShowConfigModal(true);
  };

  const handleCloseConfig = () => {
    setShowConfigModal(false);
    setConfiguringModel(null);
    setConnectionStatus('idle');
    setErrors({});
  };

  const validateConfig = () => {
    const newErrors: Record<string, string> = {};

    if (!configuringModel?.apiKeyConfigured && !configForm.apiKey.trim()) {
      newErrors.apiKey = 'API key is required';
    }

    if (configForm.temperature < 0 || configForm.temperature > 2) {
      newErrors.temperature = 'Temperature must be between 0 and 2';
    }

    if (configForm.maxTokens < 1 || configForm.maxTokens > 4000) {
      newErrors.maxTokens = 'Max tokens must be between 1 and 4000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateConfig()) return;

    try {
      setConnectionStatus('testing');
      await apiClient.post('/admin/ai/models/test-connection', {
        modelId: configuringModel?.id,
        apiKey: configForm.apiKey,
        apiEndpoint: configForm.apiEndpoint,
      });
      setConnectionStatus('success');
      toast.success('Connection successful!');
    } catch (error) {
      setConnectionStatus('error');
      toast.error('Connection failed. Please check your credentials.');
    }
  };

  const handleSaveConfig = async () => {
    if (!validateConfig()) return;

    try {
      await apiClient.post(`/admin/ai/models/${configuringModel?.id}/config`, {
        apiKey: configForm.apiKey,
        apiEndpoint: configForm.apiEndpoint,
        modelVersion: configForm.modelVersion,
        temperature: configForm.temperature,
        maxTokens: configForm.maxTokens,
      });

      toast.success('Configuration saved successfully!');
      handleCloseConfig();
      onConfigSave?.(configuringModel?.id || '', configForm);
      fetchModels();
    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast.error('Failed to save configuration');
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `$${price.toFixed(3)}/image`;
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
      testing: 'bg-yellow-100 text-yellow-800',
    };
    return classes[status] || classes.inactive;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Active',
      inactive: 'Inactive',
      error: 'Error',
      testing: 'Testing',
    };
    return labels[status] || status;
  };

  const filteredModels =
    filterProvider === 'all' ? models : models.filter((m) => m.provider === filterProvider);

  const providers = [...new Set(models.map((m) => m.provider))];

  if (isLoading) {
    return (
      <div data-testid="models-skeleton" className={`animate-pulse ${className}`}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-lg bg-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="model-selector-container" className={className}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">AI Model Configuration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Select and configure your AI image optimization models
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Provider Filter */}
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Providers</option>
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>

          {/* Add Custom Model Button */}
          {allowCustomModels && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Custom Model
            </button>
          )}
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredModels.map((model) => (
          <div
            key={model.id}
            onClick={() => handleModelSelect(model.id)}
            className={`relative cursor-pointer rounded-lg border-2 bg-white transition-all ${
              activeModelId === model.id
                ? 'border-blue-500 shadow-lg'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Provider Badge */}
            <div className="absolute right-4 top-4">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(model.status)}`}
              >
                {getStatusLabel(model.status)}
              </span>
            </div>

            {/* Model Info */}
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{model.name}</h3>
                  <p className="text-sm text-gray-500">{model.provider}</p>
                </div>
              </div>

              <p className="mb-4 text-sm text-gray-600">{model.description}</p>

              {/* Pricing */}
              <div className="mb-4">
                <span className="text-lg font-semibold text-gray-900">
                  {formatPrice(model.pricing.perImage)}
                </span>
              </div>

              {/* Features */}
              <ul className="mb-4 space-y-2">
                {model.features.slice(0, 3).map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <svg
                      className="mr-2 h-4 w-4 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* API Key Status */}
              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="flex items-center text-sm">
                  {model.apiKeyConfigured ? (
                    <span className="flex items-center text-green-600">
                      <svg
                        className="mr-1 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      API Key Configured
                    </span>
                  ) : (
                    <span className="flex items-center text-yellow-600">
                      <svg
                        className="mr-1 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      API Key Required
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openConfigModal(model);
                  }}
                  disabled={requireActiveForConfig && model.status !== 'active'}
                  className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Configure
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && configuringModel && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={handleCloseConfig}
            />

            <div className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Configure {configuringModel.name}
                </h3>
                <button onClick={handleCloseConfig} className="text-gray-400 hover:text-gray-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* API Key */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    API Key {!configuringModel.apiKeyConfigured && '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={configForm.showApiKey ? 'text' : 'password'}
                      value={configForm.apiKey}
                      onChange={(e) =>
                        setConfigForm((prev) => ({ ...prev, apiKey: e.target.value }))
                      }
                      className={`w-full rounded-lg border px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.apiKey ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="sk-..."
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setConfigForm((prev) => ({ ...prev, showApiKey: !prev.showApiKey }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
                    >
                      {configForm.showApiKey ? (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.apiKey && <p className="mt-1 text-sm text-red-600">{errors.apiKey}</p>}
                </div>

                {/* API Endpoint */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    API Endpoint
                  </label>
                  <input
                    type="url"
                    value={configForm.apiEndpoint}
                    onChange={(e) =>
                      setConfigForm((prev) => ({ ...prev, apiEndpoint: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://api.example.com/v1"
                  />
                </div>

                {/* Model Version */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Model Version
                  </label>
                  <input
                    type="text"
                    value={configForm.modelVersion}
                    onChange={(e) =>
                      setConfigForm((prev) => ({ ...prev, modelVersion: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="dall-e-3"
                  />
                </div>

                {/* Temperature */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Temperature: {configForm.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={configForm.temperature}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        temperature: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                  {errors.temperature && (
                    <p className="mt-1 text-sm text-red-600">{errors.temperature}</p>
                  )}
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Max Tokens</label>
                  <input
                    type="number"
                    min="1"
                    max="4000"
                    value={configForm.maxTokens}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        maxTokens: parseInt(e.target.value) || 0,
                      }))
                    }
                    className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.maxTokens ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.maxTokens && (
                    <p className="mt-1 text-sm text-red-600">{errors.maxTokens}</p>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
                <button
                  onClick={handleCloseConfig}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={connectionStatus === 'testing'}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={connectionStatus === 'testing'}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
