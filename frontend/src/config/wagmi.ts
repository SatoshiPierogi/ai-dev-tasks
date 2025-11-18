/**
 * Wagmi Configuration
 * Sets up Wagmi with Viem for wallet connection and signing
 * Supports: MetaMask, WalletConnect, Coinbase, Injected wallets
 */

import { http, createConfig } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// ============================================================================
// WAGMI CONFIG
// ============================================================================

/**
 * Create Wagmi configuration with support for multiple chains and connectors
 * Supports: Ethereum mainnet and Sepolia testnet
 */
export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    // MetaMask and other injected wallets
    injected(),

    // WalletConnect (supports mobile wallets and other chains)
    walletConnect({
      projectId: process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID || '',
    }),

    // Coinbase Wallet
    coinbaseWallet({
      appName: 'Agent Audit Dashboard',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

// ============================================================================
// CHAIN CONFIGURATION
// ============================================================================

export const SUPPORTED_CHAINS = {
  mainnet: mainnet.id,
  sepolia: sepolia.id,
};

export const DEFAULT_CHAIN = mainnet.id;

export const CHAIN_NAMES: Record<number, string> = {
  [mainnet.id]: 'Ethereum Mainnet',
  [sepolia.id]: 'Sepolia Testnet',
};

// ============================================================================
// CONNECTOR LABELS
// ============================================================================

export const CONNECTOR_LABELS = {
  metamask: 'MetaMask',
  walletConnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
  injected: 'Browser Wallet',
};

// ============================================================================
// SIGNING CONFIGURATION
// ============================================================================

/**
 * EIP-191 message prefix for personal_sign
 * Used for authentication challenge signing
 */
export const EIP191_PREFIX = 'Agent Audit Dashboard\n';

/**
 * Maximum age of authentication challenge in seconds
 */
export const CHALLENGE_MAX_AGE_SECONDS = 300; // 5 minutes

// ============================================================================
// API CONFIGURATION
// ============================================================================

/**
 * Backend API base URL
 */
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Authentication endpoints
 */
export const AUTH_ENDPOINTS = {
  challenge: `${API_BASE_URL}/auth/challenge`,
  verify: `${API_BASE_URL}/auth/verify`,
  refresh: `${API_BASE_URL}/auth/refresh`,
  logout: `${API_BASE_URL}/auth/logout`,
  verifySession: `${API_BASE_URL}/auth/verify`,
};

// ============================================================================
// TOKEN STORAGE
// ============================================================================

/**
 * LocalStorage keys for authentication
 */
export const STORAGE_KEYS = {
  token: 'auth_token',
  expiresAt: 'auth_expires_at',
  walletAddress: 'auth_wallet_address',
  refreshTokenTimestamp: 'auth_refresh_timestamp',
};

/**
 * Token refresh margin (refresh before expiry)
 * Refresh token 5 minutes before it expires
 */
export const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet first',
  INVALID_CHAIN: 'Please switch to a supported chain (Mainnet or Sepolia)',
  SIGNATURE_REJECTED: 'Signature request was rejected',
  SIGNATURE_INVALID: 'Invalid signature received from wallet',
  CHALLENGE_EXPIRED: 'Authentication challenge expired. Please try again.',
  TOKEN_EXPIRED: 'Session expired. Please sign in again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  AUTH_FAILED: 'Authentication failed. Please try again.',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if address is valid Ethereum address
 */
export function isValidAddress(address: string | undefined): boolean {
  return Boolean(address && /^0x[0-9a-f]{40}$/i.test(address));
}

/**
 * Shorten address for display (0x1234...5678)
 */
export function shortenAddress(address: string | undefined): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get chain name by ID
 */
export function getChainName(chainId: number | undefined): string {
  return chainId ? CHAIN_NAMES[chainId] || `Chain ${chainId}` : 'Unknown Chain';
}
