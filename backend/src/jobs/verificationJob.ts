/**
 * Verification Job
 * Background job for re-verifying transactions and checking block confirmations
 */

import { EventEmitter } from 'events';
import { getVerificationService } from '../services/verification';
import { getVerificationStateMachine } from '../services/verificationStateMachine';
import { VerificationStatus } from '../services/verification.types';

// ============================================================================
// TYPES
// ============================================================================

export interface VerificationJobConfig {
  enabled: boolean;
  interval: number; // ms between job runs
  maxRetries: number;
  retryDelay: number; // ms before retrying
  batchSize: number; // number of transactions to verify per run
  requiredConfirmations: number;
}

export interface VerificationJobStats {
  isRunning: boolean;
  totalRuns: number;
  successfulVerifications: number;
  failedVerifications: number;
  reorgDetections: number;
  lastRunTime: number;
  lastRunDuration: number;
  nextScheduledRun: number;
}

// ============================================================================
// VERIFICATION JOB
// ============================================================================

export class VerificationJob extends EventEmitter {
  private config: VerificationJobConfig;
  private verificationService = getVerificationService();
  private stateMachine = getVerificationStateMachine();
  private isRunning: boolean = false;
  private jobInterval: NodeJS.Timeout | null = null;
  private pendingTransactions: Map<string, number> = new Map(); // tx_hash → retry_count
  private stats: VerificationJobStats = {
    isRunning: false,
    totalRuns: 0,
    successfulVerifications: 0,
    failedVerifications: 0,
    reorgDetections: 0,
    lastRunTime: 0,
    lastRunDuration: 0,
    nextScheduledRun: 0,
  };

  constructor(config: Partial<VerificationJobConfig> = {}) {
    super();

    this.config = {
      enabled: true,
      interval: 60000, // 1 minute
      maxRetries: 5,
      retryDelay: 30000, // 30 seconds
      batchSize: 10,
      requiredConfirmations: 12,
      ...config,
    };
  }

  /**
   * Start the verification job
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Verification job is already running');
      return;
    }

    if (!this.config.enabled) {
      console.log('Verification job is disabled');
      return;
    }

    console.log(`Starting verification job (interval: ${this.config.interval}ms)`);

    this.isRunning = true;
    this.stats.isRunning = true;

    // Run immediately
    this.execute();

    // Schedule periodic runs
    this.jobInterval = setInterval(() => {
      this.execute();
    }, this.config.interval);

    this.emit('started', { timestamp: Date.now() });
  }

  /**
   * Stop the verification job
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.jobInterval) {
      clearInterval(this.jobInterval);
      this.jobInterval = null;
    }

    this.isRunning = false;
    this.stats.isRunning = false;

    console.log('Verification job stopped');
    this.emit('stopped', { timestamp: Date.now() });
  }

  /**
   * Add transaction for verification
   */
  addTransaction(txHash: string): void {
    if (!this.pendingTransactions.has(txHash)) {
      this.pendingTransactions.set(txHash, 0);
      this.emit('transaction_added', { txHash, timestamp: Date.now() });
    }
  }

  /**
   * Remove transaction from verification queue
   */
  removeTransaction(txHash: string): void {
    this.pendingTransactions.delete(txHash);
    this.emit('transaction_removed', { txHash, timestamp: Date.now() });
  }

  /**
   * Execute the job
   */
  private async execute(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const startTime = Date.now();
    this.stats.totalRuns++;

    try {
      // Get batch of transactions to verify
      const batch = Array.from(this.pendingTransactions.keys()).slice(0, this.config.batchSize);

      if (batch.length === 0) {
        this.stats.lastRunTime = Date.now();
        this.stats.lastRunDuration = Date.now() - startTime;
        this.stats.nextScheduledRun = Date.now() + this.config.interval;
        return;
      }

      // Verify each transaction in batch
      for (const txHash of batch) {
        try {
          const result = await this.verificationService.verify(txHash, {
            requiredConfirmations: this.config.requiredConfirmations,
            timeout: 15000,
            retryCount: 1,
            retryDelay: 1000,
          });

          const retryCount = this.pendingTransactions.get(txHash) || 0;

          if (result.status === VerificationStatus.VERIFIED) {
            this.stats.successfulVerifications++;
            this.removeTransaction(txHash);
            this.emit('transaction_verified', { txHash, timestamp: Date.now() });
          } else if (result.status === VerificationStatus.UNVERIFIED) {
            this.stats.failedVerifications++;
            this.removeTransaction(txHash);
            this.emit('transaction_unverified', { txHash, timestamp: Date.now() });
          } else if (result.status === VerificationStatus.PENDING) {
            // Still pending, will retry next run
            this.pendingTransactions.set(txHash, retryCount);
          } else if (result.status === VerificationStatus.REORG_DETECTED) {
            this.stats.reorgDetections++;
            // Keep in queue for re-verification
            this.pendingTransactions.set(txHash, retryCount + 1);
            this.emit('reorg_detected', { txHash, timestamp: Date.now() });
          } else if (result.status === VerificationStatus.FAILED) {
            // Check retry count
            if (retryCount < this.config.maxRetries) {
              this.pendingTransactions.set(txHash, retryCount + 1);
            } else {
              this.stats.failedVerifications++;
              this.removeTransaction(txHash);
              this.emit('transaction_failed', { txHash, attempts: retryCount, timestamp: Date.now() });
            }
          }
        } catch (error) {
          console.error(`Error verifying transaction ${txHash}:`, error);
          const retryCount = this.pendingTransactions.get(txHash) || 0;

          if (retryCount < this.config.maxRetries) {
            this.pendingTransactions.set(txHash, retryCount + 1);
          } else {
            this.stats.failedVerifications++;
            this.removeTransaction(txHash);
          }
        }
      }

      this.emit('batch_completed', {
        batchSize: batch.length,
        successful: this.stats.successfulVerifications,
        failed: this.stats.failedVerifications,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error executing verification job:', error);
      this.emit('error', { error, timestamp: Date.now() });
    } finally {
      this.stats.lastRunTime = Date.now();
      this.stats.lastRunDuration = Date.now() - startTime;
      this.stats.nextScheduledRun = Date.now() + this.config.interval;
    }
  }

  /**
   * Get job statistics
   */
  getStats(): VerificationJobStats {
    return {
      ...this.stats,
      isRunning: this.isRunning,
    };
  }

  /**
   * Get pending transactions
   */
  getPendingTransactions(): Map<string, number> {
    return new Map(this.pendingTransactions);
  }

  /**
   * Get pending transaction count
   */
  getPendingCount(): number {
    return this.pendingTransactions.size;
  }

  /**
   * Clear all pending transactions
   */
  clearPending(): void {
    this.pendingTransactions.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: VerificationJob | null = null;

export function getVerificationJob(config?: Partial<VerificationJobConfig>): VerificationJob {
  if (!instance) {
    instance = new VerificationJob(config);
  }
  return instance;
}

export function resetVerificationJob(): void {
  if (instance) {
    instance.stop();
    instance.removeAllListeners();
    instance.clearPending();
  }
  instance = null;
}
