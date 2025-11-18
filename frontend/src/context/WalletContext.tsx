/**
 * Wallet Context
 * Manages wallet connection, authentication, and session state
 * Provides hooks for components to access wallet and auth data
 */

import React, { createContext, useCallback, useEffect, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import {
  AUTH_ENDPOINTS,
  STORAGE_KEYS,
  TOKEN_REFRESH_MARGIN_MS,
  CHALLENGE_MAX_AGE_SECONDS,
  ERROR_MESSAGES,
  isValidAddress,
} from '../config/wagmi';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthToken {
  token: string;
  expiresAt: number;
}

export interface AuthenticationState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  expiresAt: number | null;
  walletAddress: string | null;
}

export interface WalletContextType {
  // Authentication state
  authState: AuthenticationState;

  // Wallet connection
  walletAddress: string | undefined;
  isConnected: boolean;

  // Authentication actions
  authenticate: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;

  // Utilities
  getToken: () => string | null;
  isSessionValid: () => boolean;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [authState, setAuthState] = useState<AuthenticationState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    token: null,
    expiresAt: null,
    walletAddress: null,
  });

  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // ============================================================================
  // INITIALIZATION - Load token from localStorage
  // ============================================================================

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.token);
    const storedExpiresAt = localStorage.getItem(STORAGE_KEYS.expiresAt);
    const storedWalletAddress = localStorage.getItem(STORAGE_KEYS.walletAddress);

    if (storedToken && storedExpiresAt) {
      const expiresAt = parseInt(storedExpiresAt, 10);
      const now = Date.now();

      // Check if token is still valid
      if (expiresAt > now) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          token: storedToken,
          expiresAt,
          walletAddress: storedWalletAddress,
        });

        // Schedule token refresh
        scheduleTokenRefresh(expiresAt);
      } else {
        // Token expired, clear storage
        clearAuthStorage();
      }
    }
  }, []);

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  /**
   * Schedule automatic token refresh before expiry
   */
  const scheduleTokenRefresh = useCallback((expiresAt: number) => {
    // Clear existing timer
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // Refresh token before it expires (with margin)
    const refreshIn = Math.max(0, timeUntilExpiry - TOKEN_REFRESH_MARGIN_MS);

    const timer = setTimeout(() => {
      refreshSession().catch((error) => {
        console.error('Token refresh failed:', error);
        clearAuthStorage();
      });
    }, refreshIn);

    setRefreshTimer(timer);
  }, [refreshTimer]);

  /**
   * Clear authentication from storage
   */
  const clearAuthStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.expiresAt);
    localStorage.removeItem(STORAGE_KEYS.walletAddress);
    localStorage.removeItem(STORAGE_KEYS.refreshTokenTimestamp);

    if (refreshTimer) {
      clearTimeout(refreshTimer);
      setRefreshTimer(null);
    }

    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null,
      expiresAt: null,
      walletAddress: null,
    });
  }, [refreshTimer]);

  /**
   * Save authentication token to localStorage
   */
  const saveAuthToken = useCallback((token: string, expiresIn: number, walletAddress: string) => {
    const expiresAt = Date.now() + expiresIn * 1000;

    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.expiresAt, expiresAt.toString());
    localStorage.setItem(STORAGE_KEYS.walletAddress, walletAddress);

    setAuthState({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      token,
      expiresAt,
      walletAddress,
    });

    // Schedule refresh
    scheduleTokenRefresh(expiresAt);
  }, [scheduleTokenRefresh]);

  // ============================================================================
  // AUTHENTICATION FLOW
  // ============================================================================

  /**
   * Authenticate user by signing challenge message
   */
  const authenticate = useCallback(async () => {
    try {
      if (!isConnected || !address) {
        throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
      }

      if (!isValidAddress(address)) {
        throw new Error('Invalid wallet address');
      }

      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Step 1: Get challenge from backend
      const challengeResponse = await fetch(AUTH_ENDPOINTS.challenge, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to get challenge');
      }

      const { message, timestamp } = await challengeResponse.json();

      // Step 2: Sign challenge with wallet
      let signature: string;
      try {
        signature = await signMessageAsync({ message });
      } catch (error) {
        throw new Error(ERROR_MESSAGES.SIGNATURE_REJECTED);
      }

      if (!signature) {
        throw new Error(ERROR_MESSAGES.SIGNATURE_INVALID);
      }

      // Step 3: Verify signature on backend and get JWT
      const verifyResponse = await fetch(AUTH_ENDPOINTS.verify, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          message,
          signature,
          timestamp,
        }),
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || 'Signature verification failed');
      }

      const { token, expiresIn } = await verifyResponse.json();

      // Save token and update state
      saveAuthToken(token, expiresIn, address);

      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
      }));

      throw error;
    }
  }, [isConnected, address, signMessageAsync, saveAuthToken]);

  /**
   * Refresh current session token
   */
  const refreshSession = useCallback(async () => {
    try {
      const token = authState.token;

      if (!token) {
        throw new Error('No active session');
      }

      const refreshResponse = await fetch(AUTH_ENDPOINTS.refresh, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!refreshResponse.ok) {
        throw new Error('Token refresh failed');
      }

      const { token: newToken, expiresIn } = await refreshResponse.json();

      if (authState.walletAddress) {
        saveAuthToken(newToken, expiresIn, authState.walletAddress);
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      clearAuthStorage();
      throw error;
    }
  }, [authState.token, authState.walletAddress, saveAuthToken, clearAuthStorage]);

  /**
   * Logout user and revoke token
   */
  const logout = useCallback(async () => {
    try {
      const token = authState.token;

      if (token) {
        // Notify backend to blacklist token
        await fetch(AUTH_ENDPOINTS.logout, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {
          // Logout on backend failed, but continue with client logout
        });
      }

      clearAuthStorage();

      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        token: null,
        expiresAt: null,
        walletAddress: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      clearAuthStorage();
    }
  }, [authState.token, clearAuthStorage]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get current valid token, or null if expired
   */
  const getToken = useCallback(() => {
    if (!authState.token || !authState.expiresAt) {
      return null;
    }

    if (Date.now() > authState.expiresAt) {
      clearAuthStorage();
      return null;
    }

    return authState.token;
  }, [authState.token, authState.expiresAt, clearAuthStorage]);

  /**
   * Check if session is valid and not expired
   */
  const isSessionValid = useCallback(() => {
    return authState.isAuthenticated && getToken() !== null;
  }, [authState.isAuthenticated, getToken]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [refreshTimer]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue: WalletContextType = {
    authState,
    walletAddress: address,
    isConnected,
    authenticate,
    logout,
    refreshSession,
    getToken,
    isSessionValid,
  };

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Hook to use wallet context
 */
export function useWallet(): WalletContextType {
  const context = React.useContext(WalletContext);

  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }

  return context;
}

/**
 * Hook to access current auth token
 */
export function useAuthToken(): string | null {
  const { getToken } = useWallet();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getToken());
  }, [getToken]);

  return token;
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { authState } = useWallet();
  return authState.isAuthenticated;
}

/**
 * Hook to access wallet address
 */
export function useWalletAddress(): string | undefined {
  const { walletAddress } = useWallet();
  return walletAddress;
}

/**
 * Hook to access authentication state
 */
export function useAuthState(): AuthenticationState {
  const { authState } = useWallet();
  return authState;
}
