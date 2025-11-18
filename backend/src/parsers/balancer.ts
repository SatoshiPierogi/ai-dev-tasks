/**
 * Balancer V2 Parser
 * Parses Balancer swap and pool exit/join events
 */

import { NormalizedTransaction } from '../services/normalizer';
import { ParsedTransaction, Protocol, TransactionType } from './types';
import { BaseParser } from './base';

// ============================================================================
// BALANCER PARSER
// ============================================================================

export class BalancerParser extends BaseParser {
  constructor() {
    super(Protocol.BALANCER);
  }

  /**
   * Check if this parser can handle the transaction
   */
  canHandle(normalized: NormalizedTransaction): boolean {
    return normalized.protocol.toLowerCase().includes('balancer');
  }

  /**
   * Parse a Balancer transaction
   */
  parse(normalized: NormalizedTransaction): ParsedTransaction | null {
    try {
      const action = normalized.action_type.toLowerCase();

      if (action === 'swap') {
        return this.parseSwap(normalized);
      } else if (action === 'join' || action.includes('join')) {
        return this.parseJoin(normalized);
      } else if (action === 'exit' || action.includes('exit')) {
        return this.parseExit(normalized);
      }

      // Default: return as custom type
      return this.buildParsedTransaction(
        normalized,
        TransactionType.CUSTOM,
        `Balancer ${action}`,
        {
          shortDescription: `${action} on Balancer`,
        }
      );
    } catch (error) {
      console.error('Error parsing Balancer transaction:', error);
      return null;
    }
  }

  /**
   * Parse a swap transaction
   */
  private parseSwap(normalized: NormalizedTransaction): ParsedTransaction | null {
    try {
      if (normalized.tokens_in.length === 0 || normalized.tokens_out.length === 0) {
        return null;
      }

      const tokenIn = normalized.tokens_in[0];
      const tokenOut = normalized.tokens_out[0];

      const amountIn = this.parseDecimalAmount(tokenIn.amount, tokenIn.decimals);
      const amountOut = this.parseDecimalAmount(tokenOut.amount, tokenOut.decimals);

      const metadata = normalized.metadata || {};
      const priceImpact = metadata.priceImpact;

      const description = this.generateSwapDescription(
        amountIn,
        tokenIn.symbol,
        amountOut,
        tokenOut.symbol,
        priceImpact
      );

      return this.buildParsedTransaction(
        normalized,
        TransactionType.SWAP,
        description,
        {
          shortDescription: `Swapped ${this.abbreviate(amountIn)} ${tokenIn.symbol} for ${this.abbreviate(amountOut)} ${tokenOut.symbol}`,
          details: {
            priceImpact,
            poolId: metadata.pool_id,
            batchSwap: metadata.batchSwap === true,
          },
        }
      );
    } catch (error) {
      console.error('Error parsing Balancer swap:', error);
      return null;
    }
  }

  /**
   * Parse join pool transaction (add liquidity)
   */
  private parseJoin(normalized: NormalizedTransaction): ParsedTransaction {
    try {
      const parts = normalized.tokens_in.map((t) => {
        const amount = this.parseDecimalAmount(t.amount, t.decimals);
        return `${this.abbreviate(amount)} ${t.symbol}`;
      });

      const description =
        normalized.tokens_in.length === 1
          ? `Joined Balancer pool with ${parts[0]}`
          : `Joined Balancer pool with ${parts.join(' and ')}`;

      // Get BPT (Balancer Pool Token) info
      const bptOut = normalized.tokens_out[0];
      const bptAmount = bptOut ? this.parseDecimalAmount(bptOut.amount, bptOut.decimals) : undefined;

      return this.buildParsedTransaction(
        normalized,
        TransactionType.ADD_LIQUIDITY,
        description,
        {
          shortDescription: `Joined Balancer pool`,
          details: {
            bptSymbol: bptOut?.symbol,
            bptAmount,
            poolId: this.getMetadataValue(normalized.metadata, 'pool_id'),
            poolName: this.getMetadataValue(normalized.metadata, 'pool_name'),
            joinKind: this.getMetadataValue(normalized.metadata, 'joinKind'),
          },
        }
      );
    } catch (error) {
      console.error('Error parsing Balancer join:', error);
      return this.buildParsedTransaction(normalized, TransactionType.ADD_LIQUIDITY, 'Joined Balancer pool');
    }
  }

  /**
   * Parse exit pool transaction (remove liquidity)
   */
  private parseExit(normalized: NormalizedTransaction): ParsedTransaction {
    try {
      const parts = normalized.tokens_out.map((t) => {
        const amount = this.parseDecimalAmount(t.amount, t.decimals);
        return `${this.abbreviate(amount)} ${t.symbol}`;
      });

      const description =
        normalized.tokens_out.length === 1
          ? `Exited Balancer pool, received ${parts[0]}`
          : `Exited Balancer pool, received ${parts.join(' and ')}`;

      // Get BPT (Balancer Pool Token) info
      const bptIn = normalized.tokens_in[0];
      const bptAmount = bptIn ? this.parseDecimalAmount(bptIn.amount, bptIn.decimals) : undefined;

      return this.buildParsedTransaction(
        normalized,
        TransactionType.REMOVE_LIQUIDITY,
        description,
        {
          shortDescription: `Exited Balancer pool`,
          details: {
            bptSymbol: bptIn?.symbol,
            bptBurned: bptAmount,
            poolId: this.getMetadataValue(normalized.metadata, 'pool_id'),
            poolName: this.getMetadataValue(normalized.metadata, 'pool_name'),
            exitKind: this.getMetadataValue(normalized.metadata, 'exitKind'),
          },
        }
      );
    } catch (error) {
      console.error('Error parsing Balancer exit:', error);
      return this.buildParsedTransaction(normalized, TransactionType.REMOVE_LIQUIDITY, 'Exited Balancer pool');
    }
  }

  /**
   * Generate a human-readable swap description
   */
  private generateSwapDescription(
    amountIn: string,
    symbolIn: string,
    amountOut: string,
    symbolOut: string,
    priceImpact?: number
  ): string {
    const parts = [
      `Swapped ${this.abbreviate(amountIn)} ${symbolIn}`,
      `for ${this.abbreviate(amountOut)} ${symbolOut}`,
      'on Balancer',
    ];

    if (priceImpact !== undefined && priceImpact > 0.5) {
      parts.push(`[⚠️ Price impact: ${priceImpact.toFixed(2)}%]`);
    }

    return parts.join(' ');
  }
}

/**
 * Singleton instance
 */
let instance: BalancerParser | null = null;

export function getBalancerParser(): BalancerParser {
  if (!instance) {
    instance = new BalancerParser();
  }
  return instance;
}
