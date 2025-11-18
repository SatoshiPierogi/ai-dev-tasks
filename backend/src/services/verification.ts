/**
 * Transaction Verification Service
 * Verifies transactions on blockchain and generates cryptographic proofs
 */

import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import {
  VerificationStatus,
  TransactionStatus,
  VerificationResult,
  VerificationProof,
  VerificationOptions,
  DEFAULT_VERIFICATION_OPTIONS,
  buildEtherscanUrl,
  COMMON_EVENT_SIGNATURES,
} from './verification.types';
import { getRpcProviderManager, RpcProviderManager } from './rpc';

// ============================================================================
// VERIFICATION SERVICE
// ============================================================================

export class VerificationService extends EventEmitter {
  private providerManager: RpcProviderManager;
  private cache: Map<string, VerificationResult> = new Map();
  private verificationInProgress: Set<string> = new Set();

  constructor(providerManager?: RpcProviderManager) {
    super();
    this.providerManager = providerManager || getRpcProviderManager();
  }

  /**
   * Verify a transaction
   */
  async verify(txHash: string, options: VerificationOptions = {}): Promise<VerificationResult> {
    const opts = { ...DEFAULT_VERIFICATION_OPTIONS, ...options };

    // Check cache
    const cached = this.cache.get(txHash);
    if (cached && cached.status !== VerificationStatus.PENDING) {
      return cached;
    }

    // Prevent concurrent verification attempts
    if (this.verificationInProgress.has(txHash)) {
      return (
        cached || {
          tx_hash: txHash,
          status: VerificationStatus.PENDING,
          attempts: 0,
          lastAttempt: Date.now(),
        }
      );
    }

    this.verificationInProgress.add(txHash);

    try {
      const result = await this.performVerification(txHash, opts);
      this.cache.set(txHash, result);
      this.emit('verification_complete', result);
      return result;
    } catch (error) {
      const result: VerificationResult = {
        tx_hash: txHash,
        status: VerificationStatus.FAILED,
        error: {
          code: 'VERIFICATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        attempts: 1,
        lastAttempt: Date.now(),
        nextRetry: Date.now() + (opts.retryDelay || 2000),
      };

      this.cache.set(txHash, result);
      this.emit('verification_failed', result);
      return result;
    } finally {
      this.verificationInProgress.delete(txHash);
    }
  }

  /**
   * Perform the actual verification
   */
  private async performVerification(
    txHash: string,
    options: VerificationOptions
  ): Promise<VerificationResult> {
    const provider = this.providerManager.getProvider();
    const startTime = Date.now();

    try {
      // Fetch transaction receipt
      const receipt = await this.fetchTransactionReceipt(txHash, provider, options.timeout || 30000);

      if (!receipt) {
        return {
          tx_hash: txHash,
          status: VerificationStatus.PENDING,
          error: {
            code: 'RECEIPT_NOT_FOUND',
            message: 'Transaction receipt not found yet',
          },
          attempts: 1,
          lastAttempt: Date.now(),
          nextRetry: Date.now() + (options.retryDelay || 2000),
        };
      }

      // Get current block number for confirmation count
      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      // Check if we have enough confirmations
      const requiredConfirmations = options.requiredConfirmations || 12;
      if (confirmations < requiredConfirmations) {
        return {
          tx_hash: txHash,
          status: VerificationStatus.PENDING,
          error: {
            code: 'INSUFFICIENT_CONFIRMATIONS',
            message: `Only ${confirmations} confirmations, need ${requiredConfirmations}`,
            details: { confirmations, required: requiredConfirmations },
          },
          attempts: 1,
          lastAttempt: Date.now(),
          nextRetry: Date.now() + (options.retryDelay || 2000),
        };
      }

      // Verify transaction status
      const transactionStatus = receipt.status === 1 ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;

      // Fetch block for timestamp
      const block = await provider.getBlock(receipt.blockHash);
      if (!block) {
        throw new Error('Failed to fetch block');
      }

      // Generate proof
      const proof = await this.generateProof(
        txHash,
        receipt,
        transactionStatus,
        block.timestamp,
        confirmations
      );

      return {
        tx_hash: txHash,
        status: transactionStatus === TransactionStatus.SUCCESS ? VerificationStatus.VERIFIED : VerificationStatus.UNVERIFIED,
        proof,
        attempts: 1,
        lastAttempt: Date.now(),
      };
    } catch (error) {
      console.error(`Verification error for ${txHash}:`, error);

      // Try fallback provider
      const fallbackAvailable = this.providerManager.switchToFallback();

      return {
        tx_hash: txHash,
        status: VerificationStatus.FAILED,
        error: {
          code: 'RPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown RPC error',
          details: { fallbackAvailable },
        },
        attempts: 1,
        lastAttempt: Date.now(),
        nextRetry: Date.now() + (options.retryDelay || 2000),
      };
    }
  }

  /**
   * Fetch transaction receipt from RPC
   */
  private async fetchTransactionReceipt(
    txHash: string,
    provider: ethers.Provider,
    timeout: number
  ): Promise<ethers.TransactionReceipt | null> {
    try {
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeout);
      });

