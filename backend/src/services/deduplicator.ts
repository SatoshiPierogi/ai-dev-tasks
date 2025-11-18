/**
 * Transaction Deduplicator
 * Prevents duplicate transactions from multiple protocol queries
 * Uses content-based hashing and similarity matching
 */

import crypto from 'crypto';
import { NormalizedTransaction } from './normalizer';

// ============================================================================
// TYPES
// ============================================================================

export interface DeduplicationResult {
  isDuplicate: boolean;
  matchedTransaction?: NormalizedTransaction;
  confidence: number; // 0-1 score
  reason?: string;
}

export interface DeduplicationStats {
  totalProcessed: number;
  duplicatesFound: number;
  newTransactions: number;
  lastUpdated: number;
}

// ============================================================================
// DEDUPLICATOR
// ============================================================================

export class TransactionDeduplicator {
  private transactionHashes: Set<string>;
  private transactionMap: Map<string, NormalizedTransaction>;
  private stats: DeduplicationStats;

  constructor() {
    this.transactionHashes = new Set();
    this.transactionMap = new Map();
    this.stats = {
      totalProcessed: 0,
      duplicatesFound: 0,
      newTransactions: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Check if transaction is a duplicate
   */
  isDuplicate(transaction: NormalizedTransaction): DeduplicationResult {
    this.stats.totalProcessed++;

    // Primary check: exact match on tx_hash + agent_address
    const primaryKey = this.getPrimaryKey(transaction);
    if (this.transactionHashes.has(primaryKey)) {
      const matched = this.transactionMap.get(primaryKey);
      this.stats.duplicatesFound++;
      return {
        isDuplicate: true,
        matchedTransaction: matched,
        confidence: 1.0,
        reason: 'Exact match on transaction hash and agent address',
      };
    }

    // Secondary check: fuzzy matching for cross-protocol duplicates
    const secondaryMatch = this.findSimilarTransaction(transaction);
    if (secondaryMatch) {
      this.stats.duplicatesFound++;
      return {
        isDuplicate: true,
        matchedTransaction: secondaryMatch.transaction,
        confidence: secondaryMatch.similarity,
        reason: `Similar transaction found in protocol: ${secondaryMatch.transaction.protocol}`,
      };
    }

    return {
      isDuplicate: false,
      confidence: 0,
    };
  }

  /**
   * Add transaction to deduplication store
   */
  add(transaction: NormalizedTransaction): boolean {
    const primaryKey = this.getPrimaryKey(transaction);

    if (this.transactionHashes.has(primaryKey)) {
      return false; // Duplicate
    }

    this.transactionHashes.add(primaryKey);
    this.transactionMap.set(primaryKey, transaction);
    this.stats.newTransactions++;
    this.stats.lastUpdated = Date.now();

    return true;
  }

  /**
   * Get or add transaction (returns true if newly added, false if was duplicate)
   */
  getOrAdd(transaction: NormalizedTransaction): boolean {
    if (this.isDuplicate(transaction).isDuplicate) {
      return false;
    }
    return this.add(transaction);
  }

  /**
   * Get primary key for exact matching
   * Key = tx_hash:agent_address (protocol-agnostic)
   */
  private getPrimaryKey(transaction: NormalizedTransaction): string {
    return `${transaction.tx_hash}:${transaction.agent_address}`;
  }

  /**
   * Find similar transaction across protocols (fuzzy matching)
   */
  private findSimilarTransaction(
    transaction: NormalizedTransaction
  ): { transaction: NormalizedTransaction; similarity: number } | null {
    let bestMatch: { transaction: NormalizedTransaction; similarity: number } | null = null;

    // Check transactions with same agent and approximate timestamp
    for (const stored of this.transactionMap.values()) {
      if (stored.agent_address !== transaction.agent_address) {
        continue; // Different agent
      }

      const similarity = this.calculateSimilarity(transaction, stored);

      // Consider a match if similarity > 0.8 (80%)
      if (similarity > 0.8) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { transaction: stored, similarity };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate similarity score between two transactions
   * Factors: timestamp proximity, action type, token amounts
   */
  private calculateSimilarity(tx1: NormalizedTransaction, tx2: NormalizedTransaction): number {
    let score = 0;
    let factors = 0;

    // Factor 1: Timestamp proximity (within 1 minute)
    const time1 = new Date(tx1.timestamp).getTime();
    const time2 = new Date(tx2.timestamp).getTime();
    const timeDiff = Math.abs(time1 - time2);
    const timeScore = timeDiff < 60000 ? 1 - timeDiff / 60000 : 0;
    score += timeScore * 0.3;
    factors++;

    // Factor 2: Action type match
    const actionScore = tx1.action_type === tx2.action_type ? 1 : 0;
    score += actionScore * 0.3;
    factors++;

    // Factor 3: Token amount similarity
    if (tx1.tokens_in.length > 0 && tx2.tokens_in.length > 0) {
      const tokenScore = this.calculateTokenSimilarity(tx1.tokens_in, tx2.tokens_in);
      score += tokenScore * 0.4;
    } else if (tx1.tokens_in.length === 0 && tx2.tokens_in.length === 0) {
      score += 1 * 0.4;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate similarity of token arrays
   */
  private calculateTokenSimilarity(tokens1: any[], tokens2: any[]): number {
    if (tokens1.length === 0 || tokens2.length === 0) {
      return tokens1.length === tokens2.length ? 1 : 0;
    }

    // Simple check: do token symbols match?
    const symbols1 = new Set(tokens1.map((t) => t.symbol));
    const symbols2 = new Set(tokens2.map((t) => t.symbol));

    const intersection = new Set([...symbols1].filter((x) => symbols2.has(x)));
    const union = new Set([...symbols1, ...symbols2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Clear all stored transactions
   */
  clear(): void {
    this.transactionHashes.clear();
    this.transactionMap.clear();
    this.stats = {
      totalProcessed: 0,
      duplicatesFound: 0,
      newTransactions: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get deduplication statistics
   */
  getStats(): DeduplicationStats {
    return { ...this.stats };
  }

  /**
   * Get number of stored transactions
   */
  getSize(): number {
    return this.transactionHashes.size;
  }

  /**
   * Get stored transaction by hash
   */
  getTransaction(txHash: string, agentAddress: string): NormalizedTransaction | undefined {
    const key = `${txHash}:${agentAddress}`;
    return this.transactionMap.get(key);
  }

  /**
   * Get all stored transactions for an agent
   */
  getAgentTransactions(agentAddress: string): NormalizedTransaction[] {
    const result: NormalizedTransaction[] = [];

    for (const tx of this.transactionMap.values()) {
      if (tx.agent_address === agentAddress) {
        result.push(tx);
      }
    }

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Remove old transactions (older than specified date)
   */
  removeOlderThan(date: Date): number {
    const cutoffTime = date.getTime();
    let removed = 0;

    for (const [key, tx] of this.transactionMap.entries()) {
      if (new Date(tx.timestamp).getTime() < cutoffTime) {
        this.transactionHashes.delete(key);
        this.transactionMap.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Export all transactions as array
   */
  export(): NormalizedTransaction[] {
    return Array.from(this.transactionMap.values());
  }

  /**
   * Import transactions from array
   */
  import(transactions: NormalizedTransaction[]): number {
    let imported = 0;

    for (const tx of transactions) {
      if (this.add(tx)) {
        imported++;
      }
    }

    return imported;
  }
}

/**
 * Singleton instance for process lifetime
 */
let instance: TransactionDeduplicator | null = null;

export function getDeduplicator(): TransactionDeduplicator {
  if (!instance) {
    instance = new TransactionDeduplicator();
  }
  return instance;
}

export function resetDeduplicator(): void {
  instance = null;
}
