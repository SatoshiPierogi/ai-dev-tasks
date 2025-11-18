/**
 * Authentication Middleware Tests
 * Tests for JWT validation, user context attachment, and wallet-scoped access
 */

import { Request, Response, NextFunction } from 'express';
import {
  authMiddleware,
  optionalAuthMiddleware,
  requireAuth,
  validateAgentOwnership,
  validateWalletParameter,
  walletScopedAccessMiddleware,
  AuthenticatedRequest,
  isAuthenticated,
  getUserWalletAddress,
  getUserId,
  getUserToken,
} from './auth';
import { generateToken, clearBlacklist } from '../services/auth';

// ============================================================================
// TEST SETUP
// ============================================================================

const TEST_WALLET = '0x1234567890123456789012345678901234567890';
const TEST_WALLET_2 = '0x0987654321098765432109876543210987654321';
const TEST_USER_ID = 123;

/**
 * Create mock Express response
 */
function createMockResponse(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

/**
 * Create mock Express request
 */
function createMockRequest(overrides?: Partial<Request>): AuthenticatedRequest {
  return {
    headers: {},
    params: {},
    body: {},
    ...overrides,
  } as AuthenticatedRequest;
}

// ============================================================================
// AUTH MIDDLEWARE TESTS
// ============================================================================

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearBlacklist();
  });

  describe('authMiddleware', () => {
    it('should attach user context for valid token', () => {
      const token = generateToken(TEST_WALLET, TEST_USER_ID);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.walletAddress).toBe(TEST_WALLET.toLowerCase().replace(/^0x/, '').padStart(40, '0').toLowerCase());
      expect(req.user?.userId).toBe(TEST_USER_ID);
      expect(req.token).toBe(token);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 for missing authorization header', () => {
      const req = createMockRequest({
        headers: {},
      });
      const res = createMockResponse();
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'MISSING_TOKEN',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid authorization header format', () => {
      const req = createMockRequest({
        headers: { authorization: 'InvalidFormat token' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_TOKEN_FORMAT',
        })
      );
    });

    it('should return 401 for invalid token', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid.token.here' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_TOKEN',
        })
      );
    });

    it('should handle Bearer token case-insensitively', () => {
      const token = generateToken(TEST_WALLET, TEST_USER_ID);
      const req = createMockRequest({
        headers: { authorization: `bearer ${token}` },
      });
      const res = createMockResponse();
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should handle whitespace in authorization header', () => {
      const token = generateToken(TEST_WALLET, TEST_USER_ID);
      const req = createMockRequest({
        headers: { authorization: `  Bearer   ${token}  ` },
      });
      const res = createMockResponse();
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(res.status).not.toHaveBeenCalledWith(401);
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should attach user context if valid token provided', () => {
      const token = generateToken(TEST_WALLET, TEST_USER_ID);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();
      const next = jest.fn();

      optionalAuthMiddleware(req, res, next);

      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user context if no token provided', () => {
      const req = createMockRequest({
        headers: {},
      });
      const res = createMockResponse();
      const next = jest.fn();

      optionalAuthMiddleware(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user context if invalid token provided', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid.token' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      optionalAuthMiddleware(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should handle malformed authorization header gracefully', () => {
      const req = createMockRequest({
        headers: { authorization: 'NoBearer' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      optionalAuthMiddleware(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAuth middleware', () => {
    it('should allow authenticated requests', () => {
      const token = generateToken(TEST_WALLET, TEST_USER_ID);
      const req = createMockRequest({
        user: {
          walletAddress: TEST_WALLET,
          userId: TEST_USER_ID,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated requests', () => {
      const req = createMockRequest({
        user: undefined,
      });
      const res = createMockResponse();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// WALLET-SCOPED ACCESS TESTS
// ============================================================================

describe('Wallet-Scoped Access Control', () => {
  describe('validateAgentOwnership', () => {
    it('should validate ownership of same address', () => {
      const result = validateAgentOwnership(TEST_WALLET, TEST_WALLET);

      expect(result).toBe(true);
    });

    it('should validate ownership with mixed case', () => {
      const result = validateAgentOwnership(
        TEST_WALLET.toLowerCase(),
        TEST_WALLET.toUpperCase()
      );

      expect(result).toBe(true);
    });

    it('should reject ownership of different address', () => {
      const result = validateAgentOwnership(TEST_WALLET, TEST_WALLET_2);

      expect(result).toBe(false);
    });

    it('should handle null owner', () => {
      const result = validateAgentOwnership(null, TEST_WALLET);

      expect(result).toBe(false);
    });

    it('should handle null request address', () => {
      const result = validateAgentOwnership(TEST_WALLET, undefined);

      expect(result).toBe(false);
    });

    it('should handle both null', () => {
      const result = validateAgentOwnership(null, undefined);

      expect(result).toBe(false);
    });
  });

  describe('validateWalletParameter middleware', () => {
    it('should allow request for own wallet', () => {
      const req = createMockRequest({
        user: {
          walletAddress: TEST_WALLET,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        params: { walletAddress: TEST_WALLET },
      });
      const res = createMockResponse();
      const next = jest.fn();

      validateWalletParameter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request for different wallet', () => {
      const req = createMockRequest({
        user: {
          walletAddress: TEST_WALLET,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        params: { walletAddress: TEST_WALLET_2 },
      });
      const res = createMockResponse();
      const next = jest.fn();

      validateWalletParameter(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'WALLET_MISMATCH',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', () => {
      const req = createMockRequest({
        user: undefined,
        params: { walletAddress: TEST_WALLET },
      });
      const res = createMockResponse();
      const next = jest.fn();

      validateWalletParameter(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
        })
      );
    });
  });

  describe('walletScopedAccessMiddleware', () => {
    it('should allow access to owned agent', async () => {
      const middleware = walletScopedAccessMiddleware('agentOwner');
      const req = createMockRequest({
        user: {
          walletAddress: TEST_WALLET,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        agentOwner: TEST_WALLET,
      });
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access to unowned agent', async () => {
      const middleware = walletScopedAccessMiddleware('agentOwner');
      const req = createMockRequest({
        user: {
          walletAddress: TEST_WALLET,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        agentOwner: TEST_WALLET_2,
      });
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'FORBIDDEN',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', async () => {
      const middleware = walletScopedAccessMiddleware('agentOwner');
      const req = createMockRequest({
        user: undefined,
        agentOwner: TEST_WALLET,
      });
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
        })
      );
    });
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('Helper Functions', () => {
  it('isAuthenticated should return true for authenticated request', () => {
    const req = createMockRequest({
      user: {
        walletAddress: TEST_WALLET,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      token: 'token123',
    });

    expect(isAuthenticated(req)).toBe(true);
  });

  it('isAuthenticated should return false for unauthenticated request', () => {
    const req = createMockRequest();

    expect(isAuthenticated(req)).toBe(false);
  });

  it('getUserWalletAddress should return wallet address', () => {
    const req = createMockRequest({
      user: {
        walletAddress: TEST_WALLET,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    });

    expect(getUserWalletAddress(req)).toBe(TEST_WALLET);
  });

  it('getUserWalletAddress should return undefined for unauthenticated request', () => {
    const req = createMockRequest();

    expect(getUserWalletAddress(req)).toBeUndefined();
  });

  it('getUserId should return user ID', () => {
    const req = createMockRequest({
      user: {
        walletAddress: TEST_WALLET,
        userId: TEST_USER_ID,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    });

    expect(getUserId(req)).toBe(TEST_USER_ID);
  });

  it('getUserToken should return token', () => {
    const token = 'test-token-123';
    const req = createMockRequest({
      token,
    });

    expect(getUserToken(req)).toBe(token);
  });
});
