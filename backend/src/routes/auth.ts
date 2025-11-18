/**
 * Authentication Routes
 * POST /api/auth/challenge - Get authentication challenge
 * POST /api/auth/verify - Verify signature and get JWT token
 * POST /api/auth/refresh - Refresh JWT token
 * POST /api/auth/logout - Revoke JWT token
 */

import { Router, Response } from 'express';
import {
  generateChallenge,
  verifySignature,
  generateToken,
  refreshToken,
  blacklistToken,
  isValidEthereumAddress,
} from '../services/auth';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

// ============================================================================
// TYPES
// ============================================================================

interface ChallengeRequest {
  walletAddress: string;
}

interface ChallengeResponse {
  success: boolean;
  message: string;
  timestamp: number;
}

interface VerifyRequest {
  walletAddress: string;
  message: string;
  signature: string;
  timestamp: number;
}

interface VerifyResponse {
  success: boolean;
  token?: string;
  expiresIn?: number;
  error?: string;
  code?: string;
}

interface RefreshRequest {
  token?: string;
}

interface RefreshResponse {
  success: boolean;
  token?: string;
  expiresIn?: number;
  error?: string;
  code?: string;
}

interface LogoutResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
}

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = Router();

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * POST /api/auth/challenge
 * Generate an authentication challenge for the user to sign
 *
 * Request body:
 * {
 *   "walletAddress": "0x..."
 * }
 *
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Challenge message to sign...",
 *   "timestamp": 1234567890
 * }
 *
 * Response (400):
 * {
 *   "success": false,
 *   "error": "Invalid wallet address",
 *   "code": "INVALID_WALLET"
 * }
 */
router.post('/challenge', (req, res: Response<ChallengeResponse>) => {
  try {
    const { walletAddress } = req.body as ChallengeRequest;

    // Validate wallet address
    if (!walletAddress || !isValidEthereumAddress(walletAddress)) {
      res.status(400).json({
        success: false,
        message: 'Invalid wallet address',
      } as any);
      return;
    }

    // Generate challenge
    const challenge = generateChallenge();

    res.json({
      success: true,
      message: challenge.message,
      timestamp: challenge.timestamp,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate challenge',
    } as any);
  }
});

/**
 * POST /api/auth/verify
 * Verify signed message and issue JWT token
 *
 * Request body:
 * {
 *   "walletAddress": "0x...",
 *   "message": "Challenge message...",
 *   "signature": "0x...",
 *   "timestamp": 1234567890
 * }
 *
 * Response (200):
 * {
 *   "success": true,
 *   "token": "eyJhbGc...",
 *   "expiresIn": 3600
 * }
 *
 * Response (401):
 * {
 *   "success": false,
 *   "error": "Invalid signature",
 *   "code": "INVALID_SIGNATURE"
 * }
 */
router.post('/verify', (req, res: Response<VerifyResponse>) => {
  try {
    const { walletAddress, message, signature, timestamp } = req.body as VerifyRequest;

    // Validate request
    if (!walletAddress || !message || !signature || timestamp === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    if (!isValidEthereumAddress(walletAddress)) {
      res.status(400).json({
        success: false,
        error: 'Invalid wallet address',
        code: 'INVALID_WALLET',
      });
      return;
    }

    // Verify signature
    const verificationResult = verifySignature(message, signature, timestamp);

    if (!verificationResult.valid || !verificationResult.address) {
      res.status(401).json({
        success: false,
        error: verificationResult.error || 'Signature verification failed',
        code: 'INVALID_SIGNATURE',
      });
      return;
    }

    // Check that recovered address matches provided address
    if (verificationResult.address.toLowerCase() !== walletAddress.toLowerCase()) {
      res.status(401).json({
        success: false,
        error: 'Signature does not match wallet address',
        code: 'SIGNATURE_MISMATCH',
      });
      return;
    }

    // Generate JWT token
    const token = generateToken(walletAddress);
    const expiresIn = 3600; // 1 hour

    res.json({
      success: true,
      token,
      expiresIn,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to verify signature',
      code: 'VERIFICATION_ERROR',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token with new expiry
 * Requires: Authorization header with valid JWT
 *
 * Response (200):
 * {
 *   "success": true,
 *   "token": "eyJhbGc...",
 *   "expiresIn": 3600
 * }
 *
 * Response (401):
 * {
 *   "success": false,
 *   "error": "Invalid or expired token",
 *   "code": "INVALID_TOKEN"
 * }
 */
router.post('/refresh', authMiddleware, (req: AuthenticatedRequest, res: Response<RefreshResponse>) => {
  try {
    if (!req.token) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    // Refresh token
    const result = refreshToken(req.token);

    if (!result) {
      res.status(401).json({
        success: false,
        error: 'Failed to refresh token',
        code: 'REFRESH_FAILED',
      });
      return;
    }

    res.json({
      success: true,
      token: result.token,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Token refresh error',
      code: 'REFRESH_ERROR',
    });
  }
});

/**
 * POST /api/auth/logout
 * Revoke current JWT token
 * Requires: Authorization header with valid JWT
 *
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 *
 * Response (401):
 * {
 *   "success": false,
 *   "error": "Authentication required",
 *   "code": "UNAUTHORIZED"
 * }
 */
router.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response<LogoutResponse>) => {
  try {
    if (!req.token) {
      res.status(401).json({
        success: false,
        error: 'No token to revoke',
        code: 'NO_TOKEN',
      });
      return;
    }

    // Add token to blacklist
    blacklistToken(req.token);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_ERROR',
    });
  }
});

/**
 * GET /api/auth/verify (health check)
 * Verify current session is valid
 * Requires: Authorization header with valid JWT
 *
 * Response (200):
 * {
 *   "success": true,
 *   "walletAddress": "0x...",
 *   "expiresIn": 1234
 * }
 *
 * Response (401):
 * {
 *   "success": false,
 *   "error": "Invalid token"
 * }
 */
router.get('/verify', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
      return;
    }

    // Calculate remaining time
    const expiresIn = req.user.exp - Math.floor(Date.now() / 1000);

    res.json({
      success: true,
      walletAddress: req.user.walletAddress,
      expiresIn: Math.max(0, expiresIn),
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
});

export default router;
