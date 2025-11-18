/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user context to requests
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, SessionTokenPayload } from '../services/auth';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Extended Express Request with authenticated user context
 */
export interface AuthenticatedRequest extends Request {
  user?: SessionTokenPayload;
  token?: string;
}

// ============================================================================
// MIDDLEWARE IMPLEMENTATIONS
// ============================================================================

/**
 * Main authentication middleware
 * Validates JWT token from Authorization header
 * Attaches decoded token to request.user
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'Missing authorization header',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    // Parse Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      res.status(401).json({
        success: false,
        error: 'Invalid authorization header format',
        code: 'INVALID_TOKEN_FORMAT',
      });
      return;
    }

    const token = parts[1];

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Attach user context and token to request
    req.user = decoded;
    req.token = token;

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication middleware error',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Optional authentication middleware
 * Does not fail if token is missing, but validates if present
 * Useful for endpoints that work with or without authentication
 */
export function optionalAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');

      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        const token = parts[1];
        const decoded = verifyToken(token);

        if (decoded) {
          req.user = decoded;
          req.token = token;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without user context
    next();
  }
}

/**
 * Require specific user roles (extensible for future use)
 * Currently just ensures authentication, can be extended for role-based access
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  next();
}

// ============================================================================
// WALLET-SCOPED DATA ACCESS MIDDLEWARE
// ============================================================================

/**
 * Validate that user owns a specific agent
 * Used to prevent unauthorized access to other users' agents
 */
export function validateAgentOwnership(
  ownerWalletAddress: string | null | undefined,
  requestWalletAddress: string | undefined
): boolean {
  // Normalize addresses for comparison (case-insensitive)
  const ownerNormalized = ownerWalletAddress?.toLowerCase();
  const requestNormalized = requestWalletAddress?.toLowerCase();

  return ownerNormalized === requestNormalized;
}

/**
 * Middleware to ensure user can only access their own agents
 * Checks query parameter or route parameter for agent_id and verifies ownership
 */
export function walletScopedAccessMiddleware(agentOwnerField: string = 'ownerAddress') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Get agent owner from request context (should be set by route handler)
      const agentOwner = (req as any)[agentOwnerField];

      if (agentOwner && !validateAgentOwnership(agentOwner, req.user.walletAddress)) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to access this resource',
          code: 'FORBIDDEN',
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Access control check failed',
        code: 'ACCESS_CONTROL_ERROR',
      });
    }
  };
}

/**
 * Validate that user wallet matches request parameter
 * Useful for endpoints like POST /agents/:walletAddress/create
 */
export function validateWalletParameter(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const requestedWallet = req.params.walletAddress;

    if (!validateAgentOwnership(requestedWallet, req.user.walletAddress)) {
      res.status(403).json({
        success: false,
        error: 'Wallet address mismatch',
        code: 'WALLET_MISMATCH',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Wallet validation failed',
      code: 'WALLET_VALIDATION_ERROR',
    });
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Authentication error handler
 * Catches authentication errors and returns appropriate HTTP response
 */
export function authErrorHandler(err: Error, req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const message = err.message || 'Authentication error';

  if (message.includes('jwt')) {
    res.status(401).json({
      success: false,
      error: 'Invalid authentication token',
      code: 'JWT_ERROR',
    });
    return;
  }

  if (message.includes('expired')) {
    res.status(401).json({
      success: false,
      error: 'Token has expired',
      code: 'TOKEN_EXPIRED',
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: message,
    code: 'AUTH_ERROR',
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if request is authenticated
 */
export function isAuthenticated(req: AuthenticatedRequest): boolean {
  return Boolean(req.user && req.token);
}

/**
 * Get authenticated user's wallet address
 */
export function getUserWalletAddress(req: AuthenticatedRequest): string | undefined {
  return req.user?.walletAddress;
}

/**
 * Get authenticated user's ID (if available)
 */
export function getUserId(req: AuthenticatedRequest): number | undefined {
  return req.user?.userId;
}

/**
 * Get authenticated user's token
 */
export function getUserToken(req: AuthenticatedRequest): string | undefined {
  return req.token;
}
