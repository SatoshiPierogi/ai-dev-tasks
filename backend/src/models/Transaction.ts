/**
 * Transaction Model
 * Represents a transaction from an AI agent
 */

export type TransactionType = 'swap' | 'transfer' | 'stake' | 'lp' | 'vote' | 'bridge' | 'custom';
export type VerificationStatus = 'pending' | 'verified' | 'unverified';

export interface TokenInfo {
  symbol: string;
  address: string; // Contract address
  amount: string; // Amount as string for precision
  decimals: number;
}

export interface Transaction {
  id: number;

  // References
  agent_id: number;
  user_id: number;

  // Transaction identification
  tx_hash: string; // 0x...
  block_number?: number;
  transaction_index?: number;

  // Transaction type and metadata
  type: TransactionType;
  protocol: string; // "uniswap_v3", "aave", "curve", etc.

  // Token information
  tokens_in: TokenInfo[];
  tokens_out: TokenInfo[];

  // Transaction details
  description: string; // Human-readable description
  slippage?: number; // Percentage
  gas_used?: string; // Wei
  gas_price?: string; // Wei per unit
  total_gas_cost?: string; // Wei
  mev_exposure?: number; // Estimated MEV percentage

  // Verification and status
  verification_status: VerificationStatus;
  is_confirmed: boolean;
  confirmation_blocks: number;

  // Timestamps
  block_timestamp: Date;
  created_at: Date;
  updated_at: Date;

  // Raw data
  raw_data?: any; // Protocol-specific data
}

export interface TransactionFilter {
  agent_id?: number;
  user_id?: number;
  type?: TransactionType;
  protocol?: string;
  verification_status?: VerificationStatus;
  start_date?: Date;
  end_date?: Date;
  skip?: number;
  limit?: number;
}

export interface CreateTransactionInput {
  agent_id: number;
  user_id: number;
  tx_hash: string;
  type: TransactionType;
  protocol: string;
  tokens_in: TokenInfo[];
  tokens_out: TokenInfo[];
  description: string;
  block_timestamp: Date;
  block_number?: number;
  gas_used?: string;
  gas_price?: string;
  slippage?: number;
  raw_data?: any;
}

export interface UpdateTransactionInput {
  verification_status?: VerificationStatus;
  is_confirmed?: boolean;
  confirmation_blocks?: number;
  block_number?: number;
  transaction_index?: number;
}

// Validation
export const validateTxHash = (hash: string): boolean => {
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
};

export const validateTransactionType = (type: string): type is TransactionType => {
  const validTypes: TransactionType[] = ['swap', 'transfer', 'stake', 'lp', 'vote', 'bridge', 'custom'];
  return validTypes.includes(type as TransactionType);
};

export const validateTokenInfo = (token: TokenInfo): boolean => {
  return (
    token.symbol.length > 0 &&
    /^0x[0-9a-fA-F]{40}$/.test(token.address) &&
    token.decimals >= 0 &&
    token.decimals <= 255
  );
};

export const calculateGasCostInUSD = (gasCostWei: string, ethPrice: number): number => {
  // Convert Wei to ETH (divide by 10^18)
  const ethAmount = parseInt(gasCostWei) / 1e18;
  return ethAmount * ethPrice;
};

export const calculateSlippagePercentage = (
  expectedOut: string,
  actualOut: string,
  decimals: number
): number => {
  const expected = BigInt(expectedOut);
  const actual = BigInt(actualOut);
  if (expected === 0n) return 0;

  const slippage = Number((expected - actual) * 10000n / expected);
  return slippage / 100; // Convert to percentage
};
