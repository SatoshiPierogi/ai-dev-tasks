/**
 * Verification State Machine Tests
 * Tests for verification status transitions and reorg handling
 */

import {
  VerificationStateMachine,
  getVerificationStateMachine,
  resetVerificationStateMachine,
} from './verificationStateMachine';
import { VerificationStatus } from './verification.types';

// ============================================================================
// STATE MACHINE TESTS
// ============================================================================

describe('VerificationStateMachine', () => {
  let stateMachine: VerificationStateMachine;

  beforeEach(() => {
    resetVerificationStateMachine();
    stateMachine = new VerificationStateMachine();
  });

  afterEach(() => {
    resetVerificationStateMachine();
  });

  it('should initialize state machine', () => {
    expect(stateMachine).toBeDefined();
  });

  it('should initialize transaction state', () => {
    const state = stateMachine.initializeState('0xabc123');

    expect(state).toBeDefined();
    expect(state.txHash).toBe('0xabc123');
    expect(state.currentStatus).toBe(VerificationStatus.PENDING);
    expect(state.reorgCount).toBe(0);
    expect(state.isReorgable).toBe(true);
  });

  it('should transition to verified', () => {
    stateMachine.initializeState('0xabc123');
    const state = stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED, 'confirmed');

    expect(state.currentStatus).toBe(VerificationStatus.VERIFIED);
    expect(state.transitions.length).toBe(2); // initialized + verified
  });

  it('should transition to unverified', () => {
    stateMachine.initializeState('0xabc123');
    const state = stateMachine.transitionTo('0xabc123', VerificationStatus.UNVERIFIED, 'failed');

    expect(state.currentStatus).toBe(VerificationStatus.UNVERIFIED);
  });

  it('should track transition history', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);
    stateMachine.transitionTo('0xabc123', VerificationStatus.REORG_DETECTED);

    const transitions = stateMachine.getTransitions('0xabc123');
    expect(transitions.length).toBeGreaterThan(2);
    expect(transitions[transitions.length - 1].to).toBe(VerificationStatus.REORG_DETECTED);
  });

  it('should record transition reason', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED, '12 confirmations reached');

    const transitions = stateMachine.getTransitions('0xabc123');
    const verifiedTransition = transitions.find((t) => t.to === VerificationStatus.VERIFIED);

    expect(verifiedTransition?.reason).toBe('12 confirmations reached');
  });

  it('should emit state_changed event', () => {
    stateMachine.initializeState('0xabc123');
    const listener = jest.fn();
    stateMachine.on('state_changed', listener);

    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash: '0xabc123',
        from: VerificationStatus.PENDING,
        to: VerificationStatus.VERIFIED,
      })
    );
  });

  it('should set isReorgable to false when verified', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);

    const state = stateMachine.getState('0xabc123');
    expect(state?.isReorgable).toBe(false);
  });

  it('should mark as finalized when verified', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);

    expect(stateMachine.isFinalized('0xabc123')).toBe(true);
  });
});

// ============================================================================
// REORG HANDLING
// ============================================================================

describe('Reorg Handling', () => {
  let stateMachine: VerificationStateMachine;

  beforeEach(() => {
    resetVerificationStateMachine();
    stateMachine = new VerificationStateMachine();
  });

  afterEach(() => {
    resetVerificationStateMachine();
  });

  it('should detect reorg', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);

    const state = stateMachine.handleReorg('0xabc123');

    expect(state.reorgCount).toBe(1);
  });

  it('should track reorg count', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);

    stateMachine.handleReorg('0xabc123');
    stateMachine.handleReorg('0xabc123');

    const state = stateMachine.getState('0xabc123');
    expect(state?.reorgCount).toBe(2);
  });

  it('should reset to pending after reorg', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);
    stateMachine.handleReorg('0xabc123');

    const state = stateMachine.getState('0xabc123');
    expect(state?.currentStatus).toBe(VerificationStatus.PENDING);
  });

  it('should emit reorg_detected event', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);

    const listener = jest.fn();
    stateMachine.on('reorg_detected', listener);

    stateMachine.handleReorg('0xabc123');

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash: '0xabc123',
        reorgCount: 1,
      })
    );
  });

  it('should throw error for unverified transaction reorg', () => {
    stateMachine.initializeState('0xabc123');

    expect(() => stateMachine.handleReorg('0xabc123')).toThrow();
  });

  it('should prevent reorg after finalization', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);
    const state = stateMachine.getState('0xabc123');
    // Manually set isReorgable to false
    if (state) {
      state.isReorgable = false;
    }

    expect(() => stateMachine.handleReorg('0xabc123')).toThrow();
  });

  it('should get reorg count', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);
    stateMachine.handleReorg('0xabc123');
    stateMachine.handleReorg('0xabc123');

    expect(stateMachine.getReorgCount('0xabc123')).toBe(2);
  });
});

