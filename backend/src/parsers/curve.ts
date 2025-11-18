/**
 * Curve Parser
 * Parses Curve swap and liquidity events
 */

import { NormalizedTransaction } from '../services/normalizer';
import { ParsedTransaction, Protocol, TransactionType } from './types';
import { BaseParser } from './base';

// ============================================================================
// CURVE PARSER
// ============================================================================

export class CurveParser extends BaseParser {
  constructor() {
    super(Protocol.CURVE);
  }

  /**
   * Check if this parser can handle the transaction
   */
  canHandle(normalized: NormalizedTransaction): boolean {
    return normalized.protocol.toLowerCase().includes('curve');
  }

  /**
   * Parse a Curve transaction
   */
  parse(normalized: NormalizedTransaction): ParsedTransaction | null {
    try {
      const action = normalized.action_type.toLowerCase();

      if (action === 'swap') {
        return this.parseSwap(normalized);
      } else if (action.includes('add_liquidity')) {
        return this.parseAddLiquidity(normalized);
      } else if (action.includes('remove_liquidity')) {
        return this.parseRemoveLiquidity(normalized);
      }

      // Default: return as custom type
      return this.buildParsedTransaction(
        normalized,
        TransactionType.CUSTOM,
        `Curve ${action}`,
        {
          shortDescription: `${action} on Curve`,
        }
      );
    } catch (error) {
      console.error('Error parsing Curve transaction:', error);
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
      const slippage = metadata.slippage;
      const priceImpact = metadata.priceImpact;

      const description = this.generateSwapDescription(
        amountIn,
        tokenIn.symbol,
        amountOut,
        tokenOut.symbol,
        slippage,
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
            slippage,
            pool: metadata.pool,
            poolAddress: metadata.pool_address,
          },
        }
      );
    } catch (error) {
      console.error('Error parsing Curve swap:', error);
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
          ? `Added ${parts[0]} to Curve liquidity pool`
          : `Added ${parts.join(' and ')} to Curve liquidity pool`;

      // Get LP token info
      const lpToken = normalized.tokens_out[0];
      const lpAmount = lpToken ? this.parseDecimalAmount(lpToken.amount, lpToken.decimals) : undefined;

      return this.buildParsedTransaction(
        normalized,
        TransactionType.ADD_LIQUIDITY,
        description,
        {
          shortDescription: `Added liquidity to Curve`,
          details: {
            lpTokenSymbol: lpToken?.symbol,
            lpTokenAmount: lpAmount,
            pool: this.getMetadataValue(normalized.metadata, 'pool'),
            poolAddress: this.getMetadataValue(normalized.metadata, 'pool_address'),
            minMintAmount: this.getMetadataValue(normalized.metadata, 'min_mint_amount'),
          },
        }
      );
    } catch (error) {
      console.error('Error parsing add liquidity:', error);
      return this.buildParsedTransaction(normalized, TransactionType.ADD_LIQUIDITY, 'Added liquidity to Curve');
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
          ? `Removed ${parts[0]} from Curve liquidity pool`
          : `Removed ${parts.join(' and ')} from Curve liquidity pool`;

      // Get LP token info
      const lpToken = normalized.tokens_in[0];
      const lpAmount = lpToken ? this.parseDecimalAmount(lpToken.amount, lpToken.decimals) : undefined;

      return this.buildParsedTransaction(
        normalized,
        TransactionType.REMOVE_LIQUIDITY,
        description,
        {
          shortDescription: `Removed liquidity from Curve`,
          details: {
            lpTokenSymbol: lpToken?.symbol,
            lpTokenBurned: lpAmount,
            pool: this.getMetadataValue(normalized.metadata, 'pool'),
            poolAddress: this.getMetadataValue(normalized.metadata, 'pool_address'),
            minAmounts: this.getMetadataValue(normalized.metadata, 'min_amounts'),
          },
        }
      );
    } catch (error) {
      console.error('Error parsing remove liquidity:', error);
      return this.buildParsedTransaction(normalized, TransactionType.REMOVE_LIQUIDITY, 'Removed liquidity from Curve');
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
    slippage?: number,
    priceImpact?: number
  ): string {
    const parts = [
      `Swapped ${this.abbreviate(amountIn)} ${symbolIn}`,
      `for ${this.abbreviate(amountOut)} ${symbolOut}`,
      'on Curve',
    ];

    if (slippage !== undefined) {
      parts.push(`(slippage: ${slippage.toFixed(2)}%)`);
    }

    if (priceImpact !== undefined && priceImpact > 0.5) {
      parts.push(`[⚠️ Price impact: ${priceImpact.toFixed(2)}%]`);
    }

    return parts.join(' ');
  }
}

/**
 * Singleton instance
 */
let instance: CurveParser | null = null;

export function getCurveParser(): CurveParser {
  if (!instance) {
    instance = new CurveParser();
  }
  return instance;
}
