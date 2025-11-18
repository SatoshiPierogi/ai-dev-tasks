/**
 * Test Data Factories
 * Generate consistent, realistic mock data for testing
 */

import { User, Agent, Transaction, VerificationProof, TokenInfo } from '../../models';

// ============================================================================
// USER FACTORY
// ============================================================================

export interface CreateUserFactoryOptions {
  wallet_address?: string;
  email?: string;
  display_name?: string;
  status?: 'active' | 'suspended' | 'deleted';
}

export function createMockUser(options: CreateUserFactoryOptions = {}): User {
  const defaultWallet = `0x${Math.random().toString(16).slice(2).padStart(40, '0')}`;

  return {
    id: Math.floor(Math.random() * 1000000),
    wallet_address: options.wallet_address || defaultWallet,
    email: options.email || `user${Math.random()}@example.com`,
    display_name: options.display_name || `User ${Math.floor(Math.random() * 10000)}`,
    status: options.status || 'active',
    notification_settings: {
      email: false,
      webhook: true,
    },
    created_at: new Date(Date.now() - Math.random() * 30 * 86400000),
    updated_at: new Date(),
    last_login: new Date(Date.now() - Math.random() * 7 * 86400000),
    login_count: Math.floor(Math.random() * 100),
  };
}

// ============================================================================
// AGENT FACTORY
// ============================================================================

export interface CreateAgentFactoryOptions {
  user_id?: number;
  contract_address?: string;
  agent_name?: string;
  status?: 'active' | 'paused' | 'error' | 'archived';
  verification_rate?: number;
  tags?: string[];
}

export function createMockAgent(options: CreateAgentFactoryOptions = {}): Agent {
  const defaultContractAddress = `0x${Math.random().toString(16).slice(2).padStart(40, '0')}`;

  return {
    id: Math.floor(Math.random() * 1000000),
    user_id: options.user_id || 1,
    contract_address: options.contract_address || defaultContractAddress,
    agent_name: options.agent_name || `Agent_${Math.floor(Math.random() * 10000)}`,
    status: options.status || 'active',
    last_activity: new Date(Date.now() - Math.random() * 7 * 86400000),
    created_at: new Date(Date.now() - Math.random() * 30 * 86400000),
    updated_at: new Date(),
    auto_verified: Math.random() > 0.5,
    verification_source: 'manual',
    transaction_count: Math.floor(Math.random() * 500),
    total_gas_spent: String(Math.floor(Math.random() * 1e18)),
    verification_rate: options.verification_rate ?? Math.random() * 100,
    tags: options.tags || ['dex-trading', 'yield-farming'].slice(0, Math.random() > 0.5 ? 1 : 2),
  };
}

// ============================================================================
// TOKEN FACTORY
// ============================================================================

export interface CreateTokenFactoryOptions {
  symbol?: string;
  address?: string;
  amount?: string;
  decimals?: number;
}

export const COMMON_TOKENS = {
  ETH: {
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
  },
  USDC: {
    symbol: 'USDC',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
  },
  USDT: {
    symbol: 'USDT',
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6,
  },
  DAI: {
    symbol: 'DAI',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    decimals: 18,
  },
  WBTC: {
    symbol: 'WBTC',
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    decimals: 8,
  },
};

export function createMockToken(options: CreateTokenFactoryOptions = {}): TokenInfo {
  const commonTokens = Object.values(COMMON_TOKENS);
  const defaultToken = commonTokens[Math.floor(Math.random() * commonTokens.length)];

  return {
    symbol: options.symbol || defaultToken.symbol,
    address: options.address || defaultToken.address,
    amount: options.amount || String(Math.random() * 100),
    decimals: options.decimals ?? defaultToken.decimals,
  };
}

// ============================================================================
// TRANSACTION FACTORY
// ============================================================================

export interface CreateTransactionFactoryOptions {
  agent_id?: number;
  user_id?: number;
  tx_hash?: string;
  type?: 'swap' | 'transfer' | 'stake' | 'lp' | 'vote' | 'bridge' | 'custom';
  protocol?: string;
  verification_status?: 'pending' | 'verified' | 'unverified';
  tokens_in?: TokenInfo[];
  tokens_out?: TokenInfo[];
}

