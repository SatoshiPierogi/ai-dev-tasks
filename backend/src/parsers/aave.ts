/**
 * Aave V3 Parser
 * Parses Aave deposit, withdraw, borrow, and repay events
 */

import { NormalizedTransaction } from '../services/normalizer';
import { ParsedTransaction, Protocol, TransactionType } from './types';
import { BaseParser } from './base';

// ============================================================================
// AAVE PARSER
// ============================================================================

export class AaveParser extends BaseParser {
  constructor() {
    super(Protocol.AAVE);
  }

  /**
   * Check if this parser can handle the transaction
   */
  canHandle(normalized: NormalizedTransaction): boolean {
    return normalized.protocol.toLowerCase().includes('aave');
  }

  /**
   * Parse an Aave transaction
   */
  parse(normalized: NormalizedTransaction): ParsedTransaction | null {
    try {
      const action = normalized.action_type.toLowerCase();

      if (action === 'deposit' || action === 'stake') {
        return this.parseDeposit(normalized);
      } else if (action === 'withdraw') {
        return this.parseWithdraw(normalized);
      } else if (action === 'borrow') {
        return this.parseBorrow(normalized);
      } else if (action === 'repay') {
        return this.parseRepay(normalized);
      }

      // Default: return as custom type
      return this.buildParsedTransaction(
        normalized,
        TransactionType.CUSTOM,
        `Aave ${action}`,
        {
          shortDescription: `${action} on Aave V3`,
        }
      );
    } catch (error) {
      console.error('Error parsing Aave transaction:', error);
      return null;
    }
  }

  /**
   * Parse a deposit transaction
   */
  private parseDeposit(normalized: NormalizedTransaction): ParsedTransaction | null {
    try {
      if (normalized.tokens_in.length === 0) {
        return null;
      }

      const tokenIn = normalized.tokens_in[0];
      const amount = this.parseDecimalAmount(tokenIn.amount, tokenIn.decimals);

      // Get aToken if available
      const aTokenOut = normalized.tokens_out[0];
      const aTokenSymbol = aTokenOut?.symbol || `a${tokenIn.symbol}`;

      const description = `Deposited ${this.abbreviate(amount)} ${tokenIn.symbol} to Aave V3 (received ${this.abbreviate(amount)} ${aTokenSymbol})`;

      return this.buildParsedTransaction(
        normalized,
        TransactionType.DEPOSIT,
        description,
        {
          shortDescription: `Deposited ${this.abbreviate(amount)} ${tokenIn.symbol} to Aave`,
          details: {
            aToken: aTokenSymbol,
            interestRateMode: this.getMetadataValue(normalized.metadata, 'interestRateMode'),
            onBehalfOf: this.getMetadataValue(normalized.metadata, 'onBehalfOf'),
          },
        }
      );
    } catch (error) {
      console.error('Error parsing Aave deposit:', error);
      return null;
    }
  }

  /**
   * Parse a withdraw transaction
   */
  private parseWithdraw(normalized: NormalizedTransaction): ParsedTransaction | null {
    try {
      if (normalized.tokens_out.length === 0) {
        return null;
      }

      const tokenOut = normalized.tokens_out[0];
      const amount = this.parseDecimalAmount(tokenOut.amount, tokenOut.decimals);

      // Get aToken that was burned
      const aTokenIn = normalized.tokens_in[0];
      const aTokenSymbol = aTokenIn?.symbol || `a${tokenOut.symbol}`;

      const description = `Withdrew ${this.abbreviate(amount)} ${tokenOut.symbol} from Aave V3 (burned ${this.abbreviate(amount)} ${aTokenSymbol})`;

      return this.buildParsedTransaction(
        normalized,
        TransactionType.WITHDRAW,
        description,
        {
          shortDescription: `Withdrew ${this.abbreviate(amount)} ${tokenOut.symbol} from Aave`,
          details: {
            aToken: aTokenSymbol,
            onBehalfOf: this.getMetadataValue(normalized.metadata, 'onBehalfOf'),
          },
        }
      );
    } catch (error) {
      console.error('Error parsing Aave withdraw:', error);
      return null;
    }
  }

  /**
   * Parse a borrow transaction
   */
  private parseBorrow(normalized: NormalizedTransaction): ParsedTransaction | null {
    try {
      if (normalized.tokens_out.length === 0) {
        return null;
      }

      const tokenOut = normalized.tokens_out[0];
      const amount = this.parseDecimalAmount(tokenOut.amount, tokenOut.decimals);

      // Get interest rate mode
      const interestRateMode = this.getMetadataValue(normalized.metadata, 'interestRateMode');
      const rateType = interestRateMode === 1 ? 'stable' : 'variable';

      const description = `Borrowed ${this.abbreviate(amount)} ${tokenOut.symbol} from Aave V3 at ${rateType} rate`;

      return this.buildParsedTransaction(
        normalized,
        TransactionType.BORROW,
        description,
        {
          shortDescription: `Borrowed ${this.abbreviate(amount)} ${tokenOut.symbol} from Aave (${rateType})`,
          details: {
            interestRate: this.getMetadataValue(normalized.metadata, 'interestRate'),
            interestRateMode: rateType,
            onBehalfOf: this.getMetadataValue(normalized.metadata, 'onBehalfOf'),
            stableRateSlope: this.getMetadataValue(normalized.metadata, 'stableRateSlope'),
          },
        }
      );
    } catch (error) {
      console.error('Error parsing Aave borrow:', error);
      return null;
    }
  }

  /**
   * Parse a repay transaction
   */
  private parseRepay(normalized: NormalizedTransaction): ParsedTransaction | null {
    try {
      if (normalized.tokens_in.length === 0) {
        return null;
      }

      const tokenIn = normalized.tokens_in[0];
      const amount = this.parseDecimalAmount(tokenIn.amount, tokenIn.decimals);

      // Check if it's a full repay
      const isFullRepay = normalized.metadata?.isFullRepay === true;

      const description = isFullRepay
        ? `Repaid full debt of ${tokenIn.symbol} on Aave V3`
        : `Repaid ${this.abbreviate(amount)} ${tokenIn.symbol} on Aave V3`;

      return this.buildParsedTransaction(
        normalized,
        TransactionType.REPAY,
        description,
        {
          shortDescription: `Repaid ${this.abbreviate(amount)} ${tokenIn.symbol} on Aave`,
          details: {
            isFullRepay,
            onBehalfOf: this.getMetadataValue(normalized.metadata, 'onBehalfOf'),
            interestRateMode: this.getMetadataValue(normalized.metadata, 'interestRateMode'),
          },
        }
      );
    } catch (error) {
      console.error('Error parsing Aave repay:', error);
      return null;
    }
  }
}

/**
 * Singleton instance
 */
let instance: AaveParser | null = null;

export function getAaveParser(): AaveParser {
  if (!instance) {
    instance = new AaveParser();
  }
  return instance;
}
