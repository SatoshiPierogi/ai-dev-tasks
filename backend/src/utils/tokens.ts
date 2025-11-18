/**
 * Token Utilities
 * Handles token metadata, decimal conversions, and formatting
 */

import { AmountFormatter, TokenFormatterOptions } from '../parsers/types';

// ============================================================================
// TOKEN METADATA
// ============================================================================

export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId?: number;
}

/**
 * Common token metadata lookup table
 * In production, this would be fetched from token lists or contract calls
 */
const COMMON_TOKENS: Record<string, TokenMetadata> = {
  // Ethereum mainnet tokens (normalized addresses)
  '0x0000000000000000000000000000000000000000': {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
  },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  },
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  '0x2260fac5e5542a773aa44fbcff9d822a3ecda7c45': {
    address: '0x2260fac5e5542a773aa44fbcff9d822a3ecda7c45',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
  },
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': {
    address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
  },
  '0x7fc66500c84a76ad7e9c93437e170724136cbb31': {
    address: '0x7fc66500c84a76ad7e9c93437e170724136cbb31',
    symbol: 'AAVE',
    name: 'Aave',
    decimals: 18,
  },
  '0x6b175474e89094c44da98b954eedeac495271d0f': {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
  },
};

// ============================================================================
// TOKEN RESOLVER
// ============================================================================

export class TokenResolver {
  /**
   * Get token metadata by address
   */
  static getTokenMetadata(address: string | undefined): TokenMetadata | null {
    if (!address) {
      return null;
    }

    const normalized = address.toLowerCase();
    return COMMON_TOKENS[normalized] || null;
  }

  /**
   * Get token decimals by address
   */
  static getDecimals(address: string | undefined): number {
    const metadata = this.getTokenMetadata(address);
    return metadata?.decimals || 18; // Default to 18 if unknown
  }

  /**
   * Get token symbol by address
   */
  static getSymbol(address: string | undefined): string {
    const metadata = this.getTokenMetadata(address);
    return metadata?.symbol || 'UNKNOWN';
  }

  /**
   * Get token name by address
   */
  static getName(address: string | undefined): string {
    const metadata = this.getTokenMetadata(address);
    return metadata?.name || 'Unknown Token';
  }

  /**
   * Register custom token metadata
   */
  static registerToken(metadata: TokenMetadata): void {
    const normalized = metadata.address.toLowerCase();
    COMMON_TOKENS[normalized] = metadata;
  }

  /**
   * Get multiple tokens metadata
   */
  static getTokens(addresses: (string | undefined)[]): (TokenMetadata | null)[] {
    return addresses.map((addr) => this.getTokenMetadata(addr));
  }
}

// ============================================================================
// AMOUNT FORMATTER
// ============================================================================

export class AmountFormatterImpl implements AmountFormatter {
  /**
   * Format amount with decimals
   */
  static formatAmount(
    amount: string,
    decimals: number,
    options: TokenFormatterOptions = {}
  ): string {
    const precision = options.precision ?? 4;

    try {
      // Convert raw amount to decimal amount
      const decimalAmount = this.toDecimalAmount(amount, decimals);

      // Parse as number
      const num = parseFloat(decimalAmount);

      // Handle edge cases
      if (isNaN(num)) {
        return '0';
      }

      if (num === 0) {
        return '0';
      }

      // For very small numbers
      if (num < 0.0001 && num > 0) {
        return `<0.0001`;
      }

      // Format with abbreviation if requested
      if (options.abbreviate) {
        return this.abbreviateNumber(num);
      }

      // Standard formatting with precision
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: precision,
      });
    } catch (error) {
      return '0';
    }
  }

  /**
   * Convert raw amount to decimal amount (e.g., "1000000000000000000" with 18 decimals → "1")
   */
  static toDecimalAmount(rawAmount: string, decimals: number): string {
    try {
      if (!rawAmount || rawAmount === '0') {
        return '0';
      }

      // Handle big numbers using string manipulation
      // Remove leading zeros
      const cleaned = rawAmount.replace(/^0+/, '') || '0';

      if (decimals === 0) {
        return cleaned;
      }

      if (cleaned === '0') {
        return '0';
      }

      // Pad the string if necessary
      if (cleaned.length <= decimals) {
        return '0.' + cleaned.padStart(decimals, '0');
      }

      // Insert decimal point at the right position
      const integer = cleaned.slice(0, -decimals);
      const fractional = cleaned.slice(-decimals);

      return integer + '.' + fractional;
    } catch (error) {
      return '0';
    }
  }

  /**
   * Convert decimal amount to raw amount (e.g., "1" with 18 decimals → "1000000000000000000")
   */
  static toRawAmount(decimalAmount: string, decimals: number): string {
    try {
      if (!decimalAmount || decimalAmount === '0') {
        return '0';
      }

      const parts = decimalAmount.split('.');
      const integer = parts[0] || '0';
      const fractional = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);

      const result = integer + fractional;
      return result.replace(/^0+/, '') || '0';
    } catch (error) {
      return '0';
    }
  }

  /**
   * Format token value with symbol
   */
  static formatTokenValue(
    symbol: string,
    amount: string,
    decimals: number,
    options: TokenFormatterOptions = {}
  ): string {
    const formatted = this.formatAmount(amount, decimals, options);

    if (options.includeSymbol !== false) {
      return `${formatted} ${symbol}`;
    }

    return formatted;
  }

  /**
   * Abbreviate large numbers (e.g., 1234567 → 1.23M)
   */
  static abbreviateNumber(num: number | string): string {
    const n = typeof num === 'string' ? parseFloat(num) : num;

    if (isNaN(n)) {
      return '0';
    }

    if (n === 0) {
      return '0';
    }

    const absN = Math.abs(n);
    const sign = n < 0 ? '-' : '';

    if (absN >= 1e9) {
      return sign + (absN / 1e9).toFixed(2).replace(/\.0+$/, '') + 'B';
    }

    if (absN >= 1e6) {
      return sign + (absN / 1e6).toFixed(2).replace(/\.0+$/, '') + 'M';
    }

    if (absN >= 1e3) {
      return sign + (absN / 1e3).toFixed(2).replace(/\.0+$/, '') + 'K';
    }

    return n.toFixed(2);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const formatAmount = AmountFormatterImpl.formatAmount.bind(AmountFormatterImpl);
export const toDecimalAmount = AmountFormatterImpl.toDecimalAmount.bind(AmountFormatterImpl);
export const toRawAmount = AmountFormatterImpl.toRawAmount.bind(AmountFormatterImpl);
export const formatTokenValue = AmountFormatterImpl.formatTokenValue.bind(AmountFormatterImpl);
export const abbreviateNumber = AmountFormatterImpl.abbreviateNumber.bind(AmountFormatterImpl);
