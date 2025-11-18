import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentCard, type Agent } from './AgentCard';

describe('AgentCard Component', () => {
  const mockAgent: Agent = {
    id: 'agent-1',
    name: 'AI Agent Alpha',
    address: '0x1234567890123456789012345678901234567890',
    status: 'active',
    transactionCount: 100,
    verifiedCount: 95,
    failedCount: 5,
    totalValue: '$50,000',
    lastUpdate: new Date(),
  };

  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  it('should render agent card with basic information', () => {
    render(<AgentCard agent={mockAgent} />);

    expect(screen.getByText('AI Agent Alpha')).toBeInTheDocument();
    expect(screen.getByText(mockAgent.address)).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('should display transaction metrics', () => {
    render(<AgentCard agent={mockAgent} />);

    expect(screen.getByText('100')).toBeInTheDocument(); // transactionCount
    expect(screen.getByText('95')).toBeInTheDocument(); // verifiedCount
    expect(screen.getByText('5')).toBeInTheDocument(); // failedCount
  });

  it('should display verification rate', () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText('95.0%')).toBeInTheDocument();
  });

  it('should handle agents with zero transactions', () => {
    const zeroTxAgent = { ...mockAgent, transactionCount: 0, verifiedCount: 0 };
    render(<AgentCard agent={zeroTxAgent} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  // ============================================================================
  // STATUS TESTS
  // ============================================================================

  it('should display correct status badge for each status', () => {
    const { rerender } = render(<AgentCard agent={{ ...mockAgent, status: 'active' }} />);
    expect(screen.getByText('active')).toBeInTheDocument();

    rerender(<AgentCard agent={{ ...mockAgent, status: 'inactive' }} />);
    expect(screen.getByText('inactive')).toBeInTheDocument();

    rerender(<AgentCard agent={{ ...mockAgent, status: 'error' }} />);
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('should show pulse animation for active agents', () => {
    const { container } = render(<AgentCard agent={{ ...mockAgent, status: 'active' }} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  it('should call onClick handler when card is clicked', () => {
    const onClick = jest.fn();
    render(<AgentCard agent={mockAgent} onClick={onClick} />);

    fireEvent.click(screen.getByText('AI Agent Alpha').closest('div'));
    expect(onClick).toHaveBeenCalledWith('agent-1');
  });

  // ============================================================================
  // COMPUTATION TESTS
  // ============================================================================

  it('should calculate verification rate correctly', () => {
    const agent: Agent = {
      ...mockAgent,
      transactionCount: 200,
      verifiedCount: 150,
    };
    render(<AgentCard agent={agent} />);
    expect(screen.getByText('75.0%')).toBeInTheDocument();
  });

  it('should display last update time', () => {
    const lastUpdate = new Date('2025-11-18T15:30:00Z');
    render(<AgentCard agent={{ ...mockAgent, lastUpdate }} />);
    // The exact time format depends on locale, so we check for parts of it
    expect(screen.getByText(new RegExp('Updated'))).toBeInTheDocument();
  });
});
