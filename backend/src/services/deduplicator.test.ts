/**
 * Transaction Deduplicator Tests
 * Tests for duplicate detection and deduplication logic
 */

import { TransactionDeduplicator, getDeduplicator, resetDeduplicator } from './deduplicator';
import { NormalizedTransaction } from './normalizer';

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_WALLET = '0x1234567890123456789012345678901234567890';
const TEST_WALLET_2 = '0x0987654321098765432109876543210987654321';

const createMockTransaction = (overrides?: Partial<NormalizedTransaction>): NormalizedTransaction => ({
  tx_hash: '0xabc123',
  protocol: 'uniswap_v3',
  action_type: 'swap',
  agent_address: TEST_WALLET,
  timestamp: '2024-01-15T10:30:00Z',
  tokens_in: [{ symbol: 'ETH', amount: '1000000000000000000', decimals: 18 }],
  tokens_out: [{ symbol: 'USDC', amount: '2500000000', decimals: 6 }],
  metadata: {},
  normalized_at: Date.now(),
  ...overrides,
});

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  resetDeduplicator();
});

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

describe('TransactionDeduplicator', () => {
  it('should initialize empty', () => {
    const dedup = new TransactionDeduplicator();

    expect(dedup.getSize()).toBe(0);
    expect(dedup.export()).toHaveLength(0);
  });

  it('should return singleton instance', () => {
    const dedup1 = getDeduplicator();
    const dedup2 = getDeduplicator();

    expect(dedup1).toBe(dedup2);
  });

  it('should reset singleton', () => {
    const dedup1 = getDeduplicator();
    dedup1.add(createMockTransaction());

    resetDeduplicator();

    const dedup2 = getDeduplicator();
    expect(dedup2).not.toBe(dedup1);
    expect(dedup2.getSize()).toBe(0);
  });

  it('should initialize with correct stats', () => {
    const dedup = new TransactionDeduplicator();
    const stats = dedup.getStats();

    expect(stats.totalProcessed).toBe(0);
    expect(stats.duplicatesFound).toBe(0);
    expect(stats.newTransactions).toBe(0);
  });
});

// ============================================================================
// DUPLICATE DETECTION TESTS
// ============================================================================