// ============================================================================
// STATE TRANSITIONS
// ============================================================================

describe('Valid State Transitions', () => {
  let stateMachine: VerificationStateMachine;

  beforeEach(() => {
    resetVerificationStateMachine();
    stateMachine = new VerificationStateMachine();
  });

  it('should allow PENDING → VERIFIED', () => {
    stateMachine.initializeState('0xabc123');
    expect(() => stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED)).not.toThrow();
  });

  it('should allow PENDING → UNVERIFIED', () => {
    stateMachine.initializeState('0xabc123');
    expect(() => stateMachine.transitionTo('0xabc123', VerificationStatus.UNVERIFIED)).not.toThrow();
  });

  it('should allow PENDING → FAILED', () => {
    stateMachine.initializeState('0xabc123');
    expect(() => stateMachine.transitionTo('0xabc123', VerificationStatus.FAILED)).not.toThrow();
  });

  it('should allow VERIFIED → REORG_DETECTED', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);
    expect(() => stateMachine.transitionTo('0xabc123', VerificationStatus.REORG_DETECTED)).not.toThrow();
  });

  it('should allow UNVERIFIED → PENDING', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.UNVERIFIED);
    expect(() => stateMachine.transitionTo('0xabc123', VerificationStatus.PENDING)).not.toThrow();
  });

  it('should allow FAILED → PENDING', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.FAILED);
    expect(() => stateMachine.transitionTo('0xabc123', VerificationStatus.PENDING)).not.toThrow();
  });
});

describe('Invalid State Transitions', () => {
  let stateMachine: VerificationStateMachine;

  beforeEach(() => {
    resetVerificationStateMachine();
    stateMachine = new VerificationStateMachine();
  });

  it('should reject VERIFIED → UNVERIFIED', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);

    expect(() => stateMachine.transitionTo('0xabc123', VerificationStatus.UNVERIFIED)).toThrow();
  });

  it('should reject UNVERIFIED → FAILED', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.UNVERIFIED);

    expect(() => stateMachine.transitionTo('0xabc123', VerificationStatus.FAILED)).toThrow();
  });
});

// ============================================================================
// STATISTICS
// ============================================================================

describe('Statistics', () => {
  let stateMachine: VerificationStateMachine;

  beforeEach(() => {
    resetVerificationStateMachine();
    stateMachine = new VerificationStateMachine();
  });

  it('should get state summary', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);

    stateMachine.initializeState('0xdef456');
    stateMachine.transitionTo('0xdef456', VerificationStatus.UNVERIFIED);

    const summary = stateMachine.getSummary();

    expect(summary.totalTransactions).toBe(2);
    expect(summary.byStatus[VerificationStatus.VERIFIED]).toBe(1);
    expect(summary.byStatus[VerificationStatus.UNVERIFIED]).toBe(1);
  });

  it('should count reorg detections', () => {
    stateMachine.initializeState('0xabc123');
    stateMachine.transitionTo('0xabc123', VerificationStatus.VERIFIED);
    stateMachine.handleReorg('0xabc123');

    const summary = stateMachine.getSummary();

    expect(summary.reorgDetections).toBe(1);
  });

  it('should get reorgability status', () => {
    const blockNumber = 100;

    expect(stateMachine.isReorgable('0xunknown', blockNumber, 90)).toBe(true);

    stateMachine.initializeState('0xknown');
    stateMachine.transitionTo('0xknown', VerificationStatus.VERIFIED);
    const state = stateMachine.getState('0xknown');
    if (state) {
      state.isReorgable = false;
    }

    expect(stateMachine.isReorgable('0xknown', blockNumber, 90)).toBe(false);
  });
});

