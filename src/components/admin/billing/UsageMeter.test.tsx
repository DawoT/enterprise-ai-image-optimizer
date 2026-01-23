/**
 * UsageMeter Component Tests
 * Tests for quota progress visualization component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsageMeter from './UsageMeter';

describe('UsageMeter', () => {
  const defaultProps = {
    metricName: 'GPU Hours',
    current: 50,
    limit: 100,
    unit: 'hours',
    resetDate: '2024-02-01',
  };

  it('renders with correct initial state', () => {
    render(<UsageMeter {...defaultProps} />);

    expect(screen.getByText('GPU Hours')).toBeInTheDocument();
    expect(screen.getByText('50 / 100')).toBeInTheDocument();
    expect(screen.getByText('hours')).toBeInTheDocument();
    expect(screen.getByText('Resets on Feb 1, 2024')).toBeInTheDocument();
  });

  it('calculates progress percentage correctly', async () => {
    render(<UsageMeter {...defaultProps} current={75} limit={100} />);

    const progressBar = screen.getByRole('progressbar');
    await waitFor(() => {
      expect(progressBar).toHaveStyle({ width: '75%' });
    });
  });

  it('caps progress bar at 100% when usage exceeds limit', async () => {
    render(<UsageMeter {...defaultProps} current={150} limit={100} />);

    const progressBar = screen.getByRole('progressbar');
    await waitFor(() => {
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });

  it('shows green color when usage is below 80%', () => {
    render(<UsageMeter {...defaultProps} current={50} limit={100} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-green-500');
  });

  it('shows yellow color when usage is between 80% and 95%', () => {
    render(<UsageMeter {...defaultProps} current={85} limit={100} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-yellow-500');
  });

  it('shows red color when usage is at or above 95%', () => {
    render(<UsageMeter {...defaultProps} current={95} limit={100} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-red-500');
  });

  it('shows red color when usage exceeds limit', () => {
    render(<UsageMeter {...defaultProps} current={120} limit={100} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-red-600');
  });

  it('displays correct percentage text', () => {
    render(<UsageMeter {...defaultProps} current={33} limit={100} />);

    expect(screen.getByText('33% used')).toBeInTheDocument();
  });

  it('handles zero limit gracefully', () => {
    render(<UsageMeter {...defaultProps} current={0} limit={0} />);

    expect(screen.getByText('0 / 0')).toBeInTheDocument();
    expect(screen.getByText('hours')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveStyle({ width: '0%' });
  });

  it('handles zero current usage', () => {
    render(<UsageMeter {...defaultProps} current={0} limit={100} />);

    expect(screen.getByRole('progressbar')).toHaveStyle({ width: '0%' });
    expect(screen.getByText('0% used')).toBeInTheDocument();
  });

  it('displays custom metric name', () => {
    render(<UsageMeter {...defaultProps} metricName="API Calls" />);

    expect(screen.getByText('API Calls')).toBeInTheDocument();
  });

  it('displays custom unit', () => {
    render(<UsageMeter {...defaultProps} unit="credits" />);

    expect(screen.getByText('50 / 100')).toBeInTheDocument();
    expect(screen.getByText('credits')).toBeInTheDocument();
  });

  it('formats reset date correctly', () => {
    render(<UsageMeter {...defaultProps} resetDate="2024-12-25" />);

    expect(screen.getByText(/Resets on/)).toBeInTheDocument();
  });

  it('shows warning message when usage exceeds 80%', () => {
    render(<UsageMeter {...defaultProps} current={85} limit={100} showWarning />);

    expect(screen.getByText(/You're approaching your limit/)).toBeInTheDocument();
  });

  it('does not show warning when usage is below 80%', () => {
    render(<UsageMeter {...defaultProps} current={50} limit={100} showWarning />);

    expect(screen.queryByText(/You're approaching your limit/)).not.toBeInTheDocument();
  });

  it('applies custom CSS class when provided', () => {
    render(<UsageMeter {...defaultProps} className="custom-meter" />);

    const container = screen.getByTestId('usage-meter-container');
    expect(container).toHaveClass('custom-meter');
  });

  it('renders with animation when animate prop is true', () => {
    render(<UsageMeter {...defaultProps} animate />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('transition-all duration-500');
  });

  it('renders without animation when animate prop is false', () => {
    render(<UsageMeter {...defaultProps} animate={false} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).not.toHaveClass('transition-all duration-500');
  });

  it('handles decimal values correctly', async () => {
    render(<UsageMeter {...defaultProps} current={33.5} limit={100} />);

    expect(screen.getByText('33.5 / 100')).toBeInTheDocument();
    expect(screen.getByText('hours')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    await waitFor(() => {
      expect(progressBar).toHaveStyle({ width: '33.5%' });
    });
  });

  it('displays compact format when compact prop is true', () => {
    render(<UsageMeter {...defaultProps} compact />);

    expect(screen.getByText('50 / 100')).toBeInTheDocument();
    expect(screen.getByText('hours')).toBeInTheDocument();
    expect(screen.queryByText('Resets on')).not.toBeInTheDocument();
  });

  it('shows upgrade CTA when usage exceeds limit', () => {
    render(<UsageMeter {...defaultProps} current={110} limit={100} showUpgradeCTA />);

    expect(screen.getByRole('button', { name: /Upgrade Plan/ })).toBeInTheDocument();
  });

  it('does not show upgrade CTA when within limits', () => {
    render(<UsageMeter {...defaultProps} current={50} limit={100} showUpgradeCTA />);

    expect(screen.queryByRole('button', { name: /Upgrade Plan/ })).not.toBeInTheDocument();
  });
});
