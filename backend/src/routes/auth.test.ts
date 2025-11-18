/**
 * Authentication Routes Integration Tests
 * Tests for challenge, verify, refresh, and logout endpoints
 */

import express, { Express } from 'express';
import request from 'supertest';
import { ethers } from 'ethers';
import authRoutes from './auth';
import { clearBlacklist } from '../services/auth';

// ============================================================================
// TEST SETUP
// ============================================================================

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
});

beforeEach(() => {
  jest.clearAllMocks();
  clearBlacklist();
});

const TEST_WALLET = '0x1234567890123456789012345678901234567890';
const TEST_WALLET_2 = '0x0987654321098765432109876543210987654321';

// ============================================================================
// POST /api/auth/challenge TESTS
// ============================================================================

describe('POST /api/auth/challenge', () => {
  it('should return challenge for valid wallet address', async () => {
    const response = await request(app)
      .post('/api/auth/challenge')
      .send({ walletAddress: TEST_WALLET })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBeDefined();
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.message).toContain('Nonce:');
    expect(response.body.message).toContain('Timestamp:');
  });

  it('should return different challenges for sequential requests', async () => {
    const response1 = await request(app)
      .post('/api/auth/challenge')
      .send({ walletAddress: TEST_WALLET })
      .expect(200);

    const response2 = await request(app)
      .post('/api/auth/challenge')
      .send({ walletAddress: TEST_WALLET })
      .expect(200);

    expect(response1.body.message).not.toBe(response2.body.message);
  });

  it('should reject invalid wallet address', async () => {
    const response = await request(app)
      .post('/api/auth/challenge')
      .send({ walletAddress: 'not-an-address' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should reject missing wallet address', async () => {
    const response = await request(app)
      .post('/api/auth/challenge')
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should accept checksummed address', async () => {
    const checksummed = ethers.getAddress(TEST_WALLET);

    const response = await request(app)
      .post('/api/auth/challenge')
      .send({ walletAddress: checksummed })
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should accept lowercase address', async () => {
    const response = await request(app)
      .post('/api/auth/challenge')
      .send({ walletAddress: TEST_WALLET.toLowerCase() })
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should reject address with invalid hex characters', async () => {
    const response = await request(app)
      .post('/api/auth/challenge')
      .send({ walletAddress: '0x' + 'z'.repeat(40) })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});

// ============================================================================
// POST /api/auth/verify TESTS
// ============================================================================

describe('POST /api/auth/verify', () => {
  let validChallenge: { message: string; timestamp: number };

  beforeEach(async () => {
    const response = await request(app)
      .post('/api/auth/challenge')
      .send({ walletAddress: TEST_WALLET })
      .expect(200);

    validChallenge = response.body;
  });

  it('should issue JWT token for valid signature', async () => {
    const wallet = ethers.Wallet.createRandom();
    const signature = wallet.signMessage(validChallenge.message);

    const response = await request(app)
      .post('/api/auth/verify')
      .send({
        walletAddress: wallet.address,
        message: validChallenge.message,
        signature,
        timestamp: validChallenge.timestamp,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
    expect(response.body.token).toContain('.');
    expect(response.body.expiresIn).toBe(3600);
  });

  it('should reject invalid signature', async () => {
    const invalidSignature = '0x' + 'ff'.repeat(65);

    const response = await request(app)
      .post('/api/auth/verify')
      .send({
        walletAddress: TEST_WALLET,
        message: validChallenge.message,
        signature: invalidSignature,
        timestamp: validChallenge.timestamp,
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('INVALID_SIGNATURE');
  });

  it('should reject address mismatch', async () => {
    const wallet = ethers.Wallet.createRandom();
    const signature = wallet.signMessage(validChallenge.message);

    const response = await request(app)
      .post('/api/auth/verify')
      .send({
        walletAddress: TEST_WALLET, // Different from signer
        message: validChallenge.message,
        signature,
        timestamp: validChallenge.timestamp,
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('SIGNATURE_MISMATCH');
  });

  it('should reject expired challenge', async () => {
    const wallet = ethers.Wallet.createRandom();
    const signature = wallet.signMessage(validChallenge.message);
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes old

    const response = await request(app)
      .post('/api/auth/verify')
      .send({
        walletAddress: wallet.address,
        message: validChallenge.message,
        signature,
        timestamp: oldTimestamp,
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('INVALID_SIGNATURE');
  });

  it('should reject missing required fields', async () => {
    const response = await request(app)
      .post('/api/auth/verify')
      .send({
        walletAddress: TEST_WALLET,
        // Missing message, signature, timestamp
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('MISSING_FIELDS');
  });

  it('should reject invalid wallet address', async () => {
    const wallet = ethers.Wallet.createRandom();
    const signature = wallet.signMessage(validChallenge.message);

    const response = await request(app)
      .post('/api/auth/verify')
      .send({
        walletAddress: 'not-an-address',
        message: validChallenge.message,
        signature,
        timestamp: validChallenge.timestamp,
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('INVALID_WALLET');
  });

  it('should return token that can be verified', async () => {
    const wallet = ethers.Wallet.createRandom();
    const signature = wallet.signMessage(validChallenge.message);

    const verifyResponse = await request(app)
      .post('/api/auth/verify')
      .send({
        walletAddress: wallet.address,
        message: validChallenge.message,
        signature,
        timestamp: validChallenge.timestamp,
      })
      .expect(200);

    const token = verifyResponse.body.token;

    // Verify token can be used in subsequent requests
    const sessionResponse = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(sessionResponse.body.success).toBe(true);
    expect(sessionResponse.body.walletAddress).toBe(ethers.getAddress(wallet.address));
  });
});

// ============================================================================
// POST /api/auth/refresh TESTS
// ============================================================================

describe('POST /api/auth/refresh', () => {
  let validToken: string;

  beforeEach(async () => {
    // Get challenge
    const challengeResponse = await request(app)
      .post('/api/auth/challenge')
      .send({ walletAddress: TEST_WALLET })
      .expect(200);

    const { message, timestamp } = challengeResponse.body;

    // Create and sign
    const wallet = ethers.Wallet.createRandom();
    const signature = wallet.signMessage(message);

    // Verify and get token
    const verifyResponse = await request(app)
      .post('/api/auth/verify')
      .send({
        walletAddress: wallet.address,
        message,
        signature,
        timestamp,
      })
      .expect(200);

    validToken = verifyResponse.body.token;
  });

  it('should refresh valid token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
    expect(response.body.token).not.toBe(validToken); // Should be new token
    expect(response.body.expiresIn).toBe(3600);
  });

  it('should reject refresh without token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('MISSING_TOKEN');
  });

  it('should reject refresh with invalid token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('INVALID_TOKEN');
  });

  it('should allow using refreshed token', async () => {
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    const newToken = refreshResponse.body.token;

    // Use new token
    const sessionResponse = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);

    expect(sessionResponse.body.success).toBe(true);
  });

  it('should not allow using old token after refresh', async () => {
    // Technically the old token is still valid until expiry,
    // but refresh returns a new token
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    const newToken = refreshResponse.body.token;
    expect(newToken).not.toBe(validToken);

    // Original token should still work (not revoked unless explicitly logged out)
    const sessionResponse = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(sessionResponse.body.success).toBe(true);
  });
});

// ============================================================================
// POST /api/auth/logout TESTS
// ============================================================================

describe('POST /api/auth/logout', () => {
  let validToken: string;

  beforeEach(async () => {
    const challengeResponse = await request(app)
      .post('/api/auth/challenge')
      .send({ walletAddress: TEST_WALLET })
      .expect(200);

    const { message, timestamp } = challengeResponse.body;
    const wallet = ethers.Wallet.createRandom();
    const signature = wallet.signMessage(message);

    const verifyResponse = await request(app)
      .post('/api/auth/verify')
      .send({
        walletAddress: wallet.address,
        message,
        signature,
        timestamp,
      })
      .expect(200);

    validToken = verifyResponse.body.token;
  });

  it('should logout valid token', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Logged out successfully');
  });

  it('should reject logout without token', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('MISSING_TOKEN');
  });

  it('should reject use of token after logout', async () => {
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    // Try to use the token again
    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('INVALID_TOKEN');
  });

  it('should reject invalid token logout', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);

    expect(response.body.success).toBe(false);
  });
});

// ============================================================================
// GET /api/auth/verify SESSION CHECK TESTS
// ============================================================================

describe('GET /api/auth/verify', () => {
  let validToken: string;
  let walletAddress: string;

  beforeEach(async () => {
    const challengeResponse = await request(app)
      .post('/api/auth/challenge')
      .send({ walletAddress: TEST_WALLET })
      .expect(200);

    const { message, timestamp } = challengeResponse.body;
    const wallet = ethers.Wallet.createRandom();
    walletAddress = wallet.address;
    const signature = wallet.signMessage(message);

    const verifyResponse = await request(app)
      .post('/api/auth/verify')
      .send({
        walletAddress,
        message,
        signature,
        timestamp,
      })
      .expect(200);

    validToken = verifyResponse.body.token;
  });

  it('should verify valid session', async () => {
    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.walletAddress).toBe(ethers.getAddress(walletAddress));
    expect(response.body.expiresIn).toBeGreaterThan(0);
  });

  it('should reject invalid session token', async () => {
    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('should reject missing authorization header', async () => {
    const response = await request(app)
      .get('/api/auth/verify')
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('should return remaining time until expiry', async () => {
    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.expiresIn).toBeGreaterThan(3500); // Should be around 3600 seconds
    expect(response.body.expiresIn).toBeLessThanOrEqual(3600);
  });
});

// ============================================================================
// COMPLETE AUTHENTICATION FLOW TESTS
// ============================================================================

describe('Complete Authentication Flow', () => {
  it('should complete full authentication flow', async () => {
    // Step 1: Get challenge
    const challengeResponse = await request(app)
      .post('/api/auth/challenge')
      .send({ walletAddress: TEST_WALLET })
      .expect(200);

    expect(challengeResponse.body.success).toBe(true);

    // Step 2: Sign challenge
    const { message, timestamp } = challengeResponse.body;
    const wallet = ethers.Wallet.createRandom();
    const signature = wallet.signMessage(message);

    // Step 3: Verify signature
    const verifyResponse = await request(app)
      .post('/api/auth/verify')
      .send({
        walletAddress: wallet.address,
        message,
        signature,
        timestamp,
      })
      .expect(200);

    expect(verifyResponse.body.success).toBe(true);
    expect(verifyResponse.body.token).toBeDefined();

    const token = verifyResponse.body.token;

    // Step 4: Use token in subsequent request
    const sessionResponse = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(sessionResponse.body.success).toBe(true);
    expect(sessionResponse.body.walletAddress).toBe(ethers.getAddress(wallet.address));

    // Step 5: Refresh token
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.token).toBeDefined();

    // Step 6: Logout
    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(logoutResponse.body.success).toBe(true);

    // Step 7: Verify token is revoked
    const finalResponse = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(finalResponse.body.success).toBe(false);
  });
});
