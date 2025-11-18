/**
 * Uniswap Parser Tests
 * Tests for Uniswap swap and liquidity parsing
 */

import { UniswapParser } from './uniswap';
import { NormalizedTransaction } from '../services/normalizer';
import { TransactionType, Protocol } from './types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createTestTx = (overrides?: Partial<NormalizedTransaction>): NormalizedTransaction => ({
  tx_hash: '0xabc123def456',
  protocol: 'uniswap_v3',
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
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      amount: '2500000000',
      decimals: 6,
    },
  ],
  metadata: { pool_id: '0xpool', slippage: 0.5 },
  normalized_at: Date.now(),
  ...overrides,
});

// ============================================================================
// PARSER INITIALIZATION
// ============================================================================

describe('UniswapParser', () => {
  let parser: UniswapParser;

  beforeEach(() => {
    parser = new UniswapParser();
  });

  it('should initialize parser', () => {
    expect(parser).toBeDefined();
    expect(parser.getProtocol()).toBe(Protocol.UNISWAP);
  });

  it('should identify Uniswap transactions', () => {
    const tx = createTestTx();
    expect(parser.canHandle(tx)).toBe(true);
  });

  it('should not handle non-Uniswap transactions', () => {
    const tx = createTestTx({ protocol: 'aave_v3' });
    expect(parser.canHandle(tx)).toBe(false);
  });

  it('should handle case-insensitive protocol names', () => {
    const tx = createTestTx({ protocol: 'UNISWAP_V3' });
    expect(parser.canHandle(tx)).toBe(true);
  });
});

// ============================================================================
// SWAP PARSING TESTS
// ============================================================================

describe('Uniswap Swap Parsing', () => {
  let parser: UniswapParser;

  beforeEach(() => {
    parser = new UniswapParser();
  });

  it('should parse basic swap', () => {
    const tx = createTestTx({ action_type: 'swap' });
    const result = parser.parse(tx);

    expect(result).toBeDefined();
    expect(result?.type).toBe(TransactionType.SWAP);
    expect(result?.protocol).toBe(Protocol.UNISWAP);
    expect(result?.description).toContain('Swapped');
    expect(result?.description).toContain('ETH');
    expect(result?.description).toContain('USDC');
  });

  it('should extract token amounts in swap', () => {
    const tx = createTestTx({ action_type: 'swap' });
    const result = parser.parse(tx);

    expect(result?.tokens_in).toHaveLength(1);
    expect(result?.tokens_in[0].symbol).toBe('ETH');
    expect(result?.tokens_in[0].amountFormatted).toBe('1');

    expect(result?.tokens_out).toHaveLength(1);
    expect(result?.tokens_out[0].symbol).toBe('USDC');
    expect(result?.tokens_out[0].amountFormatted).toBe('2,500');
  });

  it('should include slippage in description', () => {
    const tx = createTestTx({
      action_type: 'swap',
      metadata: { pool_id: '0xpool', slippage: 1.5 },
    });
    const result = parser.parse(tx);

    expect(result?.description).toContain('slippage: 1.50%');
  });

  it('should warn on high price impact', () => {
    const tx = createTestTx({
      action_type: 'swap',
      metadata: { pool_id: '0xpool', slippage: 0.5, priceImpact: 2.5 },
    });
    const result = parser.parse(tx);

    expect(result?.description).toContain('High price impact');
  });

  it('should return null for swap without tokens in', () => {
    const tx = createTestTx({
      action_type: 'swap',
      tokens_in: [],
    });
    const result = parser.parse(tx);

    expect(result).toBeNull();
  });

  it('should return null for swap without tokens out', () => {
    const tx = createTestTx({
      action_type: 'swap',
      tokens_out: [],
    });
    const result = parser.parse(tx);

    expect(result).toBeNull();
  });

  it('should generate short description for swap', () => {
    const tx = createTestTx({ action_type: 'swap' });
    const result = parser.parse(tx);

    expect(result?.shortDescription).toBeDefined();
    expect(result?.shortDescription).toContain('Swapped');
    expect(result?.shortDescription).toContain('for');
  });

  it('should include metadata in details', () => {
    const tx = createTestTx({
      action_type: 'swap',
      metadata: {
        pool_id: '0xpool123',
        slippage: 0.5,
        priceImpact: 1.2,
      },
    });
    const result = parser.parse(tx);

    expect(result?.details?.poolId).toBe('0xpool123');
    expect(result?.details?.slippage).toBe(0.5);
    expect(result?.details?.priceImpact).toBe(1.2);
  });
});

// ============================================================================
// LIQUIDITY PARSING TESTS
// ============================================================================

