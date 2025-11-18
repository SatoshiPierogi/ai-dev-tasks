/**
 * Authentication Service
 * Handles wallet signature verification, JWT token generation, and session management
 */

import crypto from 'crypto';
import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { ethers } from 'ethers';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ChallengeData {
  message: string;
  timestamp: number;
}

export interface SignatureVerificationResult {
  valid: boolean;
  address?: string;
  error?: string;
}

export interface SessionTokenPayload {
  walletAddress: string;
  userId?: number;
  iat: number;
  exp: number;
}

export interface TokenRefreshResult {
  token: string;
  expiresIn: number;
}

export interface TokenBlacklistEntry {
  token: string;
  expiresAt: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRY_SECONDS = parseInt(process.env.JWT_EXPIRY_SECONDS || '3600'); // 1 hour default
const CHALLENGE_EXPIRY_SECONDS = 300; // 5 minutes
const CHALLENGE_PREFIX = 'Agent Audit Dashboard Authentication\n\nPlease sign this message to authenticate:\n\n';

// Token blacklist (in production, use Redis)
const tokenBlacklist = new Map<string, TokenBlacklistEntry>();

// ============================================================================
// CHALLENGE GENERATION
// ============================================================================

/**
 * Generate an authentication challenge message
 * Uses EIP-191 format for personal_sign
 */
export function generateChallenge(): ChallengeData {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');

  const message = `${CHALLENGE_PREFIX}Nonce: ${nonce}\nTimestamp: ${timestamp}`;

  return {
    message,
    timestamp,
  };
}

/**
 * Validate that a challenge is not expired
 */
export function isValidChallenge(timestamp: number, maxAgeSeconds: number = CHALLENGE_EXPIRY_SECONDS): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime - timestamp <= maxAgeSeconds;
}

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

/**
 * Verify a signed message using EIP-191 personal_sign
 * Returns the recovered wallet address if valid
 */
export function verifySignature(
  message: string,
  signature: string,
  timestamp: number
): SignatureVerificationResult {
  try {
    // Validate challenge timestamp first
    if (!isValidChallenge(timestamp)) {
      return {
        valid: false,
        error: 'Challenge expired',
      };
    }

    // Recover address from signature
    // EIP-191 personal_sign prepends: "\x19Ethereum Signed Message:\n{length}"
    const messageHash = ethers.hashMessage(message);
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);

    // Normalize address to lowercase for consistency
    const normalizedAddress = ethers.getAddress(recoveredAddress);

    return {
      valid: true,
      address: normalizedAddress,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verify HMAC signature (used for webhook validation)
 */
export function verifyHmacSignature(
  body: string | Buffer,
  providedSignature: string,
  secret: string
): boolean {
  try {
    const bodyBuffer = typeof body === 'string' ? Buffer.from(body) : body;
    const expectedSignature = crypto.createHmac('sha256', secret).update(bodyBuffer).digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature));
  } catch (error) {
    return false;
  }
}

// ============================================================================
// JWT TOKEN MANAGEMENT
// ============================================================================

/**
 * Generate a JWT session token
 */
