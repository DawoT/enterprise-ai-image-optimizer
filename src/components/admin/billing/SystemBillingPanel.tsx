'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'react-toastify';
import UsageMeter from './UsageMeter';
import SubscriptionStatusCard from './SubscriptionStatusCard';
import InvoiceHistoryTable from './InvoiceHistoryTable';
import PlanManager from './PlanManager';
import PaymentMethodModal from './PaymentMethodModal';

interface Subscription {
  id: string;
  planName: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'unpaid' | 'paused';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentMethod: {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
}

interface UsageStats {
  used: number;
  limit: number;
  resetDate: string;
  metricName: string;
}

interface Invoice {
  id: string;
  created: number;
  amount_paid: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible' | 'draft';
  pdf_url: string;
  description?: string;
}

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

export default function SystemBillingPanel() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'invoices'>('overview');

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);

      const [subResponse, usageResponse, invoicesResponse, plansResponse] = await Promise.all([
        apiClient.get<Subscription>('/admin/billing/subscription'),
        apiClient.get<UsageStats>('/admin/billing/usage-stats'),
        apiClient.get<Invoice[]>('/admin/billing/invoices'),
        apiClient.get<Plan[]>('/admin/billing/plans'),
      ]);

      setSubscription(subResponse.data);
      setUsageStats(usageResponse.data);
      setInvoices(invoicesResponse.data);
      setPlans(plansResponse.data);
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleUpdatePayment = () => {
    setShowPaymentModal(true);
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    try {
      await apiClient.post('/admin/billing/cancel', {});
      toast.success('Subscription will be canceled at the end of the current period');
      fetchBillingData();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast.error('Failed to cancel subscription');
    }
  };

  const handleManageSubscription = () => {
    apiClient
      .post('/admin/billing/create-portal-session', {})
      .then((response) => {
        if (response.data.url) {
          window.location.href = response.data.url;
        }
      })
      .catch((error) => {
        console.error('Failed to create portal session:', error);
        toast.error('Failed to open billing portal');
      });
  };

  const handlePlanSelect = async (plan: Plan) => {
    try {
      await apiClient.post('/admin/billing/subscribe', { planId: plan.id });
      toast.success(`Successfully switched to ${plan.name} plan`);
      fetchBillingData();
    } catch (error) {
      console.error('Failed to change plan:', error);
      toast.error('Failed to change plan. Please try again.');
    }
  };

  const handleInvoiceDownload = (invoice: Invoice) => {
    window.open(invoice.pdf_url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200"></div>
        </div>
        <div className="p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="h-64 rounded-lg bg-gray-200"></div>
              <div className="h-64 rounded-lg bg-gray-200"></div>
            </div>
            <div className="h-96 rounded-lg bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your subscription, payment methods, and billing history
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {subscription ? `${subscription.planName} plan` : 'No active subscription'}
            </span>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white px-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'plans'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Plans
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'invoices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Invoices
          </button>
        </nav>
      </div>

      <div className="p-6">
        <div className="mx-auto max-w-6xl">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {subscription && (
                  <SubscriptionStatusCard
                    subscription={subscription}
                    onUpdatePayment={handleUpdatePayment}
                    onCancelSubscription={handleCancelSubscription}
                    onManageSubscription={handleManageSubscription}
                  />
                )}

                {usageStats && (
                  <UsageMeter
                    metricName={usageStats.metricName}
                    current={usageStats.used}
                    limit={usageStats.limit}
                    resetDate={usageStats.resetDate}
                    showWarning
                    showUpgradeCTA
                    onUpgradeClick={() => setActiveTab('plans')}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Current Period</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscription
                      ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                      : '-'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscription
                      ? new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: subscription.currency.toUpperCase(),
                        }).format(subscription.amount / 100)
                      : '-'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="text-lg font-semibold capitalize text-gray-900">
                    {subscription?.status || 'N/A'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Invoices</p>
                  <p className="text-lg font-semibold text-gray-900">{invoices.length}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'plans' && (
            <PlanManager
              initialPlans={plans}
              onPlanSelect={handlePlanSelect}
              onPlansChange={setPlans}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoiceHistoryTable
              invoices={invoices}
              onDownload={handleInvoiceDownload}
              showDescription
            />
          )}
        </div>
      </div>

      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={fetchBillingData}
      />

      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>All payments are secured with 256-bit SSL encryption</span>
          </div>
          <div className="flex items-center gap-4">
            <span>
              Need help?{' '}
              <a href="/support" className="text-blue-600 hover:underline">
                Contact Support
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
