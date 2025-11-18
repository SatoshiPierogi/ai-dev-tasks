/**
 * Transaction Parser Registry
 * Main interface for parsing transactions across all protocols
 */

import { NormalizedTransaction } from '../services/normalizer';
import { ParsedTransaction, TransactionParser, Protocol } from './types';
import { UniswapParser, getUniswapParser } from './uniswap';
import { AaveParser, getAaveParser } from './aave';
import { CurveParser, getCurveParser } from './curve';
import { BalancerParser, getBalancerParser } from './balancer';

// ============================================================================
// PARSER REGISTRY
// ============================================================================

export class TransactionParserRegistry {
  private parsers: Map<Protocol, TransactionParser> = new Map();

  constructor() {
    this.registerDefaultParsers();
  }

  /**
   * Register default protocol parsers
   */
  private registerDefaultParsers(): void {
    this.register(Protocol.UNISWAP, getUniswapParser());
    this.register(Protocol.AAVE, getAaveParser());
    this.register(Protocol.CURVE, getCurveParser());
    this.register(Protocol.BALANCER, getBalancerParser());
  }

  /**
   * Register a parser for a protocol
   */
  register(protocol: Protocol, parser: TransactionParser): void {
    this.parsers.set(protocol, parser);
  }

  /**
   * Get parser for protocol
   */
  getParser(protocol: Protocol): TransactionParser | undefined {
    return this.parsers.get(protocol);
  }

  /**
   * Find the right parser for a normalized transaction
   */
  findParser(normalized: NormalizedTransaction): TransactionParser | undefined {
    // Try to find a parser that can handle this transaction
    for (const parser of this.parsers.values()) {
      if (parser.canHandle(normalized)) {
        return parser;
      }
    }
    return undefined;
  }

  /**
   * Parse a normalized transaction to a parsed transaction
   */
  parse(normalized: NormalizedTransaction): ParsedTransaction | null {
    const parser = this.findParser(normalized);
    if (!parser) {
      console.warn(`No parser found for protocol: ${normalized.protocol}`);
      return null;
    }

    return parser.parse(normalized);
  }

  /**
   * Parse multiple normalized transactions
   */
  parseMultiple(transactions: NormalizedTransaction[]): (ParsedTransaction | null)[] {
    return transactions.map((tx) => this.parse(tx));
  }

  /**
   * Get all registered protocols
   */
  getProtocols(): Protocol[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * Check if a protocol is supported
   */
  isSupported(protocol: Protocol): boolean {
    return this.parsers.has(protocol);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: TransactionParserRegistry | null = null;

export function getParserRegistry(): TransactionParserRegistry {
  if (!instance) {
    instance = new TransactionParserRegistry();
  }
  return instance;
}

export function resetParserRegistry(): void {
  instance = null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { UniswapParser, AaveParser, CurveParser, BalancerParser };
export { TransactionParser, ParsedTransaction, Protocol, TransactionType, ParserError } from './types';
export { BaseParser } from './base';
