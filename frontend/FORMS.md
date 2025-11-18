# Frontend Forms Documentation

Agent Audit Dashboard - Form components, validation, and data management.

## Table of Contents

1. [Overview](#overview)
2. [Form Components](#form-components)
3. [useForm Hook](#useform-hook)
4. [Validation](#validation)
5. [Dialog/Modal System](#dialogmodal-system)
6. [Example Usage](#example-usage)

---

## Overview

The forms system provides:

- **Reusable form components** (Input, Select, AddAgentForm)
- **Form state management** hook (useForm)
- **Built-in validation** with error handling
- **Dialog/Modal wrapper** for form dialogs
- **Type-safe** TypeScript interfaces
- **Accessible** WCAG-compliant inputs
- **Comprehensive testing** with 80+ test cases

---

## Form Components

### Input

Text, email, password, or number input with validation and error display.

**Features:**
- Label with required indicator (*)
- Error message display
- Helper text support
- Optional icon prefix
- Placeholder support
- All standard HTML input attributes

**Example:**
```tsx
import { Input } from '@/components';

<Input
  label="Agent Name"
  name="name"
  placeholder="e.g., AI Arbitrage Bot"
  value={formData.name}
  onChange={handleChange}
  error={errors.name}
  helperText="Choose a descriptive name"
  required
/>
```

**Props:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}
```

---

### Select

Dropdown/select input with options and validation.

**Features:**
- Label with required indicator
- Option groups support
- Placeholder option
- Error display
- Helper text
- Disabled state support

**Example:**
```tsx
import { Select } from '@/components';

<Select
  label="Status"
  name="status"
  value={formData.status}
  onChange={handleChange}
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]}
  error={errors.status}
  required
/>
```

**Props:**
```typescript
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
```

---

### AddAgentForm

Complete form for adding new agents with validation and submission.

**Features:**
- Predefined fields (name, address, description, status, API key)
- Built-in Ethereum address validation
- Dialog/modal presentation
- Submit and cancel actions
- Loading state indication
- Error handling and display

**Example:**
```tsx
import { AddAgentForm } from '@/components';

const [dialogOpen, setDialogOpen] = useState(false);

const handleAddAgent = async (data) => {
  await api.post('/agents', data);
};

<AddAgentForm
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  onSubmit={handleAddAgent}
  isLoading={isLoading}
/>
```

**Props:**
```typescript
interface AddAgentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AddAgentFormData) => Promise<void>;
  isLoading?: boolean;
}

interface AddAgentFormData {
  name: string;
  address: string;
  description: string;
  status: 'active' | 'inactive';
  apiKey?: string;
}
```

**Validation:**
- Agent name: Required, non-empty
- Address: Required, valid Ethereum format (0x + 40 hex chars)
- Description: Required, non-empty
- Status: Required, active or inactive
- API Key: Optional

---

## useForm Hook

Custom React hook for managing form state, validation, and submission.

### Usage Example

```tsx
import { useForm } from '@/hooks';

const MyForm = () => {
  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      agreeToTerms: false,
    },
    validate: (values) => {
      const errors = {};
      if (!values.name) errors.name = 'Name required';
      if (!values.email) errors.email = 'Email required';
      return errors;
    },
    onSubmit: async (values) => {
      await api.post('/submit', values);
    },
  });

  return (
    <form onSubmit={form.handleSubmit}>
      <Input
        name="name"
        value={form.values.name}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
        error={form.touched.name ? form.errors.name : undefined}
      />

      <Input
        name="email"
        type="email"
        value={form.values.email}
        onChange={form.handleChange}
        error={form.touched.email ? form.errors.email : undefined}
      />

      <button type="submit" disabled={form.isSubmitting}>
        {form.isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
};
```

### Hook API

**Props:**
```typescript
interface UseFormProps<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void> | void;
  validate?: (values: T) => FormErrors;
}
```

**Return Values:**
```typescript
interface UseFormReturn<T> {
  // State
  values: T;                    // Current form values
  errors: FormErrors;            // Field errors
  touched: Record<string, boolean>; // Touched fields
  isSubmitting: boolean;         // Submission in progress
  isDirty: boolean;             // Form has unsaved changes

  // Handlers
  handleChange: (e) => void;    // Input change handler
  handleBlur: (e) => void;      // Field blur handler
  handleSubmit: (e) => Promise<void>; // Form submission

