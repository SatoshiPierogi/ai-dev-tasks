/**
 * Transaction Normalizer
 * Converts protocol-specific transaction data into unified schema
 */

import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface TokenInfo {
  address?: string;
  symbol: string;
  amount: string;
  decimals: number;
}

export interface NormalizedTransaction {
  tx_hash: string;
  protocol: string;
  action_type: 'swap' | 'transfer' | 'stake' | 'lp' | 'vote' | 'bridge' | 'custom';
  agent_address: string;
  timestamp: string;
  tokens_in: TokenInfo[];
  tokens_out: TokenInfo[];
  metadata: Record<string, any>;
  normalized_at: number;
}

export interface RawEvent {
  tx_hash: string;
  protocol: string;
  action_type: string;
  agent_address: string;
  timestamp: string;
  [key: string]: any;
}

// ============================================================================
// NORMALIZER
// ============================================================================

export class TransactionNormalizer {
  /**
   * Normalize a transaction to unified format
   */
  static normalize(event: any): NormalizedTransaction | null {
    try {
      // Validate required fields
      if (!event.tx_hash || !event.protocol || !event.action_type || !event.agent_address || !event.timestamp) {
        return null;
      }

      // Normalize wallet address
      const normalizedAddress = this.normalizeAddress(event.agent_address);
      if (!normalizedAddress) {
        return null;
      }

      // Normalize timestamp to ISO string if not already
      const normalizedTimestamp = this.normalizeTimestamp(event.timestamp);
      if (!normalizedTimestamp) {
        return null;
      }

      // Extract and normalize token information
      const tokensIn = this.normalizeTokenArray(event.tokens_in || []);
      const tokensOut = this.normalizeTokenArray(event.tokens_out || []);

      return {
        tx_hash: event.tx_hash.toLowerCase(),
        protocol: event.protocol.toLowerCase(),
        action_type: event.action_type.toLowerCase() as any,
        agent_address: normalizedAddress,
        timestamp: normalizedTimestamp,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        metadata: event.metadata || {},
        normalized_at: Date.now(),
      };
    } catch (error) {
      console.error('Error normalizing transaction:', error);
      return null;
    }
  }

  /**
   * Normalize wallet address to checksummed format
   */
  static normalizeAddress(address: string | undefined): string | null {
    if (!address || typeof address !== 'string') {
      return null;
    }

    // Remove whitespace and convert to lowercase
    const cleaned = address.trim().toLowerCase();

    // Validate Ethereum address format
    if (!/^0x[0-9a-f]{40}$/.test(cleaned)) {
      return null;
    }

    // Convert to checksummed format (optional, just return lowercase for consistency)
    return cleaned;
  }

  /**
   * Normalize timestamp to ISO string
   */
  static normalizeTimestamp(timestamp: string | number): string | null {
    try {
      let date: Date;

      if (typeof timestamp === 'string') {
        // Try to parse as ISO string first
        if (timestamp.includes('T')) {
          date = new Date(timestamp);
        } else {
          // Try to parse as Unix timestamp (seconds or milliseconds)
          const num = parseInt(timestamp, 10);
          date = new Date(num * (num > 10000000000 ? 1 : 1000));
        }
      } else if (typeof timestamp === 'number') {
        // Convert Unix timestamp to date (seconds or milliseconds)
        date = new Date(timestamp * (timestamp > 10000000000 ? 1 : 1000));
      } else {
        return null;
      }

      // Validate date
      if (isNaN(date.getTime())) {
        return null;
      }

      return date.toISOString();
    } catch (error) {
      return null;
    }
  }

  /**
   * Normalize token array
   */
  static normalizeTokenArray(tokens: any[]): TokenInfo[] {
    if (!Array.isArray(tokens)) {
      return [];
    }

    return tokens
      .map((token) => this.normalizeToken(token))
      .filter((token): token is TokenInfo => token !== null);
  }

  /**
   * Normalize single token
   */
  static normalizeToken(token: any): TokenInfo | null {
    if (!token || typeof token !== 'object') {
      return null;
    }

    // Validate required fields
    if (!token.symbol || !token.amount) {
      return null;
    }

    // Ensure decimals is a number
    const decimals = typeof token.decimals === 'number' ? token.decimals : 18;

    return {
      address: token.address?.toLowerCase(),
      symbol: String(token.symbol).toUpperCase(),
      amount: String(token.amount),
      decimals: Math.max(0, decimals),
    };
  }

  /**
   * Validate normalized transaction
   */
  static validate(transaction: NormalizedTransaction): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!transaction.tx_hash) errors.push('Missing tx_hash');
    if (!transaction.protocol) errors.push('Missing protocol');
    if (!transaction.action_type) errors.push('Missing action_type');
    if (!transaction.agent_address) errors.push('Missing agent_address');
    if (!transaction.timestamp) errors.push('Missing timestamp');

    // Validate address format
    if (transaction.agent_address && !/^0x[0-9a-f]{40}$/.test(transaction.agent_address)) {
      errors.push('Invalid agent_address format');
    }

    // Validate timestamp is ISO string
    if (transaction.timestamp && !/^\d{4}-\d{2}-\d{2}T/.test(transaction.timestamp)) {
      errors.push('Invalid timestamp format (must be ISO 8601)');
    }

    // Validate action type
    const validActions = ['swap', 'transfer', 'stake', 'lp', 'vote', 'bridge', 'custom'];
    if (!validActions.includes(transaction.action_type)) {
      errors.push(`Invalid action_type: ${transaction.action_type}`);
    }

    // Validate tokens_in and tokens_out are arrays
    if (!Array.isArray(transaction.tokens_in)) errors.push('tokens_in must be an array');
    if (!Array.isArray(transaction.tokens_out)) errors.push('tokens_out must be an array');

    // At least one of tokens_in or tokens_out should be non-empty
    if (transaction.tokens_in.length === 0 && transaction.tokens_out.length === 0) {
      errors.push('At least one of tokens_in or tokens_out must be non-empty');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate transaction hash for deduplication
   * Combines tx_hash, protocol, and agent_address
   */
  static calculateHash(transaction: NormalizedTransaction): string {
    const key = `${transaction.tx_hash}:${transaction.protocol}:${transaction.agent_address}`;
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Compare two transactions for equivalence
   */
  static areEquivalent(
    tx1: NormalizedTransaction,
    tx2: NormalizedTransaction
  ): boolean {
    return (
      tx1.tx_hash === tx2.tx_hash &&
      tx1.protocol === tx2.protocol &&
      tx1.agent_address === tx2.agent_address &&
      tx1.action_type === tx2.action_type
    );
  }

  /**
   * Merge multiple instances of the same transaction
   * Keeps metadata from the first occurrence
   */
  static merge(...transactions: NormalizedTransaction[]): NormalizedTransaction {
    if (transactions.length === 0) {
      throw new Error('Cannot merge empty array of transactions');
    }

    const first = transactions[0];
    const merged: NormalizedTransaction = {
      ...first,
      metadata: {
        ...first.metadata,
        _merged_sources: transactions.length,
        _source_protocols: [...new Set(transactions.map((t) => t.protocol))],
      },
    };

    return merged;
  }
}
