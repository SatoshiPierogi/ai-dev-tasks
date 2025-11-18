/**
 * Transaction Parser Registry Tests
 * Tests for parser registry and multi-protocol parsing
 */

import { TransactionParserRegistry, getParserRegistry, resetParserRegistry } from './index';
import { NormalizedTransaction } from '../services/normalizer';
import { Protocol, TransactionType } from './types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createTestTx = (protocol: string, overrides?: Partial<NormalizedTransaction>): NormalizedTransaction => ({
  tx_hash: '0xabc123def456',
  protocol,
  action_type: 'swap',
  agent_address: '0x1234567890123456789012345678901234567890',
  timestamp: '2024-01-15T10:30:00Z',
  tokens_in: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      amount: '1000000000000000000',
      decimals: 18,
    },
  ],
  tokens_out: [
    {
      symbol: 'USDC',
      amount: '2500000000',
      decimals: 6,
    },
  ],
  metadata: {},
  normalized_at: Date.now(),
  ...overrides,
});

// ============================================================================
// REGISTRY INITIALIZATION
// ============================================================================

describe('TransactionParserRegistry', () => {
  let registry: TransactionParserRegistry;

  beforeEach(() => {
    registry = new TransactionParserRegistry();
  });

  it('should initialize with default parsers', () => {
    expect(registry).toBeDefined();
  });

  it('should have Uniswap parser registered', () => {
    const parser = registry.getParser(Protocol.UNISWAP);
    expect(parser).toBeDefined();
    expect(parser?.getProtocol()).toBe(Protocol.UNISWAP);
  });

  it('should have Aave parser registered', () => {
    const parser = registry.getParser(Protocol.AAVE);
    expect(parser).toBeDefined();
    expect(parser?.getProtocol()).toBe(Protocol.AAVE);
  });

  it('should have Curve parser registered', () => {
    const parser = registry.getParser(Protocol.CURVE);
    expect(parser).toBeDefined();
    expect(parser?.getProtocol()).toBe(Protocol.CURVE);
  });

  it('should have Balancer parser registered', () => {
    const parser = registry.getParser(Protocol.BALANCER);
    expect(parser).toBeDefined();
    expect(parser?.getProtocol()).toBe(Protocol.BALANCER);
  });

  it('should get all registered protocols', () => {
    const protocols = registry.getProtocols();
    expect(protocols).toHaveLength(4);
    expect(protocols).toContain(Protocol.UNISWAP);
    expect(protocols).toContain(Protocol.AAVE);
    expect(protocols).toContain(Protocol.CURVE);
    expect(protocols).toContain(Protocol.BALANCER);
  });

  it('should check if protocol is supported', () => {
    expect(registry.isSupported(Protocol.UNISWAP)).toBe(true);
    expect(registry.isSupported(Protocol.AAVE)).toBe(true);
    expect(registry.isSupported(Protocol.UNKNOWN)).toBe(false);
  });
});

// ============================================================================
// PARSER DETECTION
// ============================================================================

describe('Parser Detection', () => {
  let registry: TransactionParserRegistry;

  beforeEach(() => {
    registry = new TransactionParserRegistry();
  });

  it('should find Uniswap parser for Uniswap transaction', () => {
    const tx = createTestTx('uniswap_v3');
    const parser = registry.findParser(tx);
    expect(parser).toBeDefined();
    expect(parser?.getProtocol()).toBe(Protocol.UNISWAP);
  });

  it('should find Aave parser for Aave transaction', () => {
    const tx = createTestTx('aave_v3');
    const parser = registry.findParser(tx);
    expect(parser).toBeDefined();
    expect(parser?.getProtocol()).toBe(Protocol.AAVE);
  });

  it('should find Curve parser for Curve transaction', () => {
    const tx = createTestTx('curve');
    const parser = registry.findParser(tx);
    expect(parser).toBeDefined();
    expect(parser?.getProtocol()).toBe(Protocol.CURVE);
  });

  it('should find Balancer parser for Balancer transaction', () => {
    const tx = createTestTx('balancer_v2');
    const parser = registry.findParser(tx);
    expect(parser).toBeDefined();
    expect(parser?.getProtocol()).toBe(Protocol.BALANCER);
  });

  it('should handle case-insensitive protocol names', () => {
    const tx = createTestTx('UNISWAP_V3');
    const parser = registry.findParser(tx);
    expect(parser).toBeDefined();
    expect(parser?.getProtocol()).toBe(Protocol.UNISWAP);
  });

  it('should return undefined for unknown protocol', () => {
    const tx = createTestTx('unknown_protocol');
    const parser = registry.findParser(tx);
    expect(parser).toBeUndefined();
  });
});

