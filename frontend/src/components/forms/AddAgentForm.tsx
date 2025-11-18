import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from './Input';
import { Select } from './Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';

export interface AddAgentFormData {
  name: string;
  address: string;
  description: string;
  status: 'active' | 'inactive';
  apiKey?: string;
}

export interface AddAgentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AddAgentFormData) => Promise<void>;
  isLoading?: boolean;
}

const AddAgentForm: React.FC<AddAgentFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<AddAgentFormData>({
    name: '',
    address: '',
    description: '',
    status: 'active',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Agent address is required';
    } else if (!formData.address.match(/^0x[a-fA-F0-9]{40}$/)) {
      newErrors.address = 'Invalid Ethereum address format';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        name: '',
        address: '',
        description: '',
        status: 'active',
      });
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to add agent');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Agent</DialogTitle>
          <DialogDescription>
            Register a new AI agent for monitoring and verification
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="rounded-lg bg-red-50 p-3 border border-red-200">
              <p className="text-sm text-red-900">{submitError}</p>
            </div>
          )}

          <Input
            label="Agent Name"
            name="name"
            placeholder="e.g., AI Arbitrage Bot"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
          />

          <Input
            label="Agent Address"
            name="address"
            placeholder="0x..."
            value={formData.address}
            onChange={handleChange}
            error={errors.address}
            helperText="Ethereum wallet address (0x...)"
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
              <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              placeholder="What does this agent do?"
              value={formData.description}
              onChange={handleChange}
              className="w-full h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          <Select
            label="Initial Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />

          <Input
            label="API Key (Optional)"
            name="apiKey"
            type="password"
            placeholder="sk_..."
            value={formData.apiKey || ''}
            onChange={handleChange}
            helperText="Leave blank to generate automatically"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              Add Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { AddAgentForm };