// ============================================================================
// FAILED TRANSACTIONS
// ============================================================================

describe('Failed Transactions', () => {
  let stateMachine: VerificationStateMachine;

  beforeEach(() => {
    resetVerificationStateMachine();
    stateMachine = new VerificationStateMachine();
  });

  it('should mark transaction as failed', () => {
    const state = stateMachine.markAsFailed('0xabc123', 'Transaction reverted');

    expect(state.currentStatus).toBe(VerificationStatus.UNVERIFIED);
  });

  it('should emit verification_failed event', () => {
    const listener = jest.fn();
    stateMachine.on('verification_failed', listener);

    stateMachine.markAsFailed('0xabc123', 'Transaction reverted');

    expect(listener).toHaveBeenCalled();
  });

  it('should record failure reason', () => {
    const state = stateMachine.markAsFailed('0xabc123', 'Out of gas');

    const transitions = stateMachine.getTransitions('0xabc123');
    const failedTransition = transitions.find((t) => t.to === VerificationStatus.UNVERIFIED);

    expect(failedTransition?.reason).toContain('Out of gas');
  });
});

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

describe('VerificationStateMachine Singleton', () => {
  beforeEach(() => {
    resetVerificationStateMachine();
  });

  afterEach(() => {
    resetVerificationStateMachine();
  });

  it('should return same instance', () => {
    const sm1 = getVerificationStateMachine();
    const sm2 = getVerificationStateMachine();

    expect(sm1).toBe(sm2);
  });

  it('should reset singleton', () => {
    const sm1 = getVerificationStateMachine();
    sm1.initializeState('0xabc123');

    resetVerificationStateMachine();
    const sm2 = getVerificationStateMachine();

    expect(sm1).not.toBe(sm2);
    expect(sm2.getState('0xabc123')).toBeUndefined();
  });
});

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

describe('Real-world Scenarios', () => {
  let stateMachine: VerificationStateMachine;

  beforeEach(() => {
    resetVerificationStateMachine();
    stateMachine = new VerificationStateMachine();
  });

  it('should handle normal verification flow', () => {
    stateMachine.initializeState('0xswap123');
    stateMachine.transitionTo('0xswap123', VerificationStatus.PENDING);
    stateMachine.transitionTo('0xswap123', VerificationStatus.VERIFIED);

    const state = stateMachine.getState('0xswap123');
    expect(state?.currentStatus).toBe(VerificationStatus.VERIFIED);
    expect(state?.reorgCount).toBe(0);
  });

  it('should handle reorg recovery', () => {
    stateMachine.initializeState('0xbridge123');
    stateMachine.transitionTo('0xbridge123', VerificationStatus.VERIFIED);
    stateMachine.handleReorg('0xbridge123');
    stateMachine.transitionTo('0xbridge123', VerificationStatus.VERIFIED);

    const state = stateMachine.getState('0xbridge123');
    expect(state?.currentStatus).toBe(VerificationStatus.VERIFIED);
    expect(state?.reorgCount).toBe(1);
  });

  it('should handle multiple transaction verification', () => {
    const txHashes = ['0xtx1', '0xtx2', '0xtx3', '0xtx4', '0xtx5'];

    for (const txHash of txHashes) {
      stateMachine.initializeState(txHash);
      stateMachine.transitionTo(txHash, VerificationStatus.VERIFIED);
    }

    const summary = stateMachine.getSummary();
    expect(summary.totalTransactions).toBe(5);
    expect(summary.byStatus[VerificationStatus.VERIFIED]).toBe(5);
  });
});