export function createMockTransaction(options: CreateTransactionFactoryOptions = {}): Transaction {
  const types: Array<'swap' | 'transfer' | 'stake' | 'lp' | 'vote' | 'bridge' | 'custom'> = [
    'swap',
    'transfer',
    'stake',
    'lp',
    'vote',
    'bridge',
  ];
  const protocols = ['uniswap_v3', 'aave', 'curve', 'balancer', 'compound'];
  const type = options.type || types[Math.floor(Math.random() * types.length)];
  const protocol = options.protocol || protocols[Math.floor(Math.random() * protocols.length)];

  const defaultTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
  const tokensIn = options.tokens_in || [createMockToken()];
  const tokensOut = options.tokens_out || [createMockToken()];

  return {
    id: Math.floor(Math.random() * 1000000),
    agent_id: options.agent_id || 1,
    user_id: options.user_id || 1,
    tx_hash: options.tx_hash || defaultTxHash,
    block_number: Math.floor(Math.random() * 20000000),
    transaction_index: Math.floor(Math.random() * 200),
    type,
    protocol,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    description: `Swapped ${tokensIn[0].symbol} for ${tokensOut[0].symbol} on ${protocol}`,
    slippage: Math.random() * 5,
    gas_used: String(Math.floor(Math.random() * 300000)),
    gas_price: String(Math.floor(Math.random() * 100) * 1e9),
    total_gas_cost: String(Math.floor(Math.random() * 1e17)),
    mev_exposure: Math.random() * 2,
    verification_status: options.verification_status || 'verified',
    is_confirmed: Math.random() > 0.2,
    confirmation_blocks: Math.floor(Math.random() * 200),
    block_timestamp: new Date(Date.now() - Math.random() * 7 * 86400000),
    created_at: new Date(),
    updated_at: new Date(),
    raw_data: {
      eventIndex: 0,
      logIndex: 0,
    },
  };
}

// ============================================================================
// VERIFICATION PROOF FACTORY
// ============================================================================

export interface CreateVerificationProofFactoryOptions {
  transaction_id?: number;
  tx_hash?: string;
  verification_status?: 'pending' | 'verified' | 'unverified' | 'error';
  verification_method?: 'on_chain' | 'tee_attestation' | 'zk_proof';
}

export function createMockVerificationProof(
  options: CreateVerificationProofFactoryOptions = {}
): VerificationProof {
  const defaultTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
  const blockHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;

  return {
    id: Math.floor(Math.random() * 1000000),
    transaction_id: options.transaction_id || 1,
    tx_hash: options.tx_hash || defaultTxHash,
    verification_status: options.verification_status || 'verified',
    verification_method: options.verification_method || 'on_chain',
    proof_data: {
      transactionHash: options.tx_hash || defaultTxHash,
      blockHash,
      blockNumber: Math.floor(Math.random() * 20000000),
      status: 1,
      confirmations: Math.floor(Math.random() * 200) + 12,
      gasUsed: String(Math.floor(Math.random() * 300000)),
    },
    event_logs: [
      {
        index: 0,
        address: `0x${Math.random().toString(16).slice(2).padStart(40, '0')}`,
        topics: [
          `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
        ],
        data: '0x',
        blockNumber: Math.floor(Math.random() * 20000000),
        transactionHash: options.tx_hash || defaultTxHash,
        transactionIndex: Math.floor(Math.random() * 200),
        blockHash,
        logIndex: 0,
        removed: false,
      },
    ],
    signatures: [
      {
        eventSignature: 'Swap(address,address,int256,uint256)',
        isValid: true,
        contractAddress: `0x${Math.random().toString(16).slice(2).padStart(40, '0')}`,
      },
    ],
    verification_started_at: new Date(Date.now() - 60000),
    verified_at: new Date(),
    rpc_provider: 'infura',
    block_explorer_url: `https://etherscan.io/tx/${options.tx_hash || defaultTxHash}`,
    created_at: new Date(),
    updated_at: new Date(),
    retry_count: 0,
  };
}

// ============================================================================
// BATCH CREATION HELPERS
// ============================================================================

export function createMockUsers(count: number, options?: CreateUserFactoryOptions): User[] {
  return Array(count)
    .fill(null)
    .map(() => createMockUser(options));
}

export function createMockAgents(count: number, options?: CreateAgentFactoryOptions): Agent[] {
  return Array(count)
    .fill(null)
    .map(() => createMockAgent(options));
}

export function createMockTransactions(
  count: number,
  options?: CreateTransactionFactoryOptions
): Transaction[] {
  return Array(count)
    .fill(null)
    .map(() => createMockTransaction(options));
}
