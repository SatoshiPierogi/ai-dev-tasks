import { renderHook, act } from '@testing-library/react';
import { useForm } from './useForm';

describe('useForm Hook', () => {
  const mockOnSubmit = jest.fn();

  const defaultProps = {
    initialValues: {
      name: '',
      email: '',
    },
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useForm(defaultProps));

    expect(result.current.values).toEqual({
      name: '',
      email: '',
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  // ============================================================================
  // CHANGE HANDLER TESTS
  // ============================================================================

  it('should handle input changes', () => {
    const { result } = renderHook(() => useForm(defaultProps));

    const event = {
      target: {
        name: 'name',
        value: 'John',
        type: 'text',
      },
    } as any;

    act(() => {
      result.current.handleChange(event);
    });

    expect(result.current.values.name).toBe('John');
    expect(result.current.isDirty).toBe(true);
  });

  it('should handle checkbox changes', () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { agreed: false },
        onSubmit: mockOnSubmit,
      })
    );

    const event = {
      target: {
        name: 'agreed',
        type: 'checkbox',
        checked: true,
      },
    } as any;

    act(() => {
      result.current.handleChange(event);
    });

    expect(result.current.values.agreed).toBe(true);
  });

  // ============================================================================
  // BLUR HANDLER TESTS
  // ============================================================================

  it('should mark field as touched on blur', () => {
    const { result } = renderHook(() => useForm(defaultProps));

    const event = {
      target: {
        name: 'name',
      },
    } as any;

    act(() => {
      result.current.handleBlur(event);
    });

    expect(result.current.touched.name).toBe(true);
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  it('should validate form on submit', async () => {
    const validator = jest.fn(() => ({
      name: 'Name is required',
    }));

    const { result } = renderHook(() =>
      useForm({
        ...defaultProps,
        validate: validator,
      })
    );

    const event = { preventDefault: jest.fn() } as any;

    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(validator).toHaveBeenCalled();
    expect(result.current.errors.name).toBe('Name is required');
  });

  it('should not submit if validation fails', async () => {
    const { result } = renderHook(() =>
      useForm({
        ...defaultProps,
        validate: () => ({ name: 'Required' }),
      })
    );

    const event = { preventDefault: jest.fn() } as any;

    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should submit if validation passes', async () => {
    const { result } = renderHook(() =>
      useForm({
        ...defaultProps,
        validate: () => ({}),
      })
    );

    act(() => {
      result.current.setFieldValue('name', 'John');
      result.current.setFieldValue('email', 'john@example.com');
    });

    const event = { preventDefault: jest.fn() } as any;

    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'John',
      email: 'john@example.com',
    });
  });

  // ============================================================================
  // FIELD MANIPULATION TESTS
  // ============================================================================

  it('should set field value', () => {
    const { result } = renderHook(() => useForm(defaultProps));

    act(() => {
      result.current.setFieldValue('name', 'Jane');
    });

    expect(result.current.values.name).toBe('Jane');
  });

  it('should set field error', () => {
    const { result } = renderHook(() => useForm(defaultProps));

    act(() => {
      result.current.setFieldError('name', 'Invalid name');
    });

    expect(result.current.errors.name).toBe('Invalid name');
  });

  // ============================================================================
  // RESET TESTS
  // ============================================================================

  it('should reset form to initial values', () => {
    const { result } = renderHook(() => useForm(defaultProps));

    act(() => {
      result.current.setFieldValue('name', 'John');
      result.current.setFieldError('name', 'Error');
      result.current.handleBlur({ target: { name: 'name' } } as any);
    });

    expect(result.current.values.name).toBe('John');
    expect(result.current.errors.name).toBe('Error');

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.values).toEqual(defaultProps.initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isDirty).toBe(false);
  });

  // ============================================================================
  // DIRTY STATE TESTS
  // ============================================================================

  it('should track dirty state', () => {
    const { result } = renderHook(() => useForm(defaultProps));

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.setFieldValue('name', 'John');
    });

    expect(result.current.isDirty).toBe(true);
  });
});
