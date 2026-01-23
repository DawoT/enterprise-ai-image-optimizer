'use client';

import React, { useState, useEffect } from 'react';

interface UsageMeterProps {
  metricName: string;
  current: number;
  limit: number;
  unit?: string;
  resetDate?: string;
  showWarning?: boolean;
  showUpgradeCTA?: boolean;
  compact?: boolean;
  animate?: boolean;
  className?: string;
  onUpgradeClick?: () => void;
}

export default function UsageMeter({
  metricName,
  current,
  limit,
  unit = '',
  resetDate,
  showWarning = false,
  showUpgradeCTA = false,
  compact = false,
  animate = true,
  className = '',
  onUpgradeClick,
}: UsageMeterProps) {
  const [animatedWidth, setAnimatedWidth] = useState(0);

  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 95 || current > limit;

  const getProgressBarColor = () => {
    if (current > limit) return 'bg-red-600';
    if (isCritical) return 'bg-red-500';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  useEffect(() => {
    if (animate) {
      const animationTimeout = setTimeout(() => {
        setAnimatedWidth(percentage);
      }, 100);
      return () => clearTimeout(animationTimeout);
    } else {
      setAnimatedWidth(percentage);
    }
  }, [percentage, animate]);

  const formatNumber = (num: number) => {
    if (Number.isInteger(num)) return num.toLocaleString();
    return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      data-testid="usage-meter-container"
      className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{metricName}</h3>
        <span className="text-sm text-gray-600">
          {formatNumber(current)} / {formatNumber(limit)}
          {unit && <span className="text-gray-500"> {unit}</span>}
        </span>
      </div>

      <div className="relative mb-3">
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            role="progressbar"
            aria-valuenow={animatedWidth}
            aria-valuemin={0}
            aria-valuemax={100}
            className={`h-full rounded-full ${getProgressBarColor()} ${
              animate ? 'transition-all duration-500 ease-out' : ''
            }`}
            style={{ width: `${animatedWidth}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{Math.round(percentage)}% used</span>
        {!compact && resetDate && <span>Resets on {formatDate(resetDate)}</span>}
      </div>

      {showWarning && isWarning && !isCritical && (
        <div className="mt-3 flex items-center rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-700">
          <svg
            className="mr-1 h-4 w-4 flex-shrink-0"
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
          <span>You&apos;re approaching your limit. Consider upgrading.</span>
        </div>
      )}

      {showUpgradeCTA && current > limit && (
        <div className="mt-3">
          <button
            onClick={onUpgradeClick}
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            Upgrade Plan
          </button>
        </div>
      )}
    </div>
  );
}
