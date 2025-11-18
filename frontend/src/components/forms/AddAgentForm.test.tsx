import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddAgentForm } from './AddAgentForm';

describe('AddAgentForm', () => {
  const mockOnSubmit = jest.fn();
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  it('should render form when open is true', () => {
    render(<AddAgentForm {...defaultProps} />);

    expect(screen.getByText('Add New Agent')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g., AI Arbitrage Bot/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0x...')).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(<AddAgentForm {...defaultProps} open={false} />);

    expect(screen.queryByText('Add New Agent')).not.toBeInTheDocument();
  });

  it('should render all form fields', () => {
    render(<AddAgentForm {...defaultProps} />);

    expect(screen.getByLabelText('Agent Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Agent Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Initial Status')).toBeInTheDocument();
    expect(screen.getByLabelText('API Key (Optional)')).toBeInTheDocument();
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  it('should show validation errors for empty required fields', async () => {
    render(<AddAgentForm {...defaultProps} />);

    const submitButton = screen.getByText('Add Agent');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Agent name is required')).toBeInTheDocument();
      expect(screen.getByText('Agent address is required')).toBeInTheDocument();
    });
  });

  it('should validate Ethereum address format', async () => {
    render(<AddAgentForm {...defaultProps} />);

    const addressInput = screen.getByPlaceholderText('0x...');
    fireEvent.change(addressInput, { target: { value: 'invalid-address' } });

    const submitButton = screen.getByText('Add Agent');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid Ethereum address format')).toBeInTheDocument();
    });
  });

  it('should accept valid Ethereum address', async () => {
    render(<AddAgentForm {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText(/e.g., AI Arbitrage Bot/);
    const addressInput = screen.getByPlaceholderText('0x...');
    const descInput = screen.getByPlaceholderText('What does this agent do?');

    fireEvent.change(nameInput, { target: { value: 'Test Agent' } });
    fireEvent.change(addressInput, { target: { value: '0x1234567890123456789012345678901234567890' } });
    fireEvent.change(descInput, { target: { value: 'Test description' } });

    const submitButton = screen.getByText('Add Agent');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  it('should handle input changes', () => {
    render(<AddAgentForm {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText(/e.g., AI Arbitrage Bot/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'My Agent' } });

    expect(nameInput.value).toBe('My Agent');
  });

  it('should handle form submission', async () => {
    render(<AddAgentForm {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText(/e.g., AI Arbitrage Bot/);
    const addressInput = screen.getByPlaceholderText('0x...');
    const descInput = screen.getByPlaceholderText('What does this agent do?');

    fireEvent.change(nameInput, { target: { value: 'Test Agent' } });
    fireEvent.change(addressInput, { target: { value: '0x1234567890123456789012345678901234567890' } });
    fireEvent.change(descInput, { target: { value: 'Test' } });

    const submitButton = screen.getByText('Add Agent');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Agent',
        address: '0x1234567890123456789012345678901234567890',
        description: 'Test',
        status: 'active',
      });
    });
  });

  it('should close dialog on cancel', () => {
    const onOpenChange = jest.fn();
    render(<AddAgentForm {...defaultProps} onOpenChange={onOpenChange} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================

  it('should show loading state when submitting', () => {
    render(<AddAgentForm {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByText('Add Agent');
    expect(submitButton).toHaveAttribute('disabled');
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  it('should display submission error', async () => {
    const errorMessage = 'Failed to add agent';
    mockOnSubmit.mockRejectedValueOnce(new Error(errorMessage));

    render(<AddAgentForm {...defaultProps} onSubmit={mockOnSubmit} />);

    const nameInput = screen.getByPlaceholderText(/e.g., AI Arbitrage Bot/);
    const addressInput = screen.getByPlaceholderText('0x...');
    const descInput = screen.getByPlaceholderText('What does this agent do?');

    fireEvent.change(nameInput, { target: { value: 'Test Agent' } });
    fireEvent.change(addressInput, { target: { value: '0x1234567890123456789012345678901234567890' } });
    fireEvent.change(descInput, { target: { value: 'Test' } });

    const submitButton = screen.getByText('Add Agent');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
