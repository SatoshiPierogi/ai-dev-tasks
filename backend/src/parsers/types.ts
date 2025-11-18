/**
 * Parser Types & Interfaces
 * Defines unified types for transaction parsing across all protocols
 */

import { NormalizedTransaction, TokenInfo } from '../services/normalizer';

// ============================================================================
// ENUMS
// ============================================================================

export enum TransactionType {
  SWAP = 'swap',
  TRANSFER = 'transfer',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  BORROW = 'borrow',
  REPAY = 'repay',
  ADD_LIQUIDITY = 'add_liquidity',
  REMOVE_LIQUIDITY = 'remove_liquidity',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  VOTE = 'vote',
  BRIDGE = 'bridge',
  CUSTOM = 'custom',
}

export enum Protocol {
  UNISWAP = 'uniswap_v3',
  AAVE = 'aave_v3',
  CURVE = 'curve',
  BALANCER = 'balancer_v2',
  ETHEREUM = 'ethereum',
  UNKNOWN = 'unknown',
}

// ============================================================================
// PARSED TRANSACTION
// ============================================================================

export interface ParsedToken {
  address?: string;
  symbol: string;
  name?: string;
  decimals: number;
  amount: string; // Raw amount (with decimals)
  amountFormatted?: string; // Human-readable amount
  usdValue?: number; // USD value if available
  percentage?: number; // Percentage of total (for LP operations)
}

export interface ParsedTransaction {
  // Core identification
  tx_hash: string;
  protocol: Protocol;
  type: TransactionType;
  agent_address: string;
  timestamp: string;

  // Transaction details
  tokens_in: ParsedToken[];
  tokens_out: ParsedToken[];

  // Parsed information
  description: string; // Human-readable description
  shortDescription?: string; // Brief one-liner
  details?: {
    priceImpact?: number;
    slippage?: number;
    executionPrice?: string;
    minimumReceived?: string;
    platformFee?: string;
    liquidityPoolAddress?: string;
    liquidityPoolName?: string;
    spotPrice?: string;
    [key: string]: any;
  };

  // Additional context
  metadata: Record<string, any>;
  normalizedTransaction: NormalizedTransaction;

  // Verification status
  verified: boolean;
  verificationProof?: {
    tx_hash: string;
    block_number: number;
    block_timestamp: number;
    event_logs: Array<{
      address: string;
      topics: string[];
      data: string;
    }>;
    status: 'success' | 'failed';
  };
}

// ============================================================================
// PARSER INTERFACE
// ============================================================================

export interface TransactionParser {
  /**
   * Parse a normalized transaction into a structured parsed transaction
   */
  parse(normalized: NormalizedTransaction): ParsedTransaction | null;

  /**
   * Get protocol this parser handles
   */
  getProtocol(): Protocol;

  /**
   * Check if this parser can handle the transaction
   */
  canHandle(normalized: NormalizedTransaction): boolean;
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

export interface TokenFormatterOptions {
  precision?: number;
  includeSymbol?: boolean;
  abbreviate?: boolean;
}

export interface AmountFormatter {
  /**
   * Format amount with decimals
   */
  formatAmount(amount: string, decimals: number, options?: TokenFormatterOptions): string;

  /**
   * Convert raw amount to decimal amount
   */
  toDecimalAmount(rawAmount: string, decimals: number): string;

  /**
   * Convert decimal amount to raw amount
   */
  toRawAmount(decimalAmount: string, decimals: number): string;

  /**
   * Format token value with symbol
   */
  formatTokenValue(token: ParsedToken, options?: TokenFormatterOptions): string;

  /**
   * Abbreviate large numbers (e.g., 1234567 → 1.23M)
   */
  abbreviateNumber(num: number | string): string;
}

// ============================================================================
// PARSER ERROR
// ============================================================================

export class ParserError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ParserError';
  }
}
