'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'react-toastify';

interface Plan {
  id: string;
  name: string;
  description?: string;
  priceId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  isActive: boolean;
  features: string[];
  limits: {
    images: number;
    storageGB: number;
  };
  popular?: boolean;
}

interface PlanManagerProps {
  initialPlans?: Plan[];
  onPlanSelect?: (plan: Plan) => void;
  onPlansChange?: (plans: Plan[]) => void;
  className?: string;
  loading?: boolean;
}

const defaultPlans: Plan[] = [
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
];

export default function PlanManager({
  initialPlans = defaultPlans,
  onPlanSelect,
  onPlansChange,
  className = '',
  loading = false,
}: PlanManagerProps) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [isLoading, setIsLoading] = useState(loading);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [pricingInterval, setPricingInterval] = useState<'month' | 'year'>('month');
  const [formData, setFormData] = useState<Partial<Plan>>({
    name: '',
    description: '',
    amount: 0,
    currency: 'usd',
    interval: 'month',
    isActive: true,
    features: [],
    limits: { images: 1000, storageGB: 10 },
    popular: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<Plan[]>('/admin/billing/plans');
      setPlans(response.data);
      if (onPlansChange) {
        onPlansChange(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  }, [onPlansChange]);

  useEffect(() => {
    if (initialPlans.length > 0) {
      setPlans(initialPlans);
    } else {
      fetchPlans();
    }
  }, [initialPlans, fetchPlans]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Plan name is required';
    } else if (
      plans.some(
        (p) => p.name.toLowerCase() === formData.name!.toLowerCase() && p.id !== editingPlan?.id
      )
    ) {
      newErrors.name = 'Plan name must be unique';
    }

    if (formData.amount === undefined || formData.amount === null || formData.amount < 0) {
      newErrors.amount = 'Price is required';
    } else if (formData.amount > 0 && formData.amount < 100) {
      newErrors.amount = 'Price must be at least $1.00';
    }

    if (!formData.features || formData.features.length === 0) {
      newErrors.features = 'At least one feature is required';
    }

    if (!formData.limits?.images || formData.limits.images < 0) {
      newErrors.limits = 'Image limit must be valid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      amount: 0,
      currency: 'usd',
      interval: 'month',
      isActive: true,
      features: [],
      limits: { images: 1000, storageGB: 10 },
      popular: false,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      amount: plan.amount,
      currency: plan.currency,
      interval: plan.interval,
      isActive: plan.isActive,
      features: [...plan.features],
      limits: { ...plan.limits },
      popular: plan.popular || false,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const payload = {
        ...formData,
        priceId: editingPlan?.priceId || `price_${Date.now()}`,
      };

      if (editingPlan) {
        await apiClient.put(`/admin/billing/plans/${editingPlan.id}`, payload);
        toast.success('Plan updated successfully!');
      } else {
        await apiClient.post('/admin/billing/plans', payload);
        toast.success('Plan created successfully!');
      }

      setShowModal(false);
      fetchPlans();
    } catch (error) {
      console.error('Failed to save plan:', error);
      toast.error(`Failed to ${editingPlan ? 'update' : 'create'} plan. Please try again.`);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (plan.id === 'plan_free') {
      toast.error('Cannot delete the free plan');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the ${plan.name} plan?`)) {
      return;
    }

    try {
      await apiClient.delete(`/admin/billing/plans/${plan.id}`);
      toast.success('Plan deleted successfully!');
      fetchPlans();
    } catch (error) {
      console.error('Failed to delete plan:', error);
      toast.error('Failed to delete plan. Please try again.');
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      await apiClient.put(`/admin/billing/plans/${plan.id}`, {
        isActive: !plan.isActive,
      });
      fetchPlans();
    } catch (error) {
      console.error('Failed to toggle plan status:', error);
      toast.error('Failed to update plan status');
    }
  };

  const handleAddFeature = (feature: string) => {
    if (feature.trim() && !formData.features?.includes(feature.trim())) {
      setFormData((prev) => ({
        ...prev,
        features: [...(prev.features || []), feature.trim()],
      }));
    }
  };

  const handleRemoveFeature = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features?.filter((f) => f !== feature) || [],
    }));
  };

  const formatPrice = (amount: number, interval: string) => {
    if (amount === 0) return 'Free';
    const displayAmount = interval === 'year' ? Math.round(amount * 12 * 0.8) : amount;
    return `$${(displayAmount / 100).toFixed(0)}`;
  };

  const formatLimits = (images: number, storage: number) => {
    const imagesText = images === -1 ? 'Unlimited' : `${images.toLocaleString()}`;
    const storageText = `${storage} GB`;
    return { images: imagesText, storage: storageText };
  };

  if (isLoading) {
    return (
      <div data-testid="plans-skeleton" className={`animate-pulse ${className}`}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 rounded-lg bg-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Subscription Plans</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your pricing tiers and features</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Pricing Toggle */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setPricingInterval('month')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                pricingInterval === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPricingInterval('year')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                pricingInterval === 'year'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-1 text-xs text-green-600">(20% off)</span>
            </button>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Plan
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const { images, storage } = formatLimits(plan.limits.images, plan.limits.storageGB);
          return (
            <div
              key={plan.id}
              className={`relative rounded-lg border-2 bg-white transition-all ${
                plan.popular
                  ? 'scale-105 border-blue-500 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-6">
                {/* Plan Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-500">{plan.description}</p>
                  </div>
                  <div className="group relative">
                    <button className="rounded p-1 text-gray-400 hover:text-gray-600">
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
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                        />
                      </svg>
                    </button>
                    <div className="absolute right-0 z-10 mt-1 hidden w-40 rounded-md border border-gray-200 bg-white shadow-lg group-hover:block">
                      <button
                        onClick={() => handleOpenEdit(plan)}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Edit Plan
                      </button>
                      <button
                        onClick={() => handleToggleActive(plan)}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {plan.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      {plan.id !== 'plan_free' && (
                        <button
                          onClick={() => handleDelete(plan)}
                          className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete Plan
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(plan.amount, pricingInterval)}
                  </span>
                  <span className="ml-2 text-gray-500">
                    /{pricingInterval === 'year' ? 'year' : 'month'}
                  </span>
                </div>

                {/* Limits */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
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
                    {images} images/{pricingInterval}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
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
                    {storage} storage
                  </div>
                </div>

                {/* Features */}
                <ul className="mb-6 space-y-2">
                  {plan.features.slice(0, 5).map((feature, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-600">
                      <svg
                        className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
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
                  {plan.features.length > 5 && (
                    <li className="pl-6 text-sm text-gray-500">
                      +{plan.features.length - 5} more features
                    </li>
                  )}
                </ul>

                {/* Select Button */}
                <button
                  onClick={() => onPlanSelect?.(plan)}
                  className={`w-full rounded-lg px-4 py-2 font-medium transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.amount === 0 ? 'Current Plan' : 'Select Plan'}
                </button>

                {/* Inactive Badge */}
                {!plan.isActive && (
                  <div className="mt-3 text-center">
                    <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
                      Inactive
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowModal(false)}
            />
            <div className="relative z-10 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
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
                {/* Plan Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Pro, Enterprise"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Brief description of the plan"
                  />
                </div>

                {/* Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Price (cents) *
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, amount: parseInt(e.target.value) || 0 }))
                      }
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.amount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="4900 = $49.00"
                      min="0"
                    />
                    {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, currency: e.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="usd">USD</option>
                      <option value="eur">EUR</option>
                      <option value="gbp">GBP</option>
                    </select>
                  </div>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Image Limit (-1 for unlimited)
                    </label>
                    <input
                      type="number"
                      value={formData.limits?.images}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          limits: { ...prev.limits!, images: parseInt(e.target.value) || 0 },
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="-1"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Storage (GB)
                    </label>
                    <input
                      type="number"
                      value={formData.limits?.storageGB}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          limits: { ...prev.limits!, storageGB: parseInt(e.target.value) || 0 },
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                </div>

                {/* Features */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Features *</label>
                  <div className="mb-2 flex gap-2">
                    <input
                      type="text"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFeature((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a feature..."
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = (e.target as HTMLElement)
                          .previousElementSibling as HTMLInputElement;
                        handleAddFeature(input.value);
                        input.value = '';
                      }}
                      className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
                    >
                      Add
                    </button>
                  </div>
                  {errors.features && (
                    <p className="mb-2 text-sm text-red-600">{errors.features}</p>
                  )}
                  <ul className="space-y-2">
                    {formData.features?.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between rounded bg-gray-50 px-3 py-2"
                      >
                        <span className="text-sm text-gray-700">{feature}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(feature)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Popular Toggle */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="popular"
                    checked={formData.popular}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, popular: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="popular" className="ml-2 text-sm text-gray-700">
                    Mark as most popular plan
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
