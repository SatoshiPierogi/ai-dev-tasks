/**
 * Uniswap V3 Parser
 * Parses Uniswap swap and liquidity events
 */

import { NormalizedTransaction } from '../services/normalizer';
import { ParsedTransaction, Protocol, TransactionType } from './types';
import { BaseParser } from './base';

// ============================================================================
// UNISWAP PARSER
// ============================================================================

export class UniswapParser extends BaseParser {
  constructor() {
    super(Protocol.UNISWAP);
  }

  /**
   * Check if this parser can handle the transaction
   */
  canHandle(normalized: NormalizedTransaction): boolean {
    return normalized.protocol.toLowerCase().includes('uniswap');
  }

  /**
   * Parse a Uniswap transaction
   */
  parse(normalized: NormalizedTransaction): ParsedTransaction | null {
    try {
      const action = normalized.action_type.toLowerCase();

      if (action === 'swap') {
        return this.parseSwap(normalized);
      } else if (action.includes('liquidity')) {
        return this.parseLiquidity(normalized);
      }

      // Default: return as custom type
      return this.buildParsedTransaction(
        normalized,
        TransactionType.CUSTOM,
        `Uniswap ${action}`,
        {
          shortDescription: `${action} on Uniswap V3`,
        }
      );
    } catch (error) {
      console.error('Error parsing Uniswap transaction:', error);
      return null;
    }
  }

  /**
   * Parse a swap transaction
   */
  private parseSwap(normalized: NormalizedTransaction): ParsedTransaction | null {
    try {
      // Validate required fields
      if (normalized.tokens_in.length === 0 || normalized.tokens_out.length === 0) {
        return null;
      }

      const tokenIn = normalized.tokens_in[0];
      const tokenOut = normalized.tokens_out[0];

      // Get amount information
      const amountIn = this.parseDecimalAmount(tokenIn.amount, tokenIn.decimals);
      const amountOut = this.parseDecimalAmount(tokenOut.amount, tokenOut.decimals);

      // Calculate price impact if available
      const metadata = normalized.metadata || {};
      const priceImpact = metadata.priceImpact;
      const slippage = metadata.slippage;

      // Format description
      const description = this.generateSwapDescription(
        amountIn,
        tokenIn.symbol,
        amountOut,
        tokenOut.symbol,
        priceImpact,
        slippage
      );

      return this.buildParsedTransaction(
        normalized,
        TransactionType.SWAP,
        description,
        {
          shortDescription: `Swapped ${this.abbreviate(amountIn)} ${tokenIn.symbol} for ${this.abbreviate(amountOut)} ${tokenOut.symbol}`,
          details: {
            priceImpact,
            slippage,
            spotPrice: metadata.spotPrice,
            router: metadata.router,
            poolId: metadata.pool_id,
          },
        }
      );
    } catch (error) {
      console.error('Error parsing Uniswap swap:', error);
      return null;
    }
  }

  /**
   * Parse a liquidity operation (add/remove)
   */
  private parseLiquidity(normalized: NormalizedTransaction): ParsedTransaction | null {
    try {
      const action = normalized.action_type.toLowerCase();
      const isAdd = action.includes('add');

      if (isAdd) {
        return this.parseAddLiquidity(normalized);
      } else {
        return this.parseRemoveLiquidity(normalized);
      }
    } catch (error) {
      console.error('Error parsing Uniswap liquidity:', error);
      return null;
    }
  }

  /**
   * Parse add liquidity transaction
   */
  private parseAddLiquidity(normalized: NormalizedTransaction): ParsedTransaction {
    try {
      const parts = normalized.tokens_in.map((t) => {
        const amount = this.parseDecimalAmount(t.amount, t.decimals);
        return `${this.abbreviate(amount)} ${t.symbol}`;
      });

      const description =
        normalized.tokens_in.length === 1
          ? `Added ${parts[0]} liquidity to Uniswap V3`
          : `Added ${parts.join(' and ')} liquidity to Uniswap V3`;

      return this.buildParsedTransaction(
        normalized,
        TransactionType.ADD_LIQUIDITY,
        description,
        {
          shortDescription: `Added liquidity on Uniswap V3`,
          details: {
            poolAddress: this.getMetadataValue(normalized.metadata, 'pool_id'),
            fee: this.getMetadataValue(normalized.metadata, 'fee'),
            tickLower: this.getMetadataValue(normalized.metadata, 'tickLower'),
            tickUpper: this.getMetadataValue(normalized.metadata, 'tickUpper'),
          },
        }
      );
    } catch (error) {
      console.error('Error parsing add liquidity:', error);
      return this.buildParsedTransaction(normalized, TransactionType.ADD_LIQUIDITY, 'Added liquidity to Uniswap V3');
    }
  }

  /**
   * Parse remove liquidity transaction
   */
  private parseRemoveLiquidity(normalized: NormalizedTransaction): ParsedTransaction {
    try {
      const parts = normalized.tokens_out.map((t) => {
        const amount = this.parseDecimalAmount(t.amount, t.decimals);
        return `${this.abbreviate(amount)} ${t.symbol}`;
      });

      const description =
        normalized.tokens_out.length === 1
          ? `Removed ${parts[0]} liquidity from Uniswap V3`
          : `Removed ${parts.join(' and ')} liquidity from Uniswap V3`;

      return this.buildParsedTransaction(
        normalized,
        TransactionType.REMOVE_LIQUIDITY,
        description,
        {
          shortDescription: `Removed liquidity on Uniswap V3`,
          details: {
            poolAddress: this.getMetadataValue(normalized.metadata, 'pool_id'),
            fee: this.getMetadataValue(normalized.metadata, 'fee'),
          },
        }
      );
    } catch (error) {
      console.error('Error parsing remove liquidity:', error);
      return this.buildParsedTransaction(
        normalized,
        TransactionType.REMOVE_LIQUIDITY,
        'Removed liquidity from Uniswap V3'
      );
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
    priceImpact?: number,
    slippage?: number
  ): string {
    const parts = [
      `Swapped ${this.abbreviate(amountIn)} ${symbolIn}`,
      `for ${this.abbreviate(amountOut)} ${symbolOut}`,
      'on Uniswap V3',
    ];

    if (slippage !== undefined) {
      parts.push(`(slippage: ${slippage.toFixed(2)}%)`);
    }

    if (priceImpact !== undefined && priceImpact > 0.5) {
      parts.push(`[⚠️ High price impact: ${priceImpact.toFixed(2)}%]`);
    }

    return parts.join(' ');
  }
}

/**
 * Singleton instance
 */
let instance: UniswapParser | null = null;

export function getUniswapParser(): UniswapParser {
  if (!instance) {
    instance = new UniswapParser();
  }
  return instance;
}
