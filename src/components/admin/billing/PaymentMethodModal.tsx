'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiClient } from '@/lib/api';
import { toast } from 'react-toastify';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY || 'pk_test_placeholder');

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  className?: string;
  loading?: boolean;
}

const getCardBrandIcon = (brand: string) => {
  const brandLower = brand.toLowerCase();

  if (brandLower === 'visa') {
    return (
      <svg className="h-6 w-10" viewBox="0 0 48 32" fill="none">
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
      <svg className="h-6 w-10" viewBox="0 0 48 32" fill="none">
        <rect width="48" height="32" rx="4" fill="#000000" />
        <circle cx="19" cy="16" r="10" fill="#EB001B" />
        <circle cx="29" cy="16" r="10" fill="#F79E1B" />
        <path d="M24 8.5a10 10 0 000 15 10 10 0 000-15z" fill="#FF5F00" />
      </svg>
    );
  }

  return (
    <svg className="h-6 w-10" viewBox="0 0 48 32" fill="none">
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

const CardForm = ({
  onSubmit,
  onCancel,
  isProcessing,
}: {
  onSubmit: (paymentMethod: any) => Promise<void>;
  onCancel: () => void;
  isProcessing: boolean;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        setError(stripeError.message || 'An error occurred');
        setIsProcessing(false);
        return;
      }

      await onSubmit(paymentMethod);
    } catch (err) {
      setError('An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-4">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#1f2937',
                '::placeholder': {
                  color: '#9ca3af',
                },
              },
              invalid: {
                color: '#ef4444',
              },
            },
          }}
          onChange={(event) => {
            setCardComplete(event.complete);
            if (event.error) {
              setError(event.error.message);
            } else {
              setError(null);
            }
          }}
        />
      </div>

      {error && (
        <div className="flex items-center text-sm text-red-600">
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing || !cardComplete}
          className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <svg
                className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </>
          ) : (
            'Save Card'
          )}
        </button>
      </div>
    </form>
  );
};

export default function PaymentMethodModal({
  isOpen,
  onClose,
  onSuccess,
  className = '',
  loading = false,
}: PaymentMethodModalProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(loading);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<PaymentMethod[]>('/admin/billing/payment-methods');
      setPaymentMethods(response.data);
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods();
    }
  }, [isOpen]);

  const handleSetDefault = async (paymentMethod: PaymentMethod) => {
    try {
      await apiClient.post(`/admin/billing/payment-methods/${paymentMethod.id}/set-default`, {});
      toast.success('Default payment method updated!');
      fetchPaymentMethods();
    } catch (error) {
      console.error('Failed to set default:', error);
      toast.error('Failed to update default payment method');
    }
  };

  const handleDelete = async (paymentMethod: PaymentMethod) => {
    if (paymentMethods.length <= 1) {
      toast.error('Cannot remove the only payment method');
      return;
    }

    if (!window.confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      await apiClient.post(`/admin/billing/payment-methods/${paymentMethod.id}/delete`, {});
      toast.success('Payment method removed!');
      fetchPaymentMethods();
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Failed to remove payment method');
    }
  };

  const handleAddCard = async (paymentMethod: any) => {
    try {
      setIsProcessing(true);
      await apiClient.post('/admin/billing/payment-methods', {
        paymentMethodId: paymentMethod.id,
      });
      toast.success('Payment method added successfully!');
      setShowAddForm(false);
      fetchPaymentMethods();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to add card:', error);
      toast.error('Failed to add payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:p-0">
        <div
          data-testid="modal-overlay"
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        <div
          className={`relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl ${className}`}
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
            <button
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
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

          {/* Loading State */}
          {isLoading ? (
            <div data-testid="payment-methods-skeleton" className="animate-pulse space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded bg-gray-200"></div>
              ))}
            </div>
          ) : showAddForm ? (
            <Elements stripe={stripePromise}>
              <CardForm
                onSubmit={handleAddCard}
                onCancel={() => setShowAddForm(false)}
                isProcessing={isProcessing}
              />
            </Elements>
          ) : (
            <>
              {/* Payment Methods List */}
              {paymentMethods.length === 0 ? (
                <div className="py-8 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No payment methods saved
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add a payment method to start your subscription
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                    >
                      <div className="flex items-center">
                        {pm.card && getCardBrandIcon(pm.card.brand)}
                        <div className="ml-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              •••• {pm.card?.last4}
                            </span>
                            {pm.isDefault && (
                              <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {getBrandName(pm.card?.brand || '')} • Expires {pm.card?.expMonth}/
                            {pm.card?.expYear}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!pm.isDefault && (
                          <button
                            onClick={() => handleSetDefault(pm)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            Set as default
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(pm)}
                          className="p-1 text-gray-400 transition-colors hover:text-red-600"
                          title="Remove payment method"
                        >
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Card Button */}
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 flex w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-blue-500 hover:text-blue-600"
                >
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add New Card
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