  // Utilities
  setFieldValue: (name, value) => void;   // Set single field value
  setFieldError: (name, error) => void;   // Set field error
  resetForm: () => void;         // Reset to initial values
}
```

### Features

1. **Automatic State Management**
   - Tracks field values
   - Manages touched state
   - Handles dirty flag

2. **Validation**
   - Custom validation function
   - Runs on submit
   - Prevents submission on errors

3. **Form Submission**
   - Validates before submit
   - Handles async onSubmit
   - Manages loading state

4. **Field Manipulation**
   - Set individual field values
   - Set field errors programmatically
   - Reset form to initial state

---

## Validation

### Built-in Validation

The `AddAgentForm` includes built-in validation:

```typescript
const validateForm = () => {
  const newErrors = {};

  // Agent name validation
  if (!formData.name.trim()) {
    newErrors.name = 'Agent name is required';
  }

  // Address validation
  if (!formData.address.trim()) {
    newErrors.address = 'Agent address is required';
  } else if (!formData.address.match(/^0x[a-fA-F0-9]{40}$/)) {
    newErrors.address = 'Invalid Ethereum address format';
  }

  // Description validation
  if (!formData.description.trim()) {
    newErrors.description = 'Description is required';
  }

  return newErrors;
};
```

### Custom Validation

Create custom validators with `useForm`:

```tsx
const customValidator = (values) => {
  const errors = {};

  if (values.email && !values.email.includes('@')) {
    errors.email = 'Invalid email format';
  }

  if (values.password && values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  return errors;
};

const form = useForm({
  initialValues: { email: '', password: '' },
  validate: customValidator,
  onSubmit: async (values) => { /* ... */ },
});
```

### Error Display

Show errors conditionally only after field is touched:

```tsx
<Input
  name="email"
  value={form.values.email}
  onChange={form.handleChange}
  onBlur={form.handleBlur}
  error={form.touched.email ? form.errors.email : undefined}
/>
```

---

## Dialog/Modal System

### Components

**Dialog:** Wrapper component for modal presentations

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>

    {/* Content */}

    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button>Submit</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Automatic Scroll Lock

Dialog automatically disables body scroll when open:

```typescript
useEffect(() => {
  if (open) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'auto';
  }
}, [open]);
```

### Click Outside to Close

Click the backdrop to close the dialog:

```tsx
<div
  className="absolute inset-0 bg-black/50"
  onClick={() => onOpenChange(false)}
/>
```

---

## Example Usage

### Complete Form Page

```tsx
import { useState } from 'react';
import { AddAgentForm, Button, Card, CardHeader, CardTitle, CardContent } from '@/components';

const AdminAgents = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddAgent = async (data) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to add agent');

      // Success - dialog closes automatically
      alert('Agent added successfully');
    } catch (error) {
      throw error; // Form displays error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setFormOpen(true)}>+ Add Agent</Button>

        <AddAgentForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleAddAgent}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
};

export { AdminAgents };
```

### Custom Form with useForm Hook

```tsx
import { useForm } from '@/hooks';
import { Input, Button } from '@/components';

const LoginForm = () => {
  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    validate: (values) => {
      const errors = {};
      if (!values.email) errors.email = 'Email required';
      if (!values.password) errors.password = 'Password required';
      return errors;
    },
    onSubmit: async (values) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    },
  });

  return (
    <form onSubmit={form.handleSubmit}>
      <Input
        label="Email"
        name="email"
        type="email"
        value={form.values.email}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
        error={form.touched.email ? form.errors.email : undefined}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        value={form.values.password}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
        error={form.touched.password ? form.errors.password : undefined}
      />

      <label>
        <input
          type="checkbox"
          name="rememberMe"
          checked={form.values.rememberMe}
          onChange={form.handleChange}
        />
        Remember me
      </label>

      <Button type="submit" disabled={form.isSubmitting} loading={form.isSubmitting}>
        Login
      </Button>
    </form>
  );
};

export { LoginForm };
```

---

## Best Practices

### 1. Form Validation

Always validate on change and show errors only after blur:

```tsx
<Input
  name="field"
  value={form.values.field}
  onChange={form.handleChange}
  onBlur={form.handleBlur}
  error={form.touched.field ? form.errors.field : undefined}
/>
```

### 2. Async Operations

Wrap async operations in try-catch:

```tsx
const onSubmit = async (values) => {
  try {
    const response = await api.post('/endpoint', values);
    // Handle success
  } catch (error) {
    throw new Error('Operation failed');
  }
};
```

### 3. Type Safety

Always define form data types:

```typescript
interface FormData {
  name: string;
  email: string;
  agreeToTerms: boolean;
}

const form = useForm<FormData>({
  initialValues: { ... },
  ...
});
```

### 4. Reset After Submit

Reset form after successful submission:

```tsx
const onSubmit = async (values) => {
  await api.post('/submit', values);
  form.resetForm(); // Clear the form
};
```

---

## Testing

All form components have comprehensive test coverage:

```bash
npm test frontend/src/components/forms
npm test frontend/src/hooks/useForm.test.ts
```

### Test Coverage

- ✓ Component rendering
- ✓ Input changes and updates
- ✓ Validation logic
- ✓ Error display
- ✓ Form submission
- ✓ Async handling
- ✓ Reset functionality
- ✓ Accessibility

---

## Troubleshooting

### Form not validating
- Ensure `validate` function is passed to `useForm`
- Check that validation function returns error object
- Verify `handleSubmit` is called on form submit

### Errors not displaying
- Check if field is marked as `touched`
- Use ternary: `{form.touched.field ? form.errors.field : undefined}`
- Ensure error text is returned from validate function

### Form not submitting
- Check for validation errors (inspect console)
- Ensure `onSubmit` function is provided
- Verify async operations complete successfully

---

## Summary

The forms system provides:

✓ Reusable components (Input, Select, AddAgentForm)
✓ Form state management (useForm hook)
✓ Built-in validation
✓ Dialog/modal presentation
✓ Error handling and display
✓ Type safety with TypeScript
✓ Accessible WCAG compliance
✓ Comprehensive testing

These components make it easy to build complex forms while maintaining code quality and user experience.
