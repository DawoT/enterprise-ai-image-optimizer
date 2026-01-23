'use client';

import React from 'react';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface SubscriptionStatusCardProps {
  subscription: {
    id: string;
    planName: string;
    status:
      | 'active'
      | 'past_due'
      | 'canceled'
      | 'trialing'
      | 'incomplete'
      | 'incomplete_expired'
      | 'unpaid'
      | 'paused';
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    paymentMethod: PaymentMethod | null;
    amount: number;
    currency: string;
    interval: 'month' | 'year';
  };
  onUpdatePayment?: () => void;
  onCancelSubscription?: () => void;
  onManageSubscription?: () => void;
  onAddPaymentMethod?: () => void;
  className?: string;
  loading?: boolean;
}

const getStatusBadgeConfig = (status: string) => {
  const configMap: Record<string, { label: string; className: string; icon: string }> = {
    active: {
      label: 'Active',
      className: 'bg-green-100 text-green-800',
      icon: 'check',
    },
    past_due: {
      label: 'Payment Failed',
      className: 'bg-red-100 text-red-800',
      icon: 'alert',
    },
    canceled: {
      label: 'Canceled',
      className: 'bg-gray-100 text-gray-800',
      icon: 'x',
    },
    trialing: {
      label: 'Trial',
      className: 'bg-blue-100 text-blue-800',
      icon: 'star',
    },
    incomplete: {
      label: 'Incomplete',
      className: 'bg-yellow-100 text-yellow-800',
      icon: 'alert',
    },
    incomplete_expired: {
      label: 'Expired',
      className: 'bg-red-100 text-red-800',
      icon: 'x',
    },
    unpaid: {
      label: 'Unpaid',
      className: 'bg-red-100 text-red-800',
      icon: 'alert',
    },
    paused: {
      label: 'Paused',
      className: 'bg-yellow-100 text-yellow-800',
      icon: 'pause',
    },
  };

  return (
    configMap[status] || {
      label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
      className: 'bg-gray-100 text-gray-800',
      icon: 'question',
    }
  );
};

const getCardBrandIcon = (brand: string) => {
  const brandLower = brand.toLowerCase();

  if (brandLower === 'visa') {
    return (
      <svg className="h-5 w-8" viewBox="0 0 48 32" fill="none">
        <rect width="48" height="32" rx="4" fill="#1A1F71" />
        <path
          d="M19.5 21h-3l2-10h3l-2 10zm-5.5-10l-3 7-0.5-2-1-5s-0.1-1-1.5-1h-7l-0.2 1c1.5 0.3 2.7 1.2 3.2 2l2.5 8h3l4.5-10h-3.5zm22 10h2.5l-2.2-10h-2.3c-1 0-1.5 0.7-1.5 1.5l-0.5 2-2 6.5h3l0.5-2h3.5l0.5 2h2.5l-2.5-10zm-3.5 0l1-5 0.5 2 1.5 3h-3l-0.5-2v2z"
          fill="white"
        />
      </svg>
    );
  }

  if (brandLower === 'mastercard') {
    return (
      <svg className="h-5 w-8" viewBox="0 0 48 32" fill="none">
        <rect width="48" height="32" rx="4" fill="#000000" />
        <circle cx="19" cy="16" r="10" fill="#EB001B" />
        <circle cx="29" cy="16" r="10" fill="#F79E1B" />
        <path d="M24 8.5a10 10 0 000 15 10 10 0 000-15z" fill="#FF5F00" />
      </svg>
    );
  }

  if (brandLower === 'amex') {
    return (
      <svg className="h-5 w-8" viewBox="0 0 48 32" fill="none">
        <rect width="48" height="32" rx="4" fill="#006FCF" />
        <text x="24" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
          AMEX
        </text>
      </svg>
    );
  }

  return (
    <svg className="h-5 w-8" viewBox="0 0 48 32" fill="none">
      <rect width="48" height="32" rx="4" fill="#374151" />
      <text x="24" y="20" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
        {brand.substring(0, 4).toUpperCase()}
      </text>
    </svg>
  );
};

const getBrandName = (brand: string) => {
  const brandMap: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  };

  return brandMap[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1);
};

export default function SubscriptionStatusCard({
  subscription,
  onUpdatePayment,
  onCancelSubscription,
  onManageSubscription,
  onAddPaymentMethod,
  className = '',
  loading = false,
}: SubscriptionStatusCardProps) {
  const statusConfig = getStatusBadgeConfig(subscription.status);
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const isCardExpired = () => {
    if (!subscription.paymentMethod) return false;
    const now = new Date();
    const expDate = new Date(
      subscription.paymentMethod.expYear,
      subscription.paymentMethod.expMonth - 1
    );
    return expDate < now;
  };

  if (loading) {
    return (
      <div
        data-testid="subscription-skeleton"
        className={`animate-pulse rounded-lg border border-gray-200 bg-white p-6 ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div className="h-4 w-24 rounded bg-gray-200"></div>
            <div className="h-6 w-40 rounded bg-gray-200"></div>
          </div>
          <div className="h-6 w-20 rounded bg-gray-200"></div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="h-20 rounded bg-gray-200"></div>
          <div className="h-20 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="subscription-status-card"
      className={`rounded-lg border border-gray-200 bg-white p-6 ${className}`}
    >
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">Current Plan</p>
          <h3 className="mt-1 text-xl font-bold text-gray-900">{subscription.planName}</h3>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.className}`}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Cancel Warning */}
      {subscription.cancelAtPeriodEnd && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <div className="flex items-center text-yellow-800">
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm font-medium">
              Your subscription will end on {formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>
        </div>
      )}

      {/* Past Due Warning */}
      {subscription.status === 'past_due' && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center text-red-800">
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium">Action required</p>
              <p className="mt-1 text-xs">
                Update your payment method to continue using the service.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Billing Info */}
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="mb-1 text-sm font-medium text-gray-500">Next billing date</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatDate(subscription.currentPeriodEnd)}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {formatAmount(subscription.amount, subscription.currency)} / {subscription.interval}
          </p>
        </div>

        {/* Payment Method */}
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="mb-1 text-sm font-medium text-gray-500">Payment Method</p>
          {subscription.paymentMethod ? (
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {getCardBrandIcon(subscription.paymentMethod.brand)}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  •••• {subscription.paymentMethod.last4}
                </p>
                <p className="text-xs text-gray-500">
                  {getBrandName(subscription.paymentMethod.brand)} • Expires{' '}
                  {subscription.paymentMethod.expMonth}/{subscription.paymentMethod.expYear}
                </p>
                {isCardExpired() && <p className="mt-1 text-xs text-red-600">Card expired</p>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">No payment method</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
        <button
          onClick={onManageSubscription}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Manage Subscription
        </button>

        {subscription.paymentMethod ? (
          <button
            onClick={onUpdatePayment}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Update Payment Method
          </button>
        ) : (
          <button
            onClick={onAddPaymentMethod || onUpdatePayment}
            className="rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Payment Method
          </button>
        )}

        {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
          <button
            onClick={onCancelSubscription}
            className="px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-red-600"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