// ============================================================================
// PARSING
// ============================================================================

describe('Transaction Parsing', () => {
  let registry: TransactionParserRegistry;

  beforeEach(() => {
    registry = new TransactionParserRegistry();
  });

  it('should parse Uniswap transaction', () => {
    const tx = createTestTx('uniswap_v3', { action_type: 'swap' });
    const parsed = registry.parse(tx);

    expect(parsed).toBeDefined();
    expect(parsed?.protocol).toBe(Protocol.UNISWAP);
    expect(parsed?.type).toBe(TransactionType.SWAP);
  });

  it('should parse Aave transaction', () => {
    const tx = createTestTx('aave_v3', { action_type: 'deposit' });
    const parsed = registry.parse(tx);

    expect(parsed).toBeDefined();
    expect(parsed?.protocol).toBe(Protocol.AAVE);
    expect(parsed?.type).toBe(TransactionType.DEPOSIT);
  });

  it('should parse Curve transaction', () => {
    const tx = createTestTx('curve', { action_type: 'swap' });
    const parsed = registry.parse(tx);

    expect(parsed).toBeDefined();
    expect(parsed?.protocol).toBe(Protocol.CURVE);
    expect(parsed?.type).toBe(TransactionType.SWAP);
  });

  it('should parse Balancer transaction', () => {
    const tx = createTestTx('balancer_v2', { action_type: 'swap' });
    const parsed = registry.parse(tx);

    expect(parsed).toBeDefined();
    expect(parsed?.protocol).toBe(Protocol.BALANCER);
    expect(parsed?.type).toBe(TransactionType.SWAP);
  });

  it('should return null for unknown protocol', () => {
    const tx = createTestTx('unknown_protocol');
    const parsed = registry.parse(tx);

    expect(parsed).toBeNull();
  });
});

// ============================================================================
// BATCH PARSING
// ============================================================================

describe('Batch Parsing', () => {
  let registry: TransactionParserRegistry;

  beforeEach(() => {
    registry = new TransactionParserRegistry();
  });

  it('should parse multiple transactions', () => {
    const transactions = [
      createTestTx('uniswap_v3', { action_type: 'swap' }),
      createTestTx('aave_v3', { action_type: 'deposit' }),
      createTestTx('curve', { action_type: 'swap' }),
    ];

    const results = registry.parseMultiple(transactions);

    expect(results).toHaveLength(3);
    expect(results[0]).toBeDefined();
    expect(results[1]).toBeDefined();
    expect(results[2]).toBeDefined();
    expect(results[0]?.protocol).toBe(Protocol.UNISWAP);
    expect(results[1]?.protocol).toBe(Protocol.AAVE);
    expect(results[2]?.protocol).toBe(Protocol.CURVE);
  });

  it('should handle mixed results in batch', () => {
    const transactions = [
      createTestTx('uniswap_v3', { action_type: 'swap' }),
      createTestTx('unknown_protocol'),
      createTestTx('curve', { action_type: 'swap' }),
    ];

    const results = registry.parseMultiple(transactions);

    expect(results).toHaveLength(3);
    expect(results[0]).toBeDefined();
    expect(results[1]).toBeNull();
    expect(results[2]).toBeDefined();
  });

  it('should handle empty transaction list', () => {
    const results = registry.parseMultiple([]);
    expect(results).toHaveLength(0);
  });
});

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

describe('Singleton Pattern', () => {
  beforeEach(() => {
    resetParserRegistry();
  });

  it('should return same instance on multiple calls', () => {
    const registry1 = getParserRegistry();
    const registry2 = getParserRegistry();

    expect(registry1).toBe(registry2);
  });

  it('should reset singleton instance', () => {
    const registry1 = getParserRegistry();
    resetParserRegistry();
    const registry2 = getParserRegistry();

    expect(registry1).not.toBe(registry2);
  });
});

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

