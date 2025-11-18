/**
 * Agent Model
 * Represents an AI agent being monitored
 */

export interface Agent {
  id: number;
  user_id: number;

  // Agent identification
  contract_address: string; // 0x...
  agent_name: string;

  // Status tracking
  status: 'active' | 'paused' | 'error' | 'archived';
  last_activity?: Date;

  // Metadata
  created_at: Date;
  updated_at: Date;

  // Verification
  auto_verified: boolean;
  verification_source?: 'registry' | 'manual' | 'webhook';

  // Statistics (denormalized)
  transaction_count: number;
  total_gas_spent: string; // Wei as string (for precision)
  verification_rate: number; // 0-100

  // Tags for categorization
  tags: string[]; // e.g., ["dex-trading", "yield-farming"]
}

export interface AgentMetrics {
  agent_id: number;
  total_transactions: number;
  verified_transactions: number;
  verification_rate: number; // 0-100
  total_gas_spent: string; // Wei
  protocols_used: number;
  last_activity?: Date;
  first_activity?: Date;
}

// Input/Creation types
export interface CreateAgentInput {
  contract_address: string;
  agent_name: string;
  verification_source?: 'registry' | 'manual' | 'webhook';
  auto_verified?: boolean;
  tags?: string[];
}

export interface UpdateAgentInput {
  agent_name?: string;
  status?: 'active' | 'paused' | 'error' | 'archived';
  tags?: string[];
}

// Validation
export const validateContractAddress = (address: string): boolean => {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
};

export const validateAgentName = (name: string): boolean => {
  return name.length > 0 && name.length <= 255;
};

export const validateTags = (tags: string[]): boolean => {
  return Array.isArray(tags) && tags.every(tag => typeof tag === 'string' && tag.length > 0);
};
