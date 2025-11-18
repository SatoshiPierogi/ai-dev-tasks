/**
 * Integration Test Fixtures
 * Reusable test data and utilities for integration tests
 */

export interface TestUser {
  id?: string;
  email: string;
  password: string;
  name: string;
  token?: string;
}

export interface TestAgent {
  id?: string;
  name: string;
  address: string;
  description: string;
  status?: 'active' | 'inactive';
  owner?: string;
}

export interface TestTransaction {
  id?: string;
  agentId: string;
  hash: string;
  type: 'swap' | 'deposit' | 'withdraw' | 'borrow' | 'repay';
  protocol: string;
  status?: 'pending' | 'verified' | 'failed';
  tokenIn?: {
    symbol: string;
    amount: string;
  };
  tokenOut?: {
    symbol: string;
    amount: string;
  };
}

// ============================================================================
// TEST USERS
// ============================================================================

export const testUsers = {
  standard: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
  } as TestUser,

  admin: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    name: 'Admin User',
  } as TestUser,

  multiple: () => [
    {
      email: 'user1@example.com',
      password: 'Password1!',
      name: 'User One',
    },
    {
      email: 'user2@example.com',
      password: 'Password2!',
      name: 'User Two',
    },
    {
      email: 'user3@example.com',
      password: 'Password3!',
      name: 'User Three',
    },
  ] as TestUser[],
};

// ============================================================================
// TEST AGENTS
// ============================================================================

export const testAgents = {
  arbitrage: {
    name: 'AI Arbitrage Bot',
    address: '0x1234567890123456789012345678901234567890',
    description: 'Arbitrage trading bot for DEX pair monitoring',
    status: 'active',
  } as TestAgent,

  lendingProtocol: {
    name: 'Lending Protocol Manager',
    address: '0x0987654321098765432109876543210987654321',
    description: 'Automated lending position manager',
    status: 'active',
  } as TestAgent,

  liquidity: {
    name: 'Liquidity Provider Bot',
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    description: 'LP position optimizer',
    status: 'inactive',
  } as TestAgent,

  multiple: () => [
    {
      name: 'Agent Alpha',
      address: '0x' + 'a'.repeat(40),
      description: 'Testing agent alpha',
    },
    {
      name: 'Agent Beta',
      address: '0x' + 'b'.repeat(40),
      description: 'Testing agent beta',
    },
    {
      name: 'Agent Gamma',
      address: '0x' + 'c'.repeat(40),
      description: 'Testing agent gamma',
    },
  ] as TestAgent[],
};

// ============================================================================
// TEST TRANSACTIONS
// ============================================================================

