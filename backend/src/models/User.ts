/**
 * User Model
 * Represents a wallet address and associated user metadata
 */

export interface User {
  id: number;
  wallet_address: string; // Ethereum address: 0x...
  created_at: Date;
  updated_at: Date;

  // User metadata
  email?: string;
  display_name?: string;

  // Account status
  status: 'active' | 'suspended' | 'deleted';

  // Preferences
  notification_settings: NotificationSettings;

  // Audit trail
  last_login?: Date;
  login_count: number;
}

export interface NotificationSettings {
  email: boolean;
  webhook: boolean;
  telegram?: boolean;
  discord?: boolean;
}

// Input/Creation types
export interface CreateUserInput {
  wallet_address: string;
  email?: string;
  display_name?: string;
}

export interface UpdateUserInput {
  email?: string;
  display_name?: string;
  status?: 'active' | 'suspended' | 'deleted';
  notification_settings?: NotificationSettings;
}

// Validation
export const validateWalletAddress = (address: string): boolean => {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
