/**
 * Base Parser
 * Abstract base class for protocol-specific parsers
 */

import { NormalizedTransaction } from '../services/normalizer';
import { ParsedToken, ParsedTransaction, Protocol, TransactionParser, TransactionType, ParserError } from './types';
import { TokenResolver, AmountFormatterImpl } from '../utils/tokens';

// ============================================================================
// BASE PARSER
// ============================================================================

export abstract class BaseParser implements TransactionParser {
  protected protocol: Protocol;

  constructor(protocol: Protocol) {
    this.protocol = protocol;
  }

  /**
   * Get protocol this parser handles
   */
  getProtocol(): Protocol {
    return this.protocol;
  }

  /**
   * Check if this parser can handle the transaction
   */
  abstract canHandle(normalized: NormalizedTransaction): boolean;

  /**
   * Parse a normalized transaction into a structured parsed transaction
   */
  abstract parse(normalized: NormalizedTransaction): ParsedTransaction | null;

  /**
   * Helper: Convert token info to parsed token
   */
  protected convertToken(token: any, symbolOverride?: string): ParsedToken {
    const symbol = symbolOverride || token.symbol || 'UNKNOWN';
    const decimals = token.decimals || 18;
    const address = token.address;

    // Get metadata
    const metadata = TokenResolver.getTokenMetadata(address);

    // Format amount
    const formatted = AmountFormatterImpl.formatAmount(token.amount, decimals, { precision: 6 });

    return {
      address,
      symbol,
      name: metadata?.name,
      decimals,
      amount: token.amount,
      amountFormatted: formatted,
    };
  }

  /**
   * Helper: Parse decimal amount
   */
  protected parseDecimalAmount(rawAmount: string, decimals: number): string {
    return AmountFormatterImpl.toDecimalAmount(rawAmount, decimals);
  }

  /**
   * Helper: Format token value
   */
  protected formatTokenValue(symbol: string, amount: string, decimals: number): string {
    return AmountFormatterImpl.formatTokenValue(symbol, amount, decimals, { includeSymbol: false });
  }

  /**
   * Helper: Abbreviate large numbers
   */
  protected abbreviate(num: number | string): string {
    return AmountFormatterImpl.abbreviateNumber(num);
  }

  /**
   * Helper: Validate required metadata fields
   */
  protected validateMetadata(metadata: Record<string, any>, requiredFields: string[]): boolean {
    for (const field of requiredFields) {
      if (!(field in metadata)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Helper: Safe metadata access
   */
  protected getMetadataValue(metadata: Record<string, any>, path: string, defaultValue?: any): any {
    const keys = path.split('.');
    let value = metadata;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Helper: Build parsed transaction
   */
  protected buildParsedTransaction(
    normalized: NormalizedTransaction,
    type: TransactionType,
    description: string,
    options?: {
      shortDescription?: string;
      details?: Record<string, any>;
    }
  ): ParsedTransaction {
    return {
      tx_hash: normalized.tx_hash,
      protocol: this.protocol,
      type,
      agent_address: normalized.agent_address,
      timestamp: normalized.timestamp,
      tokens_in: normalized.tokens_in.map((t) => this.convertToken(t)),
      tokens_out: normalized.tokens_out.map((t) => this.convertToken(t)),
      description,
      shortDescription: options?.shortDescription,
      details: options?.details,
      metadata: normalized.metadata,
      normalizedTransaction: normalized,
      verified: false,
    };
  }

  /**
   * Helper: Create parser error
   */
  protected error(code: string, message: string, context?: Record<string, any>): ParserError {
    return new ParserError(code, message, context);
  }
}