describe('Real-world scenarios', () => {
  let registry: TransactionParserRegistry;

  beforeEach(() => {
    registry = new TransactionParserRegistry();
  });

  it('should parse user portfolio activity', () => {
    const portfolio = [
      createTestTx('uniswap_v3', {
        tx_hash: '0x001',
        action_type: 'swap',
        tokens_in: [{ symbol: 'ETH', amount: '1000000000000000000', decimals: 18 }],
        tokens_out: [{ symbol: 'USDC', amount: '2500000000', decimals: 6 }],
      }),
      createTestTx('aave_v3', {
        tx_hash: '0x002',
        action_type: 'deposit',
        tokens_in: [{ symbol: 'USDC', amount: '2500000000', decimals: 6 }],
        tokens_out: [{ symbol: 'aUSDC', amount: '2500000000', decimals: 6 }],
      }),
      createTestTx('curve', {
        tx_hash: '0x003',
        action_type: 'swap',
        tokens_in: [{ symbol: 'DAI', amount: '1000000000000000000', decimals: 18 }],
        tokens_out: [{ symbol: 'USDC', amount: '1000000', decimals: 6 }],
      }),
    ];

    const parsed = registry.parseMultiple(portfolio);

    expect(parsed).toHaveLength(3);
    expect(parsed.every((p) => p !== null)).toBe(true);
    expect(parsed[0]?.type).toBe(TransactionType.SWAP);
    expect(parsed[1]?.type).toBe(TransactionType.DEPOSIT);
    expect(parsed[2]?.type).toBe(TransactionType.SWAP);
  });

  it('should handle mixed valid and invalid transactions', () => {
    const mixed = [
      createTestTx('uniswap_v3', { action_type: 'swap' }),
      createTestTx('unknown_protocol', { action_type: 'swap' }),
      createTestTx('aave_v3', { action_type: 'deposit' }),
      createTestTx('invalid', { action_type: 'unknown' }),
    ];

    const parsed = registry.parseMultiple(mixed);

    const validCount = parsed.filter((p) => p !== null).length;
    expect(validCount).toBeGreaterThan(0);
  });

  it('should preserve transaction metadata', () => {
    const tx = createTestTx('uniswap_v3', {
      action_type: 'swap',
      metadata: {
        pool_id: '0xpool123',
        slippage: 1.5,
        customField: 'customValue',
      },
    });

    const parsed = registry.parse(tx);

    expect(parsed?.metadata.pool_id).toBe('0xpool123');
    expect(parsed?.metadata.slippage).toBe(1.5);
    expect(parsed?.metadata.customField).toBe('customValue');
  });
});

// ============================================================================
// DESCRIPTION GENERATION
// ============================================================================

describe('Description Generation', () => {
  let registry: TransactionParserRegistry;

  beforeEach(() => {
    registry = new TransactionParserRegistry();
  });

  it('should generate human-readable descriptions', () => {
    const transactions = [
      createTestTx('uniswap_v3', {
        action_type: 'swap',
        tokens_in: [{ symbol: 'ETH', amount: '1000000000000000000', decimals: 18 }],
        tokens_out: [{ symbol: 'USDC', amount: '2500000000', decimals: 6 }],
      }),
      createTestTx('aave_v3', {
        action_type: 'deposit',
        tokens_in: [{ symbol: 'USDC', amount: '2500000000', decimals: 6 }],
      }),
    ];

    const parsed = registry.parseMultiple(transactions);

    expect(parsed[0]?.description).toContain('Swapped');
    expect(parsed[0]?.description).toContain('ETH');
    expect(parsed[0]?.description).toContain('USDC');

    expect(parsed[1]?.description).toContain('Deposited');
    expect(parsed[1]?.description).toContain('USDC');
  });

  it('should generate short descriptions', () => {
    const tx = createTestTx('uniswap_v3', { action_type: 'swap' });
    const parsed = registry.parse(tx);

    expect(parsed?.shortDescription).toBeDefined();
    expect(parsed?.shortDescription?.length).toBeLessThan(parsed?.description?.length);
  });
});
