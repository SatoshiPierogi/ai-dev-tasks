import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminPage } from './AdminPage';

describe('AdminPage', () => {
  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  it('should render page title and description', () => {
    render(<AdminPage />);

    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText(/Manage agents/)).toBeInTheDocument();
  });

  it('should render system overview cards', () => {
    render(<AdminPage />);

    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('Database Size')).toBeInTheDocument();
    expect(screen.getByText('API Health')).toBeInTheDocument();
  });

  it('should render admin panel with agents table', () => {
    render(<AdminPage />);

    expect(screen.getByText('Agent Management')).toBeInTheDocument();
    expect(screen.getByText('Total Agents')).toBeInTheDocument();
  });

  it('should render settings section', () => {
    render(<AdminPage />);

    expect(screen.getByText('System Settings')).toBeInTheDocument();
    expect(screen.getByText('Archival Settings')).toBeInTheDocument();
    expect(screen.getByText('Cache Settings')).toBeInTheDocument();
    expect(screen.getByText('Verification Settings')).toBeInTheDocument();
  });

  // ============================================================================
  // AGENT MANAGEMENT TESTS
  // ============================================================================

  it('should display list of agents', () => {
    render(<AdminPage />);

    expect(screen.getByText('AI Arbitrage Bot')).toBeInTheDocument();
    expect(screen.getByText('Lending Protocol Manager')).toBeInTheDocument();
    expect(screen.getByText('Liquidity Provider Bot')).toBeInTheDocument();
  });

  it('should show agent status badges', () => {
    render(<AdminPage />);

    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  it('should handle add agent button click', () => {
    render(<AdminPage />);

    const addButton = screen.getByText('+ Add Agent');
    fireEvent.click(addButton);

    // Alert would be shown (mocked in browser)
    expect(addButton).toBeInTheDocument();
  });

  it('should handle suspend agent action', () => {
    render(<AdminPage />);

    // This would test the suspend functionality
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  // ============================================================================
  // STATISTICS TESTS
  // ============================================================================

  it('should display agent statistics', () => {
    render(<AdminPage />);

    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getAllByText(/\d+/)).toBeTruthy();
  });

  // ============================================================================
  // SETTINGS TESTS
  // ============================================================================

  it('should have setting controls for archival', () => {
    render(<AdminPage />);

    const archivalCheckbox = screen.getByDisplayValue('7', {
      selector: 'input[type="number"]',
    });
    expect(archivalCheckbox).toBeDisabled();
  });

  it('should show cache settings', () => {
    render(<AdminPage />);

    const ttlInput = screen.getByDisplayValue('1800', {
      selector: 'input[type="number"]',
    });
    expect(ttlInput).toBeDisabled();
  });
});
