/**
 * Authentication Service Tests
 * Tests for signature verification, JWT token generation, and session management
 */

import {
  generateChallenge,
  isValidChallenge,
  verifySignature,
  generateToken,
  verifyToken,
  refreshToken,
  blacklistToken,
  isTokenBlacklisted,
  clearBlacklist,
  getBlacklistSize,
  isValidEthereumAddress,
  normalizeAddress,
  verifyMultiWalletSignatures,
  verifyHmacSignature,
} from './auth';
import { ethers } from 'ethers';

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
const TEST_WALLET_ADDRESS_2 = '0x0987654321098765432109876543210987654321';
const TEST_USER_ID = 123;

/**
 * Helper function to create a valid signed message
 */
function createSignedMessage(message: string, wallet: string = TEST_WALLET_ADDRESS): string {
  const messageHash = ethers.hashMessage(message);
  // Create a deterministic signature for testing
  // In real scenarios, this would come from wallet.signMessage()
  const sig = ethers.SigningKey.generate().sign(messageHash);
  return sig.serialized;
}

/**
 * Helper function to get recovered address from message and signature
 */
function getRecoveredAddress(message: string, signature: string): string {
  const messageHash = ethers.hashMessage(message);
  return ethers.recoverAddress(messageHash, signature);
}

// ============================================================================
// CHALLENGE GENERATION TESTS
// ============================================================================

describe('Challenge Generation', () => {
  it('should generate a valid challenge', () => {
    const challenge = generateChallenge();

    expect(challenge).toBeDefined();
    expect(challenge.message).toBeDefined();
    expect(challenge.timestamp).toBeDefined();
    expect(typeof challenge.message).toBe('string');
    expect(typeof challenge.timestamp).toBe('number');
  });

  it('should include nonce in challenge message', () => {
    const challenge = generateChallenge();

    expect(challenge.message).toContain('Nonce:');
  });

  it('should include timestamp in challenge message', () => {
    const challenge = generateChallenge();

    expect(challenge.message).toContain('Timestamp:');
  });

  it('should validate valid challenge timestamp', () => {
    const challenge = generateChallenge();

    expect(isValidChallenge(challenge.timestamp)).toBe(true);
  });

  it('should reject expired challenge timestamp', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago

    expect(isValidChallenge(oldTimestamp)).toBe(false);
  });

  it('should reject very old challenge timestamp', () => {
    const veryOldTimestamp = Math.floor(Date.now() / 1000) - 86400; // 24 hours ago

    expect(isValidChallenge(veryOldTimestamp)).toBe(false);
  });

  it('should generate different challenges on each call', () => {
    const challenge1 = generateChallenge();
    const challenge2 = generateChallenge();

    // Messages should be different (different nonce)
    expect(challenge1.message).not.toBe(challenge2.message);
  });
});

// ============================================================================
// SIGNATURE VERIFICATION TESTS
// ============================================================================

