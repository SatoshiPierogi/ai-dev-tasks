/**
 * Token Utilities Tests
 * Tests for token metadata, decimal conversions, and formatting
 */

import {
  TokenResolver,
  AmountFormatterImpl,
  formatAmount,
  toDecimalAmount,
  toRawAmount,
  abbreviateNumber,
} from './tokens';

// ============================================================================
// TOKEN RESOLVER TESTS
// ============================================================================

describe('TokenResolver', () => {
  it('should get token metadata by address', () => {
    const metadata = TokenResolver.getTokenMetadata('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');

    expect(metadata).toBeDefined();
    expect(metadata?.symbol).toBe('USDC');
    expect(metadata?.decimals).toBe(6);
    expect(metadata?.name).toBe('USD Coin');
  });

  it('should return null for unknown token', () => {
    const metadata = TokenResolver.getTokenMetadata('0xffffffffffffffffffffffffffffffffffffffff');
    expect(metadata).toBeNull();
  });

  it('should handle case-insensitive addresses', () => {
    const metadata1 = TokenResolver.getTokenMetadata('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    const metadata2 = TokenResolver.getTokenMetadata('0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48');

    expect(metadata1).toEqual(metadata2);
  });

  it('should get token decimals', () => {
    const decimals = TokenResolver.getDecimals('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    expect(decimals).toBe(6);
  });

  it('should default to 18 decimals for unknown tokens', () => {
    const decimals = TokenResolver.getDecimals('0xffffffffffffffffffffffffffffffffffffffff');
    expect(decimals).toBe(18);
  });

  it('should get token symbol', () => {
    const symbol = TokenResolver.getSymbol('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    expect(symbol).toBe('USDC');
  });

  it('should return UNKNOWN for unknown token symbol', () => {
    const symbol = TokenResolver.getSymbol('0xffffffffffffffffffffffffffffffffffffffff');
    expect(symbol).toBe('UNKNOWN');
  });

  it('should get token name', () => {
    const name = TokenResolver.getName('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    expect(name).toBe('USD Coin');
  });

  it('should get ETH metadata', () => {
    const metadata = TokenResolver.getTokenMetadata('0x0000000000000000000000000000000000000000');
    expect(metadata?.symbol).toBe('ETH');
    expect(metadata?.decimals).toBe(18);
  });

  it('should get multiple token metadata', () => {
    const addresses = [
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      '0x0000000000000000000000000000000000000000',
      '0xffffffffffffffffffffffffffffffffffffffff',
    ];

    const metadata = TokenResolver.getTokens(addresses);
    expect(metadata).toHaveLength(3);
    expect(metadata[0]?.symbol).toBe('USDC');
    expect(metadata[1]?.symbol).toBe('ETH');
    expect(metadata[2]).toBeNull();
  });
});

// ============================================================================
// DECIMAL CONVERSION TESTS
// ============================================================================

describe('AmountFormatterImpl.toDecimalAmount', () => {
  it('should convert raw amount to decimal (18 decimals)', () => {
    const result = AmountFormatterImpl.toDecimalAmount('1000000000000000000', 18);
    expect(result).toBe('1');
  });

  it('should convert raw amount to decimal (6 decimals)', () => {
    const result = AmountFormatterImpl.toDecimalAmount('1000000', 6);
    expect(result).toBe('1');
  });

  it('should convert raw amount to decimal (8 decimals)', () => {
    const result = AmountFormatterImpl.toDecimalAmount('100000000', 8);
    expect(result).toBe('1');
  });

  it('should handle fractional amounts', () => {
    const result = AmountFormatterImpl.toDecimalAmount('500000000000000000', 18);
    expect(result).toBe('0.5');
  });

  it('should handle very small amounts', () => {
    const result = AmountFormatterImpl.toDecimalAmount('1', 18);
    expect(result).toBe('0.000000000000000001');
  });

  it('should handle zero decimals', () => {
    const result = AmountFormatterImpl.toDecimalAmount('1000', 0);
    expect(result).toBe('1000');
  });

  it('should handle zero amount', () => {
    const result = AmountFormatterImpl.toDecimalAmount('0', 18);
    expect(result).toBe('0');
  });

  it('should handle empty string as zero', () => {
    const result = AmountFormatterImpl.toDecimalAmount('', 18);
    expect(result).toBe('0');
  });

  it('should strip leading zeros', () => {
    const result = AmountFormatterImpl.toDecimalAmount('0001000000000000000000', 18);
    expect(result).toBe('1');
  });
});

describe('AmountFormatterImpl.toRawAmount', () => {
  it('should convert decimal amount to raw (18 decimals)', () => {
    const result = AmountFormatterImpl.toRawAmount('1', 18);
    expect(result).toBe('1000000000000000000');
  });

  it('should convert decimal amount to raw (6 decimals)', () => {
    const result = AmountFormatterImpl.toRawAmount('1', 6);
    expect(result).toBe('1000000');
  });

  it('should handle fractional amounts', () => {
    const result = AmountFormatterImpl.toRawAmount('0.5', 18);
    expect(result).toBe('500000000000000000');
  });

  it('should handle very small amounts', () => {
    const result = AmountFormatterImpl.toRawAmount('0.000000000000000001', 18);
    expect(result).toBe('1');
  });

  it('should handle zero decimals', () => {
    const result = AmountFormatterImpl.toRawAmount('1000', 0);
    expect(result).toBe('1000');
  });

  it('should round to correct decimals', () => {
    const result = AmountFormatterImpl.toRawAmount('1.123456789', 6);
    expect(result).toBe('1123456');
  });
});

// ============================================================================
// AMOUNT FORMATTING TESTS
// ============================================================================

describe('AmountFormatterImpl.formatAmount', () => {
  it('should format amount with default precision', () => {
    const result = AmountFormatterImpl.formatAmount('1000000000000000000', 18);
    expect(result).toBe('1');
  });

  it('should format amount with custom precision', () => {
    const result = AmountFormatterImpl.formatAmount('1234567890000000000', 18, { precision: 2 });
    expect(result).toBe('1.23');
  });

  it('should format with locale-specific separator', () => {
    const result = AmountFormatterImpl.formatAmount('1000000000000000000000', 18, { precision: 0 });
    expect(result).toBe('1,000');
  });

  it('should abbreviate large numbers', () => {
    const result = AmountFormatterImpl.formatAmount('1000000000000000000000', 18, { abbreviate: true });
    expect(result).toBe('1M');
  });

  it('should handle very small numbers', () => {
    const result = AmountFormatterImpl.formatAmount('1', 18);
    expect(result).toBe('<0.0001');
  });

  it('should handle zero amount', () => {
    const result = AmountFormatterImpl.formatAmount('0', 18);
    expect(result).toBe('0');
  });

  it('should format USDC amount', () => {
    const result = AmountFormatterImpl.formatAmount('2500000000', 6, { precision: 2 });
    expect(result).toBe('2,500');
  });
});

describe('AmountFormatterImpl.formatTokenValue', () => {
  it('should format token value with symbol', () => {
    const result = AmountFormatterImpl.formatTokenValue('ETH', '1000000000000000000', 18);
    expect(result).toBe('1 ETH');
  });

  it('should format token value without symbol', () => {
    const result = AmountFormatterImpl.formatTokenValue(
      'ETH',
      '1000000000000000000',
      18,
      { includeSymbol: false }
    );
    expect(result).toBe('1');
  });

  it('should format USDC token value', () => {
    const result = AmountFormatterImpl.formatTokenValue('USDC', '2500000000', 6, { precision: 2 });
    expect(result).toBe('2,500 USDC');
  });
});

// ============================================================================
// ABBREVIATION TESTS
// ============================================================================

describe('AmountFormatterImpl.abbreviateNumber', () => {
  it('should abbreviate billions', () => {
    const result = AmountFormatterImpl.abbreviateNumber(1234567890);
    expect(result).toBe('1.23B');
  });

  it('should abbreviate millions', () => {
    const result = AmountFormatterImpl.abbreviateNumber(1234567);
    expect(result).toBe('1.23M');
  });

  it('should abbreviate thousands', () => {
    const result = AmountFormatterImpl.abbreviateNumber(1234);
    expect(result).toBe('1.23K');
  });

  it('should not abbreviate small numbers', () => {
    const result = AmountFormatterImpl.abbreviateNumber(123);
    expect(result).toBe('123.00');
  });

  it('should handle string numbers', () => {
    const result = AmountFormatterImpl.abbreviateNumber('1234567');
    expect(result).toBe('1.23M');
  });

  it('should handle negative numbers', () => {
    const result = AmountFormatterImpl.abbreviateNumber(-1234567);
    expect(result).toBe('-1.23M');
  });

  it('should handle zero', () => {
    const result = AmountFormatterImpl.abbreviateNumber(0);
    expect(result).toBe('0');
  });

  it('should handle NaN gracefully', () => {
    const result = AmountFormatterImpl.abbreviateNumber(NaN);
    expect(result).toBe('0');
  });

  it('should remove trailing zeros', () => {
    const result = AmountFormatterImpl.abbreviateNumber(1000000);
    expect(result).toBe('1M');
  });

  it('should remove trailing zeros for thousands', () => {
    const result = AmountFormatterImpl.abbreviateNumber(1000);
    expect(result).toBe('1K');
  });
});

// ============================================================================
// EXPORTED FUNCTION TESTS
// ============================================================================

describe('Exported utility functions', () => {
  it('formatAmount should work', () => {
    const result = formatAmount('1000000000000000000', 18);
    expect(result).toBe('1');
  });

  it('toDecimalAmount should work', () => {
    const result = toDecimalAmount('1000000000000000000', 18);
    expect(result).toBe('1');
  });

  it('toRawAmount should work', () => {
    const result = toRawAmount('1', 18);
    expect(result).toBe('1000000000000000000');
  });

  it('abbreviateNumber should work', () => {
    const result = abbreviateNumber(1234567);
    expect(result).toBe('1.23M');
  });

  it('formatTokenValue should work', () => {
    const result = formatAmount('1000000000000000000', 18);
    expect(result).toBe('1');
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge cases', () => {
  it('should handle very large amounts', () => {
    const largeAmount = '99999999999999999999999999999999';
    const result = AmountFormatterImpl.toDecimalAmount(largeAmount, 18);
    expect(result).toBeDefined();
    expect(result).not.toBe('0');
  });

  it('should handle precision loss gracefully', () => {
    const result = AmountFormatterImpl.formatAmount('123456789123456789', 18, { precision: 20 });
    expect(result).toBeDefined();
  });

  it('should handle conversion round-trip', () => {
    const original = '1234567890';
    const decimals = 6;

    const toDecimal = AmountFormatterImpl.toDecimalAmount(original, decimals);
    const backToRaw = AmountFormatterImpl.toRawAmount(toDecimal, decimals);

    expect(backToRaw).toBe('1234567890');
  });

  it('should handle undefined token addresses', () => {
    const result = TokenResolver.getTokenMetadata(undefined);
    expect(result).toBeNull();
  });
});