      const receiptPromise = provider.getTransactionReceipt(txHash);

      return (await Promise.race([receiptPromise, timeoutPromise])) as ethers.TransactionReceipt | null;
    } catch (error) {
      console.error(`Failed to fetch receipt for ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Generate cryptographic proof
   */
  private async generateProof(
    txHash: string,
    receipt: ethers.TransactionReceipt,
    status: TransactionStatus,
    blockTimestamp: number,
    confirmations: number
  ): Promise<VerificationProof> {
    // Convert logs to event logs
    const eventLogs = receipt.logs.map((log) => ({
      address: log.address,
      topics: log.topics,
      data: log.data,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      transactionIndex: log.transactionIndex,
      blockHash: log.blockHash,
      logIndex: log.logIndex,
      removed: false,
    }));

    // Extract event signatures from logs
    const eventSignatures = this.matchEventSignatures(eventLogs);

    return {
      tx_hash: txHash,
      chain: 'ethereum',
      block_number: receipt.blockNumber,
      block_hash: receipt.blockHash,
      block_timestamp: blockTimestamp,
      transaction_status: status,
      confirmations,
      event_logs: eventLogs,
      event_signatures: eventSignatures,
      gas_used: receipt.gasUsed.toString(),
      gas_price: receipt.gasPrice?.toString() || '0',
      from_address: receipt.from,
      to_address: receipt.to || undefined,
      contract_address: receipt.contractAddress || undefined,
      etherscan_url: buildEtherscanUrl(txHash, 1),
      verified_at: Date.now(),
    };
  }

  /**
   * Match event signatures in logs
   */
  private matchEventSignatures(eventLogs: any[]): any[] {
    const signatures: any[] = [];

    for (const log of eventLogs) {
      if (log.topics.length === 0) continue;

      const eventHash = log.topics[0];

      // Try to match against common signatures
      for (const [key, sig] of Object.entries(COMMON_EVENT_SIGNATURES)) {
        if (sig.hash.toLowerCase() === eventHash.toLowerCase()) {
          signatures.push(sig);
          break;
        }
      }
    }

    return signatures;
  }

  /**
   * Verify block confirmation
   */
  async verifyBlockConfirmation(txHash: string, requiredConfirmations: number = 12): Promise<boolean> {
    try {
      const provider = this.providerManager.getProvider();
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return false;
      }

      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      return confirmations >= requiredConfirmations;
    } catch (error) {
      console.error(`Error verifying confirmations for ${txHash}:`, error);
      return false;
    }
  }

  /**
   * Get cached verification result
   */
  getCachedResult(txHash: string): VerificationResult | undefined {
    return this.cache.get(txHash);
  }

  /**
   * Clear cache entry
   */
  clearCache(txHash: string): void {
    this.cache.delete(txHash);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; transactions: string[] } {
    return {
      size: this.cache.size,
      transactions: Array.from(this.cache.keys()),
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: VerificationService | null = null;

export function getVerificationService(): VerificationService {
  if (!instance) {
    instance = new VerificationService();
  }
  return instance;
}

export function resetVerificationService(): void {
  if (instance) {
    instance.removeAllListeners();
    instance.clearAllCache();
  }
  instance = null;
}
