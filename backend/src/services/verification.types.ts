/**
 * Verification Types and Constants
 * Defines types for blockchain verification system
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  UNVERIFIED = 'unverified',
  FAILED = 'failed',
  REORG_DETECTED = 'reorg_detected',
}

export enum TransactionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
  REVERTED = 'reverted',
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Transaction receipt information from RPC
 */
export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  gasUsed: bigint;
  status: TransactionStatus;
  from: string;
  to: string | null;
  contractAddress: string | null;
  logs: EventLog[];
  cumulativeGasUsed: bigint;
  logsBloom: string;
  confirmations: number;
}

/**
 * Event log from transaction
 */
export interface EventLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
}

/**
 * Event signature matching
 */
export interface EventSignature {
  name: string;
  signature: string;
  hash: string;
  params: EventParam[];
}

export interface EventParam {
  name: string;
  type: string;
  indexed: boolean;
}

/**
 * Verification proof
 */
export interface VerificationProof {
  tx_hash: string;
  chain: string;
  block_number: number;
  block_hash: string;
  block_timestamp: number;
  transaction_status: TransactionStatus;
  confirmations: number;
  event_logs: EventLog[];
  event_signatures: EventSignature[];
  gas_used: string;
  gas_price: string;
  from_address: string;
  to_address?: string;
  contract_address?: string;
  etherscan_url: string;
  verified_at: number;
}

/**
 * Verification result
 */
export interface VerificationResult {
  tx_hash: string;
  status: VerificationStatus;
  proof?: VerificationProof;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  attempts: number;
  lastAttempt: number;
  nextRetry?: number;
}

/**
 * Verification options
 */
export interface VerificationOptions {
  requiredConfirmations?: number;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_VERIFICATION_OPTIONS: VerificationOptions = {
  requiredConfirmations: 12,
  timeout: 30000,
  retryCount: 3,
  retryDelay: 2000,
};

/**
 * Common event signatures (Solidity keccak256 hashes)
 */
export const COMMON_EVENT_SIGNATURES: Record<string, EventSignature> = {
  // ERC20
  Transfer: {
    name: 'Transfer',
    signature: 'Transfer(address indexed from, address indexed to, uint256 value)',
    hash: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    params: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
  Approval: {
    name: 'Approval',
    signature: 'Approval(address indexed owner, address indexed spender, uint256 value)',
    hash: '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
    params: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'spender', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },

  // Uniswap V3
  Swap: {
    name: 'Swap',
    signature: 'Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
    hash: '0xc42079f94a6350d7e6235f29174924f7e02e2c18698ef45b3e5db9ead406378f',
    params: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount0', type: 'int256', indexed: false },
      { name: 'amount1', type: 'int256', indexed: false },
      { name: 'sqrtPriceX96', type: 'uint160', indexed: false },
      { name: 'liquidity', type: 'uint128', indexed: false },
      { name: 'tick', type: 'int24', indexed: false },
    ],
  },

  // Aave V3
  Deposit: {
    name: 'Deposit',
    signature: 'Deposit(address indexed reserve, address indexed user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)',
    hash: '0x8f08a12cfe27f5e9b3d8c9a8d5e5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d',
    params: [
      { name: 'reserve', type: 'address', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'onBehalfOf', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'referralCode', type: 'uint16', indexed: true },
    ],
  },

  Withdraw: {
    name: 'Withdraw',
    signature: 'Withdraw(address indexed reserve, address indexed user, address indexed to, uint256 amount)',
    hash: '0x3115d1449a7b732c986cba18e74d2f1fb15ccf83b40110fb975e4ff2d37cd5f4',
    params: [
      { name: 'reserve', type: 'address', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },

  Borrow: {
    name: 'Borrow',
    signature: 'Borrow(address indexed reserve, address indexed user, address indexed onBehalfOf, uint256 amount, uint256 borrowRateMode, uint256 borrowRate, uint16 indexed referralCode)',
    hash: '0x13fea576d976ff7b1969c5dfffa2ae218eab83c2d1f964b2cb0d0b821a36b8b3',
    params: [
      { name: 'reserve', type: 'address', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'onBehalfOf', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'borrowRateMode', type: 'uint256', indexed: false },
      { name: 'borrowRate', type: 'uint256', indexed: false },
      { name: 'referralCode', type: 'uint16', indexed: true },
    ],
  },

  Repay: {
    name: 'Repay',
    signature: 'Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens)',
    hash: '0xc6d7eb6eafe8e3ebfd47e44278a7f0aadf92f6b70ccb999e92b89a0b1a20dc02',
    params: [
      { name: 'reserve', type: 'address', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'repayer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'useATokens', type: 'bool', indexed: false },
    ],
  },
};

/**
 * Etherscan URL builders
 */
export function buildEtherscanUrl(txHash: string, chainId: number = 1): string {
  const baseUrls: Record<number, string> = {
    1: 'https://etherscan.io',
    5: 'https://goerli.etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    42: 'https://kovan.etherscan.io',
    4: 'https://rinkeby.etherscan.io',
    137: 'https://polygonscan.com',
    80001: 'https://mumbai.polygonscan.com',
    56: 'https://bscscan.com',
    97: 'https://testnet.bscscan.com',
  };

  const baseUrl = baseUrls[chainId] || baseUrls[1];
  return `${baseUrl}/tx/${txHash}`;
}
