import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertCenter, type AlertItem } from './AlertCenter';

describe('AlertCenter Component', () => {
  const mockAlerts: AlertItem[] = [
    {
      id: 'alert-1',
      type: 'error',
      title: 'Verification Failed',
      message: 'Failed to verify transaction',
      timestamp: new Date(),
      read: false,
      dismissible: true,
    },
    {
      id: 'alert-2',
      type: 'warning',
      title: 'Low Confirmations',
      message: 'Transaction has fewer than 12 confirmations',
      timestamp: new Date(),
      read: true,
      dismissible: true,
    },
    {
      id: 'alert-3',
      type: 'success',
      title: 'Verification Successful',
      message: 'Transaction verified successfully',
      timestamp: new Date(),
      read: false,
      dismissible: false,
    },
  ];

  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  it('should render all visible alerts', () => {
    render(<AlertCenter alerts={mockAlerts} maxVisible={3} />);
    expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    expect(screen.getByText('Low Confirmations')).toBeInTheDocument();
    expect(screen.getByText('Verification Successful')).toBeInTheDocument();
  });

  it('should respect maxVisible prop', () => {
    render(<AlertCenter alerts={mockAlerts} maxVisible={2} />);
    expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    expect(screen.getByText('Low Confirmations')).toBeInTheDocument();
    expect(screen.queryByText('Verification Successful')).not.toBeInTheDocument();
  });

  it('should show "View All Alerts" button when alerts exceed maxVisible', () => {
    render(<AlertCenter alerts={mockAlerts} maxVisible={2} />);
    expect(screen.getByText(/View All.*Alerts/)).toBeInTheDocument();
  });

  it('should display unread count badge', () => {
    render(<AlertCenter alerts={mockAlerts} />);
    expect(screen.getByText('2 new alerts')).toBeInTheDocument();
  });

  it('should show empty state when no alerts', () => {
    render(<AlertCenter alerts={[]} />);
    expect(screen.getByText('No alerts at this time')).toBeInTheDocument();
  });

  // ============================================================================
  // ALERT TYPE TESTS
  // ============================================================================

  it('should display correct alert variant for each type', () => {
    render(<AlertCenter alerts={mockAlerts} />);

    const errorAlert = screen.getByText('Verification Failed').closest('[role="alert"]');
    expect(errorAlert).toHaveClass('bg-red-50');

    const warningAlert = screen.getByText('Low Confirmations').closest('[role="alert"]');
    expect(warningAlert).toHaveClass('bg-yellow-50');

    const successAlert = screen.getByText('Verification Successful').closest('[role="alert"]');
    expect(successAlert).toHaveClass('bg-green-50');
  });

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  it('should call onDismiss when dismiss button clicked', () => {
    const onDismiss = jest.fn();
    render(<AlertCenter alerts={mockAlerts} onDismiss={onDismiss} />);

    const dismissButtons = screen.getAllByText('×');
    fireEvent.click(dismissButtons[0]);

    expect(onDismiss).toHaveBeenCalledWith('alert-1');
  });

  it('should call onRead when unread alert is clicked', () => {
    const onRead = jest.fn();
    render(<AlertCenter alerts={mockAlerts} onRead={onRead} />);

    fireEvent.click(screen.getByText('Verification Failed'));
    expect(onRead).toHaveBeenCalledWith('alert-1');
  });

  it('should not show dismiss button for non-dismissible alerts', () => {
    render(<AlertCenter alerts={mockAlerts} />);

    const successAlertElement = screen.getByText('Verification Successful').closest('[role="alert"]');
    expect(successAlertElement?.querySelector('button')).not.toBeInTheDocument();
  });

  // ============================================================================
  // ACTION TESTS
  // ============================================================================

  it('should display and execute action button', () => {
    const actionHandler = jest.fn();
    const alertsWithAction: AlertItem[] = [
      {
        ...mockAlerts[0],
        action: {
          label: 'Retry',
          onClick: actionHandler,
        },
      },
    ];

    render(<AlertCenter alerts={alertsWithAction} />);

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(actionHandler).toHaveBeenCalled();
  });

  // ============================================================================
  // BADGE TESTS
  // ============================================================================

  it('should show unread indicator for unread alerts', () => {
    const { container } = render(<AlertCenter alerts={mockAlerts} />);
    const indicators = container.querySelectorAll('.h-2.w-2');
    expect(indicators.length).toBeGreaterThan(0);
  });
});
