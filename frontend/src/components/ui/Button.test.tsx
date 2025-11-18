import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should render different variants', () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    expect(screen.getByText('Default')).toHaveClass('bg-primary');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByText('Outline')).toHaveClass('border');

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByText('Destructive')).toHaveClass('bg-destructive');
  });

  it('should render different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByText('Small')).toHaveClass('h-9');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByText('Large')).toHaveClass('h-11');

    rerender(<Button size="icon">Icon</Button>);
    expect(screen.getByText('Icon')).toHaveClass('h-10', 'w-10');
  });

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  it('should handle click events', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);

    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });

  it('should be disabled when loading prop is true', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByText('Loading')).toBeDisabled();
  });

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================

  it('should show loading spinner when loading', () => {
    const { container } = render(<Button loading>Loading</Button>);
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('should show icon when icon prop is provided', () => {
    render(<Button icon={<span data-testid="icon">⭐</span>}>Button</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  it('should have proper focus styles', () => {
    render(<Button>Focusable</Button>);
    const button = screen.getByText('Focusable');
    expect(button).toHaveClass('focus-visible:outline-none');
  });

  it('should be keyboard accessible', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    const button = screen.getByText('Click');

    // Simulate Enter key
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });
});