describe('Signature Verification', () => {
  it('should verify valid signature from known wallet', () => {
    const challenge = generateChallenge();
    const message = challenge.message;

    // Create a wallet and sign the message
    const wallet = ethers.Wallet.createRandom();
    const signature = wallet.signMessage(message);

    const result = verifySignature(message, signature, challenge.timestamp);

    expect(result.valid).toBe(true);
    expect(result.address).toBe(ethers.getAddress(wallet.address));
    expect(result.error).toBeUndefined();
  });

  it('should return normalized checksummed address', () => {
    const challenge = generateChallenge();
    const message = challenge.message;
    const wallet = ethers.Wallet.createRandom();
    const signature = wallet.signMessage(message);

    const result = verifySignature(message, signature, challenge.timestamp);

    expect(result.address).toMatch(/^0x[0-9A-Fa-f]{40}$/);
    expect(ethers.isAddress(result.address!)).toBe(true);
  });

  it('should reject invalid signature', () => {
    const challenge = generateChallenge();
    const message = challenge.message;
    const invalidSignature = '0x' + 'ff'.repeat(65);

    const result = verifySignature(message, invalidSignature, challenge.timestamp);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject expired challenge', () => {
    const wallet = ethers.Wallet.createRandom();
    const message = 'Test message';
    const signature = wallet.signMessage(message);
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600;

    const result = verifySignature(message, signature, oldTimestamp);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Challenge expired');
  });

  it('should reject signature with wrong message', () => {
    const challenge = generateChallenge();
    const wallet = ethers.Wallet.createRandom();
    const signature = wallet.signMessage(challenge.message);

    // Try to verify with different message
    const result = verifySignature('Different message', signature, challenge.timestamp);

    expect(result.valid).toBe(false);
  });

  it('should reject malformed signature', () => {
    const challenge = generateChallenge();
    const malformedSignature = '0xmalformed';

    const result = verifySignature(challenge.message, malformedSignature, challenge.timestamp);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// JWT TOKEN TESTS
// ============================================================================

describe('JWT Token Generation and Validation', () => {
  it('should generate a valid JWT token', () => {
    const token = generateToken(TEST_WALLET_ADDRESS);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT format: header.payload.signature
  });

  it('should verify valid token', () => {
    const token = generateToken(TEST_WALLET_ADDRESS, TEST_USER_ID);
    const decoded = verifyToken(token);

    expect(decoded).toBeDefined();
    expect(decoded?.walletAddress).toBe(ethers.getAddress(TEST_WALLET_ADDRESS));
    expect(decoded?.userId).toBe(TEST_USER_ID);
    expect(decoded?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should include iat claim', () => {
    const token = generateToken(TEST_WALLET_ADDRESS);
    const decoded = verifyToken(token);

    expect(decoded?.iat).toBeDefined();
    expect(decoded?.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
  });

  it('should normalize wallet address in token', () => {
    const lowercaseAddress = TEST_WALLET_ADDRESS.toLowerCase();
    const token = generateToken(lowercaseAddress);
    const decoded = verifyToken(token);

    expect(decoded?.walletAddress).toBe(ethers.getAddress(TEST_WALLET_ADDRESS));
  });

  it('should reject invalid token', () => {
    const invalidToken = 'invalid.token.here';
    const decoded = verifyToken(invalidToken);

    expect(decoded).toBeNull();
  });

  it('should reject empty token', () => {
    const decoded = verifyToken('');

    expect(decoded).toBeNull();
  });

  it('should generate tokens with different contents', () => {
    const token1 = generateToken(TEST_WALLET_ADDRESS);
    const token2 = generateToken(TEST_WALLET_ADDRESS_2);

    expect(token1).not.toBe(token2);
    expect(verifyToken(token1)?.walletAddress).not.toBe(verifyToken(token2)?.walletAddress);
  });

  it('should set correct expiry time', () => {
    const expirySeconds = 7200; // 2 hours
    const beforeGeneration = Math.floor(Date.now() / 1000);
    const token = generateToken(TEST_WALLET_ADDRESS, undefined, expirySeconds);
    const afterGeneration = Math.floor(Date.now() / 1000);

    const decoded = verifyToken(token);

    expect(decoded?.exp).toBeGreaterThanOrEqual(beforeGeneration + expirySeconds);
    expect(decoded?.exp).toBeLessThanOrEqual(afterGeneration + expirySeconds + 1);
  });

  it('should reject expired token', async () => {
    // Generate token with 0 second expiry
    const token = generateToken(TEST_WALLET_ADDRESS, undefined, 0);

    // Wait for token to expire
    await new Promise((resolve) => setTimeout(resolve, 100));

    const decoded = verifyToken(token);

    expect(decoded).toBeNull();
  });
});

// ============================================================================
// TOKEN REFRESH TESTS
// ============================================================================

describe('Token Refresh', () => {
  it('should refresh valid token with new expiry', () => {
    const originalToken = generateToken(TEST_WALLET_ADDRESS, TEST_USER_ID);
    const result = refreshToken(originalToken);

    expect(result).toBeDefined();
    expect(result?.token).toBeDefined();
    expect(result?.expiresIn).toBeDefined();
    expect(result?.token).not.toBe(originalToken); // Should be a new token
  });

  it('should maintain wallet address after refresh', () => {
    const originalToken = generateToken(TEST_WALLET_ADDRESS, TEST_USER_ID);
    const refreshResult = refreshToken(originalToken);

    const originalDecoded = verifyToken(originalToken);
    const refreshedDecoded = verifyToken(refreshResult?.token || '');

    expect(originalDecoded?.walletAddress).toBe(refreshedDecoded?.walletAddress);
    expect(originalDecoded?.userId).toBe(refreshedDecoded?.userId);
  });

  it('should extend token expiry', () => {
    const originalToken = generateToken(TEST_WALLET_ADDRESS, undefined, 600); // 10 minutes
    const originalDecoded = verifyToken(originalToken);

    const refreshResult = refreshToken(originalToken, 3600); // 1 hour
    const refreshedDecoded = verifyToken(refreshResult?.token || '');

    expect(refreshedDecoded?.exp).toBeGreaterThan(originalDecoded?.exp!);
  });

  it('should reject refresh of invalid token', () => {
    const result = refreshToken('invalid.token.here');

    expect(result).toBeNull();
  });

  it('should reject refresh of expired token', async () => {
    const token = generateToken(TEST_WALLET_ADDRESS, undefined, 0);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = refreshToken(token);

    expect(result).toBeNull();
  });
});

// ============================================================================
// TOKEN BLACKLIST TESTS
// ============================================================================

describe('Token Blacklist', () => {
  beforeEach(() => {
    clearBlacklist();
  });

  it('should add token to blacklist', () => {
    const token = generateToken(TEST_WALLET_ADDRESS);

    blacklistToken(token);

    expect(isTokenBlacklisted(token)).toBe(true);
  });

  it('should prevent verification of blacklisted token', () => {
    const token = generateToken(TEST_WALLET_ADDRESS);

    blacklistToken(token);
    const decoded = verifyToken(token);

    expect(decoded).toBeNull();
  });

  it('should verify non-blacklisted token', () => {
    const token1 = generateToken(TEST_WALLET_ADDRESS);
    const token2 = generateToken(TEST_WALLET_ADDRESS_2);

    blacklistToken(token1);

    expect(isTokenBlacklisted(token1)).toBe(true);
    expect(isTokenBlacklisted(token2)).toBe(false);
    expect(verifyToken(token2)).toBeDefined();
  });

  it('should handle blacklist size', () => {
    const token1 = generateToken(TEST_WALLET_ADDRESS);
    const token2 = generateToken(TEST_WALLET_ADDRESS_2);

    blacklistToken(token1);
    blacklistToken(token2);

    expect(getBlacklistSize()).toBe(2);
  });

  it('should clear blacklist', () => {
    const token = generateToken(TEST_WALLET_ADDRESS);

    blacklistToken(token);
    expect(getBlacklistSize()).toBe(1);

    clearBlacklist();
    expect(getBlacklistSize()).toBe(0);
    expect(isTokenBlacklisted(token)).toBe(false);
  });
});

// ============================================================================
// ADDRESS VALIDATION TESTS
// ============================================================================

describe('Address Validation', () => {
  it('should validate correct Ethereum address', () => {
    expect(isValidEthereumAddress(TEST_WALLET_ADDRESS)).toBe(true);
  });

  it('should validate checksummed address', () => {
    const checksummed = ethers.getAddress(TEST_WALLET_ADDRESS);
    expect(isValidEthereumAddress(checksummed)).toBe(true);
  });

  it('should reject invalid address format', () => {
    expect(isValidEthereumAddress('not-an-address')).toBe(false);
    expect(isValidEthereumAddress('0x123')).toBe(false);
    expect(isValidEthereumAddress('0x' + 'g'.repeat(40))).toBe(false);
  });

  it('should reject address without 0x prefix', () => {
    expect(isValidEthereumAddress('1234567890123456789012345678901234567890')).toBe(false);
  });

  it('should normalize valid address', () => {
    const normalized = normalizeAddress(TEST_WALLET_ADDRESS.toLowerCase());

    expect(normalized).toBe(ethers.getAddress(TEST_WALLET_ADDRESS));
  });

  it('should return null for invalid address normalization', () => {
    const normalized = normalizeAddress('invalid-address');

    expect(normalized).toBeNull();
  });
});

// ============================================================================
// MULTI-WALLET TESTS
// ============================================================================

describe('Multi-Wallet Support', () => {
  it('should verify multiple valid signatures', () => {
    const challenge = generateChallenge();
    const wallet1 = ethers.Wallet.createRandom();
    const wallet2 = ethers.Wallet.createRandom();

    const sig1 = wallet1.signMessage(challenge.message);
    const sig2 = wallet2.signMessage(challenge.message);

    const result = verifyMultiWalletSignatures(
      challenge.message,
      [
        { address: wallet1.address, signature: sig1 },
        { address: wallet2.address, signature: sig2 },
      ],
      challenge.timestamp
    );

    expect(result.valid).toBe(true);
    expect(result.addresses).toHaveLength(2);
    expect(result.addresses).toContain(ethers.getAddress(wallet1.address));
    expect(result.addresses).toContain(ethers.getAddress(wallet2.address));
  });

  it('should reject if any signature is invalid', () => {
    const challenge = generateChallenge();
    const wallet1 = ethers.Wallet.createRandom();

    const sig1 = wallet1.signMessage(challenge.message);
    const invalidSig = '0x' + 'ff'.repeat(65);

    const result = verifyMultiWalletSignatures(
      challenge.message,
      [
        { address: wallet1.address, signature: sig1 },
        { address: TEST_WALLET_ADDRESS_2, signature: invalidSig },
      ],
      challenge.timestamp
    );

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle address mismatch in signatures', () => {
    const challenge = generateChallenge();
    const wallet = ethers.Wallet.createRandom();
    const signature = wallet.signMessage(challenge.message);

    // Try to verify with different address
    const result = verifyMultiWalletSignatures(
      challenge.message,
      [{ address: TEST_WALLET_ADDRESS, signature }],
      challenge.timestamp
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Address mismatch');
  });
});

// ============================================================================
// HMAC SIGNATURE TESTS
// ============================================================================

describe('HMAC Signature Verification', () => {
  const secret = 'test-secret-key';

  it('should verify valid HMAC signature', () => {
    const body = JSON.stringify({ test: 'data' });
    const signature = require('crypto')
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const result = verifyHmacSignature(body, signature, secret);

    expect(result).toBe(true);
  });

  it('should reject invalid HMAC signature', () => {
    const body = JSON.stringify({ test: 'data' });
    const invalidSignature = 'invalid-signature';

    const result = verifyHmacSignature(body, invalidSignature, secret);

    expect(result).toBe(false);
  });

  it('should reject signature with wrong body', () => {
    const body1 = JSON.stringify({ test: 'data1' });
    const body2 = JSON.stringify({ test: 'data2' });
    const signature = require('crypto')
      .createHmac('sha256', secret)
      .update(body1)
      .digest('hex');

    const result = verifyHmacSignature(body2, signature, secret);

    expect(result).toBe(false);
  });

  it('should handle Buffer input', () => {
    const body = Buffer.from(JSON.stringify({ test: 'data' }));
    const signature = require('crypto')
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const result = verifyHmacSignature(body, signature, secret);

    expect(result).toBe(true);
  });
});