export function generateToken(
  walletAddress: string,
  userId?: number,
  expiresInSeconds: number = JWT_EXPIRY_SECONDS
): string {
  const payload: SessionTokenPayload = {
    walletAddress: ethers.getAddress(walletAddress), // Normalize address
    userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const options: SignOptions = {
    expiresIn: expiresInSeconds,
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): SessionTokenPayload | null {
  try {
    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return null;
    }

    const options: VerifyOptions = {};
    const decoded = jwt.verify(token, JWT_SECRET, options) as SessionTokenPayload;

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Refresh a valid JWT token with a new expiry time
 */
export function refreshToken(token: string, expiresInSeconds: number = JWT_EXPIRY_SECONDS): TokenRefreshResult | null {
  const decoded = verifyToken(token);

  if (!decoded) {
    return null;
  }

  // Generate new token with fresh expiry
  const newToken = generateToken(decoded.walletAddress, decoded.userId, expiresInSeconds);

  return {
    token: newToken,
    expiresIn: expiresInSeconds,
  };
}

// ============================================================================
// TOKEN BLACKLISTING (SESSION REVOCATION)
// ============================================================================

/**
 * Add a token to the blacklist (for logout)
 * In production, use Redis for distributed blacklist
 */
export function blacklistToken(token: string): void {
  try {
    const decoded = jwt.decode(token) as SessionTokenPayload | null;

    if (decoded && decoded.exp) {
      const expiresAt = decoded.exp * 1000; // Convert to milliseconds
      tokenBlacklist.set(token, { token, expiresAt });

      // Clean up expired entries periodically
      if (tokenBlacklist.size > 1000) {
        cleanupBlacklist();
      }
    }
  } catch (error) {
    // Token already invalid, no need to blacklist
  }
}

/**
 * Check if a token is blacklisted
 */
export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

/**
 * Remove expired entries from blacklist
 */
export function cleanupBlacklist(): void {
  const now = Date.now();

  for (const [token, entry] of tokenBlacklist.entries()) {
    if (entry.expiresAt < now) {
      tokenBlacklist.delete(token);
    }
  }
}

/**
 * Clear all blacklisted tokens (for testing)
 */
export function clearBlacklist(): void {
  tokenBlacklist.clear();
}

/**
 * Get blacklist size (for monitoring)
 */
export function getBlacklistSize(): number {
  return tokenBlacklist.size;
}

// ============================================================================
// WALLET ADDRESS VALIDATION
// ============================================================================

/**
 * Check if address is valid Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Normalize Ethereum address to checksummed format
 */
export function normalizeAddress(address: string): string | null {
  try {
    if (!isValidEthereumAddress(address)) {
      return null;
    }

    return ethers.getAddress(address);
  } catch (error) {
    return null;
  }
}

// ============================================================================
// MULTI-WALLET SUPPORT HELPERS
// ============================================================================

/**
 * Generate a multi-wallet challenge that signs across multiple addresses
 * Useful for cross-chain or multi-account authentication
 */
export function generateMultiWalletChallenge(): ChallengeData {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');

  const message = `${CHALLENGE_PREFIX}Multi-Wallet Authentication\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

  return {
    message,
    timestamp,
  };
}

/**
 * Verify multiple wallet signatures
 * Ensures multiple wallets have signed the same challenge
 */
export function verifyMultiWalletSignatures(
  message: string,
  signatures: { address: string; signature: string }[],
  timestamp: number
): { valid: boolean; addresses?: string[]; error?: string } {
  const validatedAddresses: string[] = [];
  const errors: string[] = [];

  for (const { address, signature } of signatures) {
    const result = verifySignature(message, signature, timestamp);

    if (result.valid && result.address) {
      // Verify that the recovered address matches the provided address
      if (ethers.getAddress(result.address) === ethers.getAddress(address)) {
        validatedAddresses.push(result.address);
      } else {
        errors.push(`Address mismatch for ${address}`);
      }
    } else {
      errors.push(`Invalid signature for ${address}: ${result.error}`);
    }
  }

  if (validatedAddresses.length > 0) {
    return {
      valid: true,
      addresses: validatedAddresses,
    };
  }

  return {
    valid: false,
    error: errors.join('; '),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get JWT expiry time in seconds
 */
export function getTokenExpirySeconds(): number {
  return JWT_EXPIRY_SECONDS;
}

/**
 * Get challenge expiry time in seconds
 */
export function getChallengeExpirySeconds(): number {
  return CHALLENGE_EXPIRY_SECONDS;
}

/**
 * Extract wallet address from JWT token (without verification)
 * Use verifyToken() to verify authenticity first
 */
export function extractAddressFromToken(token: string): string | null {
  try {
    const decoded = jwt.decode(token) as SessionTokenPayload | null;
    return decoded?.walletAddress || null;
  } catch (error) {
    return null;
  }
}

/**
 * Create a test token (for development/testing)
 */
export function createTestToken(walletAddress: string, userId?: number): string {
  return generateToken(walletAddress, userId);
}
