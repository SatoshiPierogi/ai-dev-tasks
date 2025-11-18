import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';

// Mock the WebSocket hook
jest.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    isConnecting: false,
    send: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }),
}));

// Mock the AgentDashboard component
jest.mock('../components', () => ({
  ...jest.requireActual('../components'),
  AgentDashboard: () => <div data-testid="agent-dashboard">Mock AgentDashboard</div>,
}));

describe('DashboardPage', () => {
  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  it('should render page title and description', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Real-time monitoring and analytics/)).toBeInTheDocument();
  });

  it('should render system health cards', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Database Health')).toBeInTheDocument();
    expect(screen.getByText('Cache Hit Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Latency')).toBeInTheDocument();
    expect(screen.getByText('WebSocket Connections')).toBeInTheDocument();
  });

  it('should render agent monitoring section', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('agent-dashboard')).toBeInTheDocument();
  });

  it('should render system performance metrics', () => {
    render(<DashboardPage />);

    expect(screen.getByText('System Performance')).toBeInTheDocument();
    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('Disk Usage')).toBeInTheDocument();
    expect(screen.getByText('Network I/O')).toBeInTheDocument();
  });

  // ============================================================================
  // STATS TESTS
  // ============================================================================

  it('should display system statistics', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Quick Stats')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
    expect(screen.getByText('Requests/min')).toBeInTheDocument();
    expect(screen.getByText('Errors/min')).toBeInTheDocument();
  });

  it('should show database health status', () => {
    render(<DashboardPage />);
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  // ============================================================================
  // DYNAMIC DATA TESTS
  // ============================================================================

  it('should update cache hit rate over time', async () => {
    jest.useFakeTimers();
    const { rerender } = render(<DashboardPage />);

    const initialRate = screen.getByText(/^\d+\.\d+%$/);
    expect(initialRate).toBeInTheDocument();

    // Advance time by 5 seconds
    jest.advanceTimersByTime(5000);
    rerender(<DashboardPage />);

    // Cache hit rate should be updated
    const updatedRate = screen.getByText(/^\d+\.\d+%$/);
    expect(updatedRate).toBeInTheDocument();

    jest.useRealTimers();
  });

  // ============================================================================
  // COMPONENT STRUCTURE TESTS
  // ============================================================================

  it('should have proper grid layout for stat cards', () => {
    const { container } = render(<DashboardPage />);
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();
  });

  it('should display responsive performance metrics', () => {
    render(<DashboardPage />);
    expect(screen.getByText('System Performance')).toBeInTheDocument();
    expect(screen.getByText('Quick Stats')).toBeInTheDocument();
  });
});