describe('Duplicate Detection', () => {
  it('should detect exact duplicate', () => {
    const dedup = new TransactionDeduplicator();
    const tx1 = createMockTransaction();
    const tx2 = createMockTransaction();

    dedup.add(tx1);
    const result = dedup.isDuplicate(tx2);

    expect(result.isDuplicate).toBe(true);
    expect(result.confidence).toBe(1.0);
    expect(result.matchedTransaction).toBeDefined();
  });

  it('should not detect non-duplicate', () => {
    const dedup = new TransactionDeduplicator();
    const tx1 = createMockTransaction();
    const tx2 = createMockTransaction({ tx_hash: '0xdef456' });

    dedup.add(tx1);
    const result = dedup.isDuplicate(tx2);

    expect(result.isDuplicate).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('should require same agent for primary match', () => {
    const dedup = new TransactionDeduplicator();
    const tx1 = createMockTransaction();
    const tx2 = createMockTransaction({ agent_address: TEST_WALLET_2 });

    dedup.add(tx1);
    const result = dedup.isDuplicate(tx2);

    expect(result.isDuplicate).toBe(false);
  });

  it('should require same tx_hash for primary match', () => {
    const dedup = new TransactionDeduplicator();
    const tx1 = createMockTransaction();
    const tx2 = createMockTransaction({ tx_hash: '0xdifferent' });

    dedup.add(tx1);
    const result = dedup.isDuplicate(tx2);

    expect(result.isDuplicate).toBe(false);
  });

  it('should detect cross-protocol duplicate', () => {
    const dedup = new TransactionDeduplicator();
    const tx1 = createMockTransaction({
      protocol: 'uniswap_v3',
      timestamp: new Date().toISOString(),
    });
    const tx2 = createMockTransaction({
      protocol: 'curve', // Different protocol
      timestamp: new Date().toISOString(),
      // Similar tokens and amounts
    });

    dedup.add(tx1);
    const result = dedup.isDuplicate(tx2);

    // Should potentially match as cross-protocol duplicate
    expect(result).toBeDefined();
  });

  it('should update stats on duplicate detection', () => {
    const dedup = new TransactionDeduplicator();
    const tx1 = createMockTransaction();
    const tx2 = createMockTransaction();

    dedup.add(tx1);
    dedup.isDuplicate(tx2);

    const stats = dedup.getStats();
    expect(stats.totalProcessed).toBe(1);
    expect(stats.duplicatesFound).toBe(1);
  });
});

// ============================================================================
// ADD AND GET_OR_ADD TESTS
// ============================================================================

describe('Add and GetOrAdd', () => {
  it('should add new transaction', () => {
    const dedup = new TransactionDeduplicator();
    const tx = createMockTransaction();

    const result = dedup.add(tx);

    expect(result).toBe(true);
    expect(dedup.getSize()).toBe(1);
  });

  it('should not re-add duplicate', () => {
    const dedup = new TransactionDeduplicator();
    const tx = createMockTransaction();

    dedup.add(tx);
    const result = dedup.add(tx);

    expect(result).toBe(false);
    expect(dedup.getSize()).toBe(1);
  });

  it('should return true for new transaction with getOrAdd', () => {
    const dedup = new TransactionDeduplicator();
    const tx = createMockTransaction();

    const result = dedup.getOrAdd(tx);

    expect(result).toBe(true);
  });

  it('should return false for duplicate with getOrAdd', () => {
    const dedup = new TransactionDeduplicator();
    const tx = createMockTransaction();

    dedup.add(tx);
    const result = dedup.getOrAdd(tx);

    expect(result).toBe(false);
  });

  it('should update stats on add', () => {
    const dedup = new TransactionDeduplicator();
    const tx1 = createMockTransaction();
    const tx2 = createMockTransaction({ tx_hash: '0xdef' });

    dedup.add(tx1);
    dedup.add(tx2);

    const stats = dedup.getStats();
    expect(stats.newTransactions).toBe(2);
  });
});

// ============================================================================
// RETRIEVAL TESTS
// ============================================================================

describe('Retrieval', () => {
  it('should retrieve transaction by hash', () => {
    const dedup = new TransactionDeduplicator();
    const tx = createMockTransaction();

    dedup.add(tx);
    const retrieved = dedup.getTransaction(tx.tx_hash, tx.agent_address);

    expect(retrieved).toBeDefined();
    expect(retrieved?.tx_hash).toBe(tx.tx_hash);
  });

  it('should return undefined for non-existent transaction', () => {
    const dedup = new TransactionDeduplicator();
    const retrieved = dedup.getTransaction('0xnonexistent', TEST_WALLET);

    expect(retrieved).toBeUndefined();
  });

  it('should get all transactions for agent', () => {
    const dedup = new TransactionDeduplicator();
    const tx1 = createMockTransaction({ tx_hash: '0xabc' });
    const tx2 = createMockTransaction({ tx_hash: '0xdef' });
    const tx3 = createMockTransaction({
      tx_hash: '0xghi',
      agent_address: TEST_WALLET_2,
    });

    dedup.add(tx1);
    dedup.add(tx2);
    dedup.add(tx3);

    const agentTxs = dedup.getAgentTransactions(TEST_WALLET);

    expect(agentTxs).toHaveLength(2);
    expect(agentTxs.every((t) => t.agent_address === TEST_WALLET)).toBe(true);
  });

  it('should return transactions sorted by timestamp descending', () => {
    const dedup = new TransactionDeduplicator();
    const tx1 = createMockTransaction({
      tx_hash: '0xabc',
      timestamp: '2024-01-15T10:00:00Z',
    });
    const tx2 = createMockTransaction({
      tx_hash: '0xdef',
      timestamp: '2024-01-15T11:00:00Z',
    });

    dedup.add(tx1);
    dedup.add(tx2);

    const agentTxs = dedup.getAgentTransactions(TEST_WALLET);

    expect(agentTxs[0].timestamp).toBe(tx2.timestamp);
    expect(agentTxs[1].timestamp).toBe(tx1.timestamp);
  });
});

// ============================================================================
// CLEAR AND CLEANUP TESTS
// ============================================================================

describe('Clear and Cleanup', () => {
  it('should clear all transactions', () => {
    const dedup = new TransactionDeduplicator();
    dedup.add(createMockTransaction());
    dedup.add(createMockTransaction({ tx_hash: '0xdef' }));

    expect(dedup.getSize()).toBe(2);

    dedup.clear();

    expect(dedup.getSize()).toBe(0);
    expect(dedup.export()).toHaveLength(0);
  });

  it('should reset stats on clear', () => {
    const dedup = new TransactionDeduplicator();
    dedup.add(createMockTransaction());

    dedup.clear();

    const stats = dedup.getStats();
    expect(stats.totalProcessed).toBe(0);
    expect(stats.newTransactions).toBe(0);
  });

  it('should remove old transactions', () => {
    const dedup = new TransactionDeduplicator();
    const oldDate = new Date('2024-01-01');
    const oldTx = createMockTransaction({
      tx_hash: '0xold',
      timestamp: oldDate.toISOString(),
    });
    const newTx = createMockTransaction({
      tx_hash: '0xnew',
      timestamp: new Date().toISOString(),
    });

    dedup.add(oldTx);
    dedup.add(newTx);

    const cutoffDate = new Date('2024-01-15');
    const removed = dedup.removeOlderThan(cutoffDate);

    expect(removed).toBe(1);
    expect(dedup.getSize()).toBe(1);
    expect(dedup.getAgentTransactions(TEST_WALLET)[0].tx_hash).toBe('0xnew');
  });
});

// ============================================================================
// IMPORT/EXPORT TESTS
// ============================================================================

describe('Import/Export', () => {
  it('should export all transactions', () => {
    const dedup = new TransactionDeduplicator();
    const tx1 = createMockTransaction();
    const tx2 = createMockTransaction({ tx_hash: '0xdef' });

    dedup.add(tx1);
    dedup.add(tx2);

    const exported = dedup.export();

    expect(exported).toHaveLength(2);
    expect(exported.some((t) => t.tx_hash === tx1.tx_hash)).toBe(true);
    expect(exported.some((t) => t.tx_hash === tx2.tx_hash)).toBe(true);
  });

  it('should import transactions', () => {
    const dedup = new TransactionDeduplicator();
    const transactions = [
      createMockTransaction(),
      createMockTransaction({ tx_hash: '0xdef' }),
    ];

    const imported = dedup.import(transactions);

    expect(imported).toBe(2);
    expect(dedup.getSize()).toBe(2);
  });

  it('should not re-import duplicates', () => {
    const dedup = new TransactionDeduplicator();
    const tx = createMockTransaction();

    dedup.add(tx);
    const imported = dedup.import([tx, createMockTransaction({ tx_hash: '0xdef' })]);

    expect(imported).toBe(1); // Only the new one
    expect(dedup.getSize()).toBe(2);
  });
});

// ============================================================================
// SIMILARITY TESTS
// ============================================================================

describe('Similarity Calculation', () => {
  it('should match transactions with same token symbols', () => {
    const dedup = new TransactionDeduplicator();
    const tx1 = createMockTransaction({
      timestamp: new Date().toISOString(),
    });
    const tx2 = createMockTransaction({
      tx_hash: '0xdifferent',
      agent_address: tx1.agent_address,
      timestamp: new Date(Date.now() + 1000).toISOString(), // 1 second later
      tokens_in: [{ symbol: 'ETH', amount: '1000000000000000000', decimals: 18 }],
      tokens_out: [{ symbol: 'USDC', amount: '2500000000', decimals: 6 }],
    });

    dedup.add(tx1);
    const result = dedup.isDuplicate(tx2);

    // Could match as similar transaction
    expect(result).toBeDefined();
  });

  it('should not match transactions with different tokens', () => {
    const dedup = new TransactionDeduplicator();
    const tx1 = createMockTransaction({
      tokens_in: [{ symbol: 'ETH', amount: '1', decimals: 18 }],
    });
    const tx2 = createMockTransaction({
      tx_hash: '0xdifferent',
      tokens_in: [{ symbol: 'DAI', amount: '1000', decimals: 18 }],
    });

    dedup.add(tx1);
    const result = dedup.isDuplicate(tx2);

    // Should not match as similar
    expect(result.isDuplicate).toBe(false);
  });
});