export const testTransactions = {
  uniswap: (agentId: string) => ({
    agentId,
    hash: '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1',
    type: 'swap' as const,
    protocol: 'uniswap',
    tokenIn: { symbol: 'ETH', amount: '1.0' },
    tokenOut: { symbol: 'USDC', amount: '2500' },
  } as TestTransaction),

  aave: (agentId: string) => ({
    agentId,
    hash: '0xdef456abc123def456abc123def456abc123def456abc123def456abc123def4',
    type: 'deposit' as const,
    protocol: 'aave',
    tokenIn: { symbol: 'USDC', amount: '5000' },
    tokenOut: { symbol: 'aUSDC', amount: '5000' },
  } as TestTransaction),

  curve: (agentId: string) => ({
    agentId,
    hash: '0x789xyz789xyz789xyz789xyz789xyz789xyz789xyz789xyz789xyz789xyz789x',
    type: 'swap' as const,
    protocol: 'curve',
    tokenIn: { symbol: 'DAI', amount: '1000' },
    tokenOut: { symbol: 'USDC', amount: '1000' },
  } as TestTransaction),

  multiple: (agentId: string) => [
    {
      agentId,
      hash: '0x' + '1'.repeat(64),
      type: 'swap' as const,
      protocol: 'uniswap',
      tokenIn: { symbol: 'ETH', amount: '1' },
      tokenOut: { symbol: 'USDC', amount: '2500' },
    },
    {
      agentId,
      hash: '0x' + '2'.repeat(64),
      type: 'deposit' as const,
      protocol: 'aave',
      tokenIn: { symbol: 'USDC', amount: '2500' },
      tokenOut: { symbol: 'aUSDC', amount: '2500' },
    },
    {
      agentId,
      hash: '0x' + '3'.repeat(64),
      type: 'withdraw' as const,
      protocol: 'aave',
      tokenIn: { symbol: 'aUSDC', amount: '1000' },
      tokenOut: { symbol: 'USDC', amount: '1000' },
    },
  ] as TestTransaction[],
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

export class TestDataFactory {
  /**
   * Create multiple test agents
   */
  static createAgents(count: number, ownerEmail: string): TestAgent[] {
    return Array.from({ length: count }, (_, i) => ({
      name: `Test Agent ${i + 1}`,
      address: `0x${String(i + 1).padStart(40, '0')}`,
      description: `Test agent number ${i + 1}`,
      status: i % 2 === 0 ? 'active' : 'inactive',
      owner: ownerEmail,
    }));
  }

  /**
   * Create multiple test transactions
   */
  static createTransactions(count: number, agentId: string): TestTransaction[] {
    const protocols = ['uniswap', 'aave', 'curve', 'balancer'];
    const types = ['swap', 'deposit', 'withdraw', 'borrow', 'repay'];

    return Array.from({ length: count }, (_, i) => ({
      agentId,
      hash: `0x${String(i).padStart(64, 'f')}`,
      type: types[i % types.length] as any,
      protocol: protocols[i % protocols.length],
      tokenIn: { symbol: 'ETH', amount: '1' },
      tokenOut: { symbol: 'USDC', amount: '2500' },
      status: 'pending' as const,
    }));
  }

  /**
   * Generate random Ethereum address
   */
  static generateAddress(): string {
    return '0x' + Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  /**
   * Generate random transaction hash
   */
  static generateHash(): string {
    return '0x' + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
}

// ============================================================================
// TEST ASSERTIONS
// ============================================================================

export class TestAssertions {
  /**
   * Verify valid Ethereum address
   */
  static isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Verify valid transaction hash
   */
  static isValidHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  /**
   * Verify valid token amount format
   */
  static isValidAmount(amount: string): boolean {
    return /^\d+\.?\d*$/.test(amount) && parseFloat(amount) > 0;
  }

  /**
   * Verify user object structure
   */
  static isValidUser(user: any): boolean {
    return (
      user &&
      typeof user.id === 'string' &&
      typeof user.email === 'string' &&
      typeof user.name === 'string' &&
      user.email.includes('@')
    );
  }

  /**
   * Verify agent object structure
   */
  static isValidAgent(agent: any): boolean {
    return (
      agent &&
      typeof agent.id === 'string' &&
      typeof agent.name === 'string' &&
      this.isValidAddress(agent.address) &&
      typeof agent.description === 'string' &&
      ['active', 'inactive', 'suspended'].includes(agent.status)
    );
  }

  /**
   * Verify transaction object structure
   */
  static isValidTransaction(transaction: any): boolean {
    return (
      transaction &&
      typeof transaction.id === 'string' &&
      typeof transaction.hash === 'string' &&
      typeof transaction.agentId === 'string' &&
      typeof transaction.protocol === 'string' &&
      ['swap', 'deposit', 'withdraw', 'borrow', 'repay'].includes(transaction.type) &&
      ['pending', 'verified', 'failed'].includes(transaction.status)
    );
  }
}

// ============================================================================
// MOCK DATA RESPONSES
// ============================================================================

export const mockResponses = {
  authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',

  userResponse: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date().toISOString(),
  },

  agentResponse: (agent: TestAgent) => ({
    id: 'agent-1',
    ...agent,
    createdAt: new Date().toISOString(),
    transactionCount: 0,
    verifiedCount: 0,
  }),

  transactionResponse: (tx: TestTransaction) => ({
    id: 'tx-1',
    ...tx,
    status: 'pending',
    confirmations: 0,
    createdAt: new Date().toISOString(),
  }),

  listResponse: <T,>(items: T[], total: number = items.length) => ({
    items,
    total,
    page: 1,
    limit: 10,
  }),
};