describe('Uniswap Liquidity Parsing', () => {
  let parser: UniswapParser;

  beforeEach(() => {
    parser = new UniswapParser();
  });

  it('should parse add liquidity', () => {
    const tx = createTestTx({
      action_type: 'add_liquidity',
      tokens_in: [
        {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          amount: '1000000000000000000',
          decimals: 18,
        },
        {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          symbol: 'USDC',
          amount: '2500000000',
          decimals: 6,
        },
      ],
      tokens_out: [
        {
          symbol: 'UNI-V3-LP',
          amount: '1000000000000000000',
          decimals: 18,
        },
      ],
    });

    const result = parser.parse(tx);

    expect(result).toBeDefined();
    expect(result?.type).toBe(TransactionType.ADD_LIQUIDITY);
    expect(result?.description).toContain('Added');
    expect(result?.description).toContain('liquidity');
  });

  it('should parse remove liquidity', () => {
    const tx = createTestTx({
      action_type: 'remove_liquidity',
      tokens_in: [
        {
          symbol: 'UNI-V3-LP',
          amount: '1000000000000000000',
          decimals: 18,
        },
      ],
      tokens_out: [
        {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          amount: '1000000000000000000',
          decimals: 18,
        },
        {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          symbol: 'USDC',
          amount: '2500000000',
          decimals: 6,
        },
      ],
    });

    const result = parser.parse(tx);

    expect(result).toBeDefined();
    expect(result?.type).toBe(TransactionType.REMOVE_LIQUIDITY);
    expect(result?.description).toContain('Removed');
    expect(result?.description).toContain('liquidity');
  });

  it('should include pool info in liquidity operation', () => {
    const tx = createTestTx({
      action_type: 'add_liquidity',
      tokens_in: [
        {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          amount: '1000000000000000000',
          decimals: 18,
        },
      ],
      tokens_out: [],
      metadata: {
        pool_id: '0xpool123',
        fee: 500,
        tickLower: -100,
        tickUpper: 100,
      },
    });

    const result = parser.parse(tx);

    expect(result?.details?.poolAddress).toBe('0xpool123');
    expect(result?.details?.fee).toBe(500);
    expect(result?.details?.tickLower).toBe(-100);
    expect(result?.details?.tickUpper).toBe(100);
  });
});

// ============================================================================
// CUSTOM TRANSACTION TYPES
// ============================================================================

describe('Uniswap Custom Transaction Types', () => {
  let parser: UniswapParser;

  beforeEach(() => {
    parser = new UniswapParser();
  });

  it('should handle unknown action types as custom', () => {
    const tx = createTestTx({
      action_type: 'unknown_action',
      tokens_in: [],
      tokens_out: [],
    });

    const result = parser.parse(tx);

    expect(result).toBeDefined();
    expect(result?.type).toBe(TransactionType.CUSTOM);
    expect(result?.shortDescription).toContain('unknown_action');
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

describe('Uniswap Parser Error Handling', () => {
  let parser: UniswapParser;

  beforeEach(() => {
    parser = new UniswapParser();
  });

  it('should handle parsing errors gracefully', () => {
    const tx = createTestTx({
      tokens_in: null as any,
      tokens_out: null as any,
    });

    const result = parser.parse(tx);
    expect(result).toBeNull();
  });

  it('should handle missing metadata gracefully', () => {
    const tx = createTestTx({
      action_type: 'swap',
      metadata: {},
    });

    const result = parser.parse(tx);
    expect(result).toBeDefined();
    expect(result?.type).toBe(TransactionType.SWAP);
  });
});

// ============================================================================
// REAL-WORLD EXAMPLES
// ============================================================================

describe('Real-world transaction examples', () => {
  let parser: UniswapParser;

  beforeEach(() => {
    parser = new UniswapParser();
  });

  it('should parse ETH to USDC swap', () => {
    const tx = createTestTx({
      action_type: 'swap',
      tokens_in: [
        {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          amount: '1500000000000000000', // 1.5 ETH
          decimals: 18,
        },
      ],
      tokens_out: [
        {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          symbol: 'USDC',
          amount: '3750000000', // 3750 USDC
          decimals: 6,
        },
      ],
    });

    const result = parser.parse(tx);

    expect(result?.description).toContain('1.5');
    expect(result?.description).toContain('ETH');
    expect(result?.description).toContain('3,750');
    expect(result?.description).toContain('USDC');
  });

  it('should parse large swap with abbreviation', () => {
    const tx = createTestTx({
      action_type: 'swap',
      tokens_in: [
        {
          symbol: 'USDC',
          amount: '10000000000', // 10,000 USDC
          decimals: 6,
        },
      ],
      tokens_out: [
        {
          symbol: 'ETH',
          amount: '5000000000000000000', // 5 ETH
          decimals: 18,
        },
      ],
    });

    const result = parser.parse(tx);

    expect(result?.shortDescription).toContain('10K');
    expect(result?.shortDescription).toContain('5');
  });
});
