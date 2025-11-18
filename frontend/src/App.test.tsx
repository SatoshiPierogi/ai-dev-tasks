import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';

// Mock the WebSocket hook
jest.mock('./hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    isConnecting: false,
    send: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }),
}));

// Mock page components
jest.mock('./pages', () => ({
  DashboardPage: () => <div data-testid="dashboard-page">Dashboard Page</div>,
  AgentsPage: () => <div data-testid="agents-page">Agents Page</div>,
  AdminPage: () => <div data-testid="admin-page">Admin Page</div>,
  SettingsPage: () => <div data-testid="settings-page">Settings Page</div>,
  NotFoundPage: () => <div data-testid="notfound-page">Not Found Page</div>,
}));

describe('App Component', () => {
  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByText('Agent Audit Dashboard')).toBeInTheDocument();
  });

  it('should render the layout with header and sidebar', () => {
    render(<App />);

    // Header should contain the title
    expect(screen.getByText('Agent Audit Dashboard')).toBeInTheDocument();

    // Sidebar should have navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  // ============================================================================
  // NAVIGATION TESTS
  // ============================================================================

  it('should render dashboard page by default', () => {
    render(<App />);

    // Default route should be dashboard
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });

  it('should have navigation items with proper labels', () => {
    render(<App />);

    const navItems = screen.getAllByText(/Dashboard|Agents|Administration|Settings|Transactions/);
    expect(navItems.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // ROUTING TESTS
  // ============================================================================

  it('should render router structure', () => {
    render(<App />);

    // Router should be initialized
    expect(screen.getByText('Agent Audit Dashboard')).toBeInTheDocument();
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  it('should have proper page structure', () => {
    const { container } = render(<App />);

    // Should have main content area
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
  });

  it('should be keyboard navigable', () => {
    render(<App />);

    // Navigation items should be focusable
    const navButtons = screen.getAllByRole('button');
    expect(navButtons.length).toBeGreaterThan(0);
  });
});
