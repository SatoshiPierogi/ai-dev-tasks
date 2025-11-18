/**
 * Verification State Machine
 * Manages verification status transitions and reorg handling
 */

import { EventEmitter } from 'events';
import { VerificationStatus, VerificationResult } from './verification.types';

// ============================================================================
// TYPES
// ============================================================================

export interface StateTransition {
  from: VerificationStatus;
  to: VerificationStatus;
  timestamp: number;
  reason?: string;
}

export interface TransactionState {
  txHash: string;
  currentStatus: VerificationStatus;
  transitions: StateTransition[];
  reorgCount: number;
  lastReorgCheck: number;
  isReorgable: boolean; // True if still within reorg window
}

// ============================================================================
// STATE MACHINE
// ============================================================================

export class VerificationStateMachine extends EventEmitter {
  private states: Map<string, TransactionState> = new Map();
  private reorgWindow: number; // blocks within which reorg is possible (default 12)
  private confirmationCount: Map<string, number> = new Map();

  constructor(reorgWindow: number = 12) {
    super();
    this.reorgWindow = reorgWindow;
  }

  /**
   * Initialize state for a transaction
   */
  initializeState(txHash: string): TransactionState {
    const state: TransactionState = {
      txHash,
      currentStatus: VerificationStatus.PENDING,
      transitions: [
        {
          from: VerificationStatus.PENDING,
          to: VerificationStatus.PENDING,
          timestamp: Date.now(),
          reason: 'initialized',
        },
      ],
      reorgCount: 0,
      lastReorgCheck: Date.now(),
      isReorgable: true,
    };

    this.states.set(txHash, state);
    this.emit('state_initialized', state);

    return state;
  }

  /**
   * Transition to a new state
   */
  transitionTo(txHash: string, newStatus: VerificationStatus, reason?: string): TransactionState {
    let state = this.states.get(txHash);

    if (!state) {
      state = this.initializeState(txHash);
    }

    const oldStatus = state.currentStatus;

    // Validate transition
    if (!this.isValidTransition(oldStatus, newStatus)) {
      throw new Error(
        `Invalid state transition: ${oldStatus} → ${newStatus} (for tx ${txHash})`
      );
    }

    // Add transition record
    state.transitions.push({
      from: oldStatus,
      to: newStatus,
      timestamp: Date.now(),
      reason,
    });

    // Update state
    state.currentStatus = newStatus;

    // Update reorg window
    if (newStatus === VerificationStatus.VERIFIED) {
      // Transaction is finalized after a certain number of blocks
      state.isReorgable = false;
    }

    this.emit('state_changed', {
      txHash,
      from: oldStatus,
      to: newStatus,
      reason,
      timestamp: Date.now(),
    });

    return state;
  }

  /**
   * Handle reorg detection
   */
  handleReorg(txHash: string): TransactionState {
    const state = this.states.get(txHash);

    if (!state) {
      throw new Error(`No state found for transaction ${txHash}`);
    }

    // Can only reorg if still in reorg window
    if (!state.isReorgable) {
      throw new Error(`Transaction ${txHash} is no longer reorgable`);
    }

    state.reorgCount++;
    state.lastReorgCheck = Date.now();

    // Transition back to pending
    this.transitionTo(txHash, VerificationStatus.REORG_DETECTED, `reorg #${state.reorgCount}`);

    // Reset to pending for re-verification
    state.transitions.push({
      from: VerificationStatus.REORG_DETECTED,
      to: VerificationStatus.PENDING,
      timestamp: Date.now(),
      reason: `re-verifying after reorg #${state.reorgCount}`,
    });

    state.currentStatus = VerificationStatus.PENDING;

    this.emit('reorg_detected', {
      txHash,
      reorgCount: state.reorgCount,
      timestamp: Date.now(),
    });

    return state;
  }

  /**
   * Mark transaction as unverifiable
   */
  markAsFailed(txHash: string, reason: string): TransactionState {
    const state = this.states.get(txHash) || this.initializeState(txHash);

    this.transitionTo(txHash, VerificationStatus.UNVERIFIED, reason);

    this.emit('verification_failed', {
      txHash,
      reason,
      timestamp: Date.now(),
    });

    return state;
  }

  /**
   * Check if transition is valid
   */
  private isValidTransition(from: VerificationStatus, to: VerificationStatus): boolean {
    const validTransitions: Record<VerificationStatus, VerificationStatus[]> = {
      [VerificationStatus.PENDING]: [
        VerificationStatus.VERIFIED,
        VerificationStatus.UNVERIFIED,
        VerificationStatus.FAILED,
        VerificationStatus.PENDING, // Still pending
      ],
      [VerificationStatus.VERIFIED]: [
        VerificationStatus.REORG_DETECTED,
        VerificationStatus.VERIFIED, // Confirmed multiple times
      ],
      [VerificationStatus.UNVERIFIED]: [
        VerificationStatus.PENDING, // Retry verification
        VerificationStatus.VERIFIED,
      ],
      [VerificationStatus.FAILED]: [
        VerificationStatus.PENDING, // Retry
      ],
      [VerificationStatus.REORG_DETECTED]: [
        VerificationStatus.PENDING, // Re-verify after reorg
        VerificationStatus.VERIFIED,
        VerificationStatus.UNVERIFIED,
      ],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * Get state for transaction
   */
  getState(txHash: string): TransactionState | undefined {
    return this.states.get(txHash);
  }

  /**
   * Get all transitions for transaction
   */
  getTransitions(txHash: string): StateTransition[] {
    const state = this.states.get(txHash);
    return state?.transitions || [];
  }

  /**
   * Check if transaction is finalized (not reorgable)
   */
  isFinalized(txHash: string): boolean {
    const state = this.states.get(txHash);
    return state ? !state.isReorgable : false;
  }

  /**
   * Check if transaction can still be reorg'd
   */
  isReorgable(txHash: string, currentBlockNumber: number, txBlockNumber: number): boolean {
    const state = this.states.get(txHash);

    if (!state) {
      return true; // Unknown transactions are potentially reorgable
    }

    // Check if still in reorg window
    const blocksSinceTransaction = currentBlockNumber - txBlockNumber;
    return blocksSinceTransaction < this.reorgWindow;
  }

  /**
   * Get reorg count for transaction
   */
  getReorgCount(txHash: string): number {
    const state = this.states.get(txHash);
    return state?.reorgCount || 0;
  }

  /**
   * Get state summary
   */
  getSummary(): {
    totalTransactions: number;
    byStatus: Record<VerificationStatus, number>;
    reorgDetections: number;
  } {
    const summary = {
      totalTransactions: this.states.size,
      byStatus: {
        [VerificationStatus.PENDING]: 0,
        [VerificationStatus.VERIFIED]: 0,
        [VerificationStatus.UNVERIFIED]: 0,
        [VerificationStatus.FAILED]: 0,
        [VerificationStatus.REORG_DETECTED]: 0,
      },
      reorgDetections: 0,
    };

    for (const state of this.states.values()) {
      summary.byStatus[state.currentStatus]++;
      summary.reorgDetections += state.reorgCount;
    }

    return summary;
  }

  /**
   * Clear all states
   */
  clear(): void {
    this.states.clear();
    this.confirmationCount.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: VerificationStateMachine | null = null;

export function getVerificationStateMachine(): VerificationStateMachine {
  if (!instance) {
    instance = new VerificationStateMachine();
  }
  return instance;
}

export function resetVerificationStateMachine(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}
