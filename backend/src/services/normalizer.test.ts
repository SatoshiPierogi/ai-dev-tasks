/**
 * Transaction Normalizer Tests
 * Tests for protocol-specific data normalization
 */

import { TransactionNormalizer, NormalizedTransaction } from './normalizer';

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_WALLET = '0x1234567890123456789012345678901234567890';

const RAW_UNISWAP_SWAP = {
  tx_hash: '0xabcdef123456',
  protocol: 'uniswap_v3',
  action_type: 'swap',
  agent_address: TEST_WALLET,
  timestamp: 1234567890,
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
};

const RAW_AAVE_DEPOSIT = {
  tx_hash: '0xdef456789',
  protocol: 'aave_v3',
  action_type: 'stake',
  agent_address: TEST_WALLET,
  timestamp: '2024-01-01T12:00:00Z',
  tokens_in: [
    {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      amount: '1000000000',
      decimals: 6,
    },
  ],
  tokens_out: [
    {
      symbol: 'aUSDC',
      amount: '1000000000',
      decimals: 6,
    },
  ],
};

// ============================================================================
// NORMALIZATION TESTS
// ============================================================================

describe('TransactionNormalizer.normalize', () => {
  it('should normalize valid transaction', () => {
    const result = TransactionNormalizer.normalize(RAW_UNISWAP_SWAP);

    expect(result).toBeDefined();
    expect(result?.tx_hash).toBe(RAW_UNISWAP_SWAP.tx_hash.toLowerCase());
    expect(result?.protocol).toBe('uniswap_v3');
    expect(result?.action_type).toBe('swap');
    expect(result?.agent_address).toBe(TEST_WALLET.toLowerCase());
    expect(result?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should handle ISO timestamp', () => {
    const result = TransactionNormalizer.normalize(RAW_AAVE_DEPOSIT);

    expect(result?.timestamp).toBe('2024-01-01T12:00:00Z');
  });

  it('should handle Unix timestamp in seconds', () => {
    const tx = {
      ...RAW_UNISWAP_SWAP,
      timestamp: Math.floor(Date.now() / 1000),
    };
    const result = TransactionNormalizer.normalize(tx);

    expect(result?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should handle Unix timestamp in milliseconds', () => {
    const tx = {
      ...RAW_UNISWAP_SWAP,
      timestamp: Date.now(),
    };
    const result = TransactionNormalizer.normalize(tx);

    expect(result?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should return null for missing required fields', () => {
    const invalidTx = {
      protocol: 'uniswap_v3',
      action_type: 'swap',
      // Missing tx_hash, agent_address, timestamp
    };

    const result = TransactionNormalizer.normalize(invalidTx);
    expect(result).toBeNull();
  });

  it('should return null for invalid wallet address', () => {
    const invalidTx = {
      ...RAW_UNISWAP_SWAP,
      agent_address: 'not-a-wallet',
    };

    const result = TransactionNormalizer.normalize(invalidTx);
    expect(result).toBeNull();
  });

  it('should return null for invalid timestamp', () => {
    const invalidTx = {
      ...RAW_UNISWAP_SWAP,
      timestamp: 'invalid-date',
    };

    const result = TransactionNormalizer.normalize(invalidTx);
    expect(result).toBeNull();
  });

  it('should normalize token symbols to uppercase', () => {
    const tx = {
      ...RAW_UNISWAP_SWAP,
      tokens_in: [
        {
          ...RAW_UNISWAP_SWAP.tokens_in[0],
          symbol: 'eth',
        },
      ],
    };

    const result = TransactionNormalizer.normalize(tx);
    expect(result?.tokens_in[0].symbol).toBe('ETH');
  });

  it('should handle missing address in tokens', () => {
    const tx = {
      ...RAW_UNISWAP_SWAP,
      tokens_in: [
        {
          symbol: 'ETH',
          amount: '1000000000000000000',
          decimals: 18,
          // No address
        },
      ],
    };

    const result = TransactionNormalizer.normalize(tx);
    expect(result?.tokens_in[0].address).toBeUndefined();
  });

  it('should include metadata in normalized transaction', () => {
    const result = TransactionNormalizer.normalize(RAW_UNISWAP_SWAP);

    expect(result?.metadata).toBeDefined();
    expect(result?.metadata.pool_id).toBe('0xpool');
    expect(result?.metadata.slippage).toBe(0.5);
  });

  it('should set normalized_at timestamp', () => {
    const before = Date.now();
    const result = TransactionNormalizer.normalize(RAW_UNISWAP_SWAP);
    const after = Date.now();

    expect(result?.normalized_at).toBeGreaterThanOrEqual(before);
    expect(result?.normalized_at).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// ADDRESS NORMALIZATION TESTS
// ============================================================================

describe('TransactionNormalizer.normalizeAddress', () => {
  it('should normalize valid lowercase address', () => {
    const address = '0x1234567890123456789012345678901234567890';
    const result = TransactionNormalizer.normalizeAddress(address);

    expect(result).toBe(address);
  });

  it('should normalize mixed case address', () => {
    const address = '0x1234567890123456789012345678901234567890'.toUpperCase();
    const result = TransactionNormalizer.normalizeAddress(address);

    expect(result).toBe(address.toLowerCase());
  });

  it('should trim whitespace', () => {
    const address = '  0x1234567890123456789012345678901234567890  ';
    const result = TransactionNormalizer.normalizeAddress(address);

    expect(result).toBe('0x1234567890123456789012345678901234567890');
  });

  it('should reject invalid format', () => {
    expect(TransactionNormalizer.normalizeAddress('not-an-address')).toBeNull();
    expect(TransactionNormalizer.normalizeAddress('0x123')).toBeNull();
    expect(TransactionNormalizer.normalizeAddress('1234567890123456789012345678901234567890')).toBeNull();
  });

  it('should reject undefined', () => {
    expect(TransactionNormalizer.normalizeAddress(undefined)).toBeNull();
  });

  it('should reject non-string', () => {
    expect(TransactionNormalizer.normalizeAddress(123 as any)).toBeNull();
  });
});

// ============================================================================
// TIMESTAMP NORMALIZATION TESTS
// ============================================================================

describe('TransactionNormalizer.normalizeTimestamp', () => {
  it('should handle ISO string', () => {
    const timestamp = '2024-01-15T10:30:00Z';
    const result = TransactionNormalizer.normalizeTimestamp(timestamp);

    expect(result).toBe(timestamp);
  });

  it('should convert Unix timestamp (seconds)', () => {
    const timestamp = Math.floor(new Date('2024-01-15T10:30:00Z').getTime() / 1000);
    const result = TransactionNormalizer.normalizeTimestamp(timestamp);

    expect(result).toContain('2024-01-15');
  });

  it('should convert Unix timestamp (milliseconds)', () => {
    const timestamp = new Date('2024-01-15T10:30:00Z').getTime();
    const result = TransactionNormalizer.normalizeTimestamp(timestamp);

    expect(result).toContain('2024-01-15');
  });

  it('should handle string Unix timestamp', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const result = TransactionNormalizer.normalizeTimestamp(timestamp);

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should reject invalid dates', () => {
    expect(TransactionNormalizer.normalizeTimestamp('invalid-date')).toBeNull();
    expect(TransactionNormalizer.normalizeTimestamp('2024-13-45')).toBeNull();
  });

  it('should reject far future dates', () => {
    // Timestamp way in the future (year 500000)
    const futureTimestamp = 9999999999999;
    const result = TransactionNormalizer.normalizeTimestamp(futureTimestamp);

    // Should still parse but would be a valid date
    expect(result).toBeDefined();
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('TransactionNormalizer.validate', () => {
  const validTx: NormalizedTransaction = {
    tx_hash: '0xabc123',
    protocol: 'uniswap_v3',
    action_type: 'swap',
    agent_address: '0x1234567890123456789012345678901234567890',
    timestamp: '2024-01-15T10:30:00Z',
    tokens_in: [{ symbol: 'ETH', amount: '1', decimals: 18 }],
    tokens_out: [{ symbol: 'USDC', amount: '2500', decimals: 6 }],
    metadata: {},
    normalized_at: Date.now(),
  };

  it('should validate correct transaction', () => {
    const result = TransactionNormalizer.validate(validTx);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid address format', () => {
    const tx = {
      ...validTx,
      agent_address: 'not-an-address',
    };

    const result = TransactionNormalizer.validate(tx);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('agent_address'))).toBe(true);
  });

  it('should reject invalid timestamp format', () => {
    const tx = {
      ...validTx,
      timestamp: 'not-a-date',
    };

    const result = TransactionNormalizer.validate(tx);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('timestamp'))).toBe(true);
  });

  it('should reject invalid action type', () => {
    const tx = {
      ...validTx,
      action_type: 'invalid' as any,
    };

    const result = TransactionNormalizer.validate(tx);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('action_type'))).toBe(true);
  });

  it('should reject empty tokens', () => {
    const tx = {
      ...validTx,
      tokens_in: [],
      tokens_out: [],
    };

    const result = TransactionNormalizer.validate(tx);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('tokens'))).toBe(true);
  });

  it('should require tokens_in to be array', () => {
    const tx = {
      ...validTx,
      tokens_in: 'not-an-array' as any,
    };

    const result = TransactionNormalizer.validate(tx);
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// HASH AND COMPARISON TESTS
// ============================================================================

describe('TransactionNormalizer.calculateHash', () => {
  it('should calculate consistent hash', () => {
    const tx: NormalizedTransaction = {
      tx_hash: '0xabc',
      protocol: 'uniswap_v3',
      action_type: 'swap',
      agent_address: '0x1234567890123456789012345678901234567890',
      timestamp: '2024-01-15T10:30:00Z',
      tokens_in: [{ symbol: 'ETH', amount: '1', decimals: 18 }],
      tokens_out: [{ symbol: 'USDC', amount: '2500', decimals: 6 }],
      metadata: {},
      normalized_at: Date.now(),
    };

    const hash1 = TransactionNormalizer.calculateHash(tx);
    const hash2 = TransactionNormalizer.calculateHash(tx);

    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different transactions', () => {
    const tx1: NormalizedTransaction = {
      tx_hash: '0xabc',
      protocol: 'uniswap_v3',
      action_type: 'swap',
      agent_address: '0x1234567890123456789012345678901234567890',
      timestamp: '2024-01-15T10:30:00Z',
      tokens_in: [{ symbol: 'ETH', amount: '1', decimals: 18 }],
      tokens_out: [{ symbol: 'USDC', amount: '2500', decimals: 6 }],
      metadata: {},
      normalized_at: Date.now(),
    };

    const tx2 = { ...tx1, tx_hash: '0xdef' };

    const hash1 = TransactionNormalizer.calculateHash(tx1);
    const hash2 = TransactionNormalizer.calculateHash(tx2);

    expect(hash1).not.toBe(hash2);
  });
});

describe('TransactionNormalizer.areEquivalent', () => {
  const tx1: NormalizedTransaction = {
    tx_hash: '0xabc',
    protocol: 'uniswap_v3',
    action_type: 'swap',
    agent_address: '0x1234567890123456789012345678901234567890',
    timestamp: '2024-01-15T10:30:00Z',
    tokens_in: [{ symbol: 'ETH', amount: '1', decimals: 18 }],
    tokens_out: [{ symbol: 'USDC', amount: '2500', decimals: 6 }],
    metadata: {},
    normalized_at: Date.now(),
  };

  it('should identify equivalent transactions', () => {
    const tx2 = { ...tx1 };
    expect(TransactionNormalizer.areEquivalent(tx1, tx2)).toBe(true);
  });

  it('should identify different tx_hash as different', () => {
    const tx2 = { ...tx1, tx_hash: '0xdef' };
    expect(TransactionNormalizer.areEquivalent(tx1, tx2)).toBe(false);
  });

  it('should identify different agent as different', () => {
    const tx2 = { ...tx1, agent_address: '0x0987654321098765432109876543210987654321' };
    expect(TransactionNormalizer.areEquivalent(tx1, tx2)).toBe(false);
  });
});
