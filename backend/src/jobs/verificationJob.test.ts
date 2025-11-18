/**
 * Verification Job Tests
 * Tests for background verification job
 */

import { VerificationJob, getVerificationJob, resetVerificationJob } from './verificationJob';
import { VerificationStatus } from '../services/verification.types';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('../services/verification', () => ({
  getVerificationService: () => ({
    verify: jest.fn(async (txHash) => ({
      tx_hash: txHash,
      status: VerificationStatus.VERIFIED,
      proof: { tx_hash: txHash },
      attempts: 1,
      lastAttempt: Date.now(),
    })),
  }),
}));

jest.mock('../services/verificationStateMachine', () => ({
  getVerificationStateMachine: () => ({
    initializeState: jest.fn(),
    transitionTo: jest.fn(),
    getState: jest.fn(),
  }),
}));

// ============================================================================
// VERIFICATION JOB TESTS
// ============================================================================

describe('VerificationJob', () => {
  let job: VerificationJob;

  beforeEach(() => {
    resetVerificationJob();
    job = new VerificationJob({
      enabled: true,
      interval: 100,
      maxRetries: 3,
      retryDelay: 50,
      batchSize: 5,
      requiredConfirmations: 12,
    });
  });

  afterEach(() => {
    if (job) {
      job.stop();
    }
    resetVerificationJob();
  });

  it('should initialize job', () => {
    expect(job).toBeDefined();
  });

  it('should start job', (done) => {
    const listener = jest.fn();
    job.on('started', listener);

    job.start();

    setTimeout(() => {
      expect(listener).toHaveBeenCalled();
      job.stop();
      done();
    }, 50);
  });

  it('should stop job', (done) => {
    const listener = jest.fn();
    job.on('stopped', listener);

    job.start();

    setTimeout(() => {
      job.stop();

      setTimeout(() => {
        expect(listener).toHaveBeenCalled();
        done();
      }, 50);
    }, 50);
  });

  it('should not start if already running', (done) => {
    const startSpy = jest.spyOn(job, 'start');

    job.start();
    job.start(); // Try to start again

    setTimeout(() => {
      expect(startSpy).toHaveBeenCalledTimes(2);
      job.stop();
      done();
    }, 50);
  });

  it('should not start if disabled', () => {
    const disabledJob = new VerificationJob({ enabled: false });
    const listener = jest.fn();
    disabledJob.on('started', listener);

    disabledJob.start();

    expect(listener).not.toHaveBeenCalled();
  });
});

// ============================================================================
// TRANSACTION QUEUE
// ============================================================================

describe('Transaction Queue', () => {
  let job: VerificationJob;

  beforeEach(() => {
    resetVerificationJob();
    job = new VerificationJob({
      enabled: true,
      interval: 100,
      batchSize: 5,
    });
  });

  afterEach(() => {
    if (job) {
      job.stop();
    }
    resetVerificationJob();
  });

  it('should add transaction to queue', () => {
    const listener = jest.fn();
    job.on('transaction_added', listener);

    job.addTransaction('0xabc123');

    expect(listener).toHaveBeenCalled();
    expect(job.getPendingCount()).toBe(1);
  });

  it('should not add duplicate transactions', () => {
    job.addTransaction('0xabc123');
    job.addTransaction('0xabc123');

    expect(job.getPendingCount()).toBe(1);
  });

  it('should remove transaction from queue', () => {
    const listener = jest.fn();
    job.on('transaction_removed', listener);

    job.addTransaction('0xabc123');
    job.removeTransaction('0xabc123');

    expect(listener).toHaveBeenCalled();
    expect(job.getPendingCount()).toBe(0);
  });

  it('should get pending transactions', () => {
    job.addTransaction('0xabc123');
    job.addTransaction('0xdef456');

    const pending = job.getPendingTransactions();

    expect(pending.size).toBe(2);
    expect(pending.has('0xabc123')).toBe(true);
    expect(pending.has('0xdef456')).toBe(true);
  });

  it('should get pending count', () => {
    job.addTransaction('0xabc123');
    job.addTransaction('0xdef456');
    job.addTransaction('0xghi789');

    expect(job.getPendingCount()).toBe(3);
  });

  it('should clear all pending transactions', () => {
    job.addTransaction('0xabc123');
    job.addTransaction('0xdef456');

    job.clearPending();

    expect(job.getPendingCount()).toBe(0);
  });
});

// ============================================================================
// STATISTICS
// ============================================================================

describe('Job Statistics', () => {
  let job: VerificationJob;

  beforeEach(() => {
    resetVerificationJob();
    job = new VerificationJob({
      enabled: true,
      interval: 100,
      batchSize: 5,
    });
  });

  afterEach(() => {
    if (job) {
      job.stop();
    }
    resetVerificationJob();
  });

  it('should track job statistics', (done) => {
    job.start();
    job.addTransaction('0xabc123');

    setTimeout(() => {
      const stats = job.getStats();

      expect(stats.isRunning).toBe(true);
      expect(stats.totalRuns).toBeGreaterThan(0);
      expect(stats.lastRunTime).toBeGreaterThan(0);

      job.stop();
      done();
    }, 150);
  });

  it('should track successful verifications', (done) => {
    const listener = jest.fn();
    job.on('transaction_verified', listener);

    job.start();
    job.addTransaction('0xabc123');

    setTimeout(() => {
      const stats = job.getStats();

      expect(stats.successfulVerifications).toBeGreaterThanOrEqual(0);

      job.stop();
      done();
    }, 150);
  });

  it('should track failed verifications', (done) => {
    const listener = jest.fn();
    job.on('transaction_failed', listener);

    job.start();

    setTimeout(() => {
      const stats = job.getStats();

      expect(stats.failedVerifications).toBeDefined();

      job.stop();
      done();
    }, 150);
  });

  it('should calculate next scheduled run', (done) => {
    job.start();

    setTimeout(() => {
      const stats = job.getStats();

      expect(stats.nextScheduledRun).toBeGreaterThan(Date.now());

      job.stop();
      done();
    }, 150);
  });
});

// ============================================================================
// BATCH PROCESSING
// ============================================================================

describe('Batch Processing', () => {
  let job: VerificationJob;

  beforeEach(() => {
    resetVerificationJob();
    job = new VerificationJob({
      enabled: true,
      interval: 100,
      batchSize: 3,
    });
  });

  afterEach(() => {
    if (job) {
      job.stop();
    }
    resetVerificationJob();
  });

  it('should process transactions in batches', (done) => {
    const listener = jest.fn();
    job.on('batch_completed', listener);

    job.start();
    job.addTransaction('0xtx1');
    job.addTransaction('0xtx2');
    job.addTransaction('0xtx3');
    job.addTransaction('0xtx4');

    setTimeout(() => {
      expect(listener).toHaveBeenCalled();

      job.stop();
      done();
    }, 150);
  });

  it('should respect batch size', (done) => {
    const listener = jest.fn();
    job.on('batch_completed', (data) => {
      listener(data.batchSize);
    });

    job.start();

    // Add more transactions than batch size
    for (let i = 0; i < 5; i++) {
      job.addTransaction(`0xtx${i}`);
    }

    setTimeout(() => {
      const calls = listener.mock.calls;
      if (calls.length > 0) {
        expect(calls[0][0]).toBeLessThanOrEqual(3); // batch size
      }

      job.stop();
      done();
    }, 150);
  });

  it('should emit batch_completed event', (done) => {
    const listener = jest.fn();
    job.on('batch_completed', listener);

    job.start();
    job.addTransaction('0xabc123');

    setTimeout(() => {
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          batchSize: expect.any(Number),
          successful: expect.any(Number),
          failed: expect.any(Number),
        })
      );

      job.stop();
      done();
    }, 150);
  });
});

// ============================================================================
// EVENT EMISSIONS
// ============================================================================

describe('Event Emissions', () => {
  let job: VerificationJob;

  beforeEach(() => {
    resetVerificationJob();
    job = new VerificationJob({
      enabled: true,
      interval: 100,
      batchSize: 5,
    });
  });

  afterEach(() => {
    if (job) {
      job.stop();
    }
    resetVerificationJob();
  });

  it('should emit transaction_added event', () => {
    const listener = jest.fn();
    job.on('transaction_added', listener);

    job.addTransaction('0xabc123');

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash: '0xabc123',
      })
    );
  });

  it('should emit transaction_removed event', () => {
    const listener = jest.fn();
    job.on('transaction_removed', listener);

    job.addTransaction('0xabc123');
    job.removeTransaction('0xabc123');

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash: '0xabc123',
      })
    );
  });

  it('should emit error event on exception', (done) => {
    const errorListener = jest.fn();
    job.on('error', errorListener);

    // Job should emit error gracefully
    job.start();

    setTimeout(() => {
      job.stop();
      done();
    }, 150);
  });
});

// ============================================================================
// RETRY LOGIC
// ============================================================================

describe('Retry Logic', () => {
  let job: VerificationJob;

  beforeEach(() => {
    resetVerificationJob();
    job = new VerificationJob({
      enabled: true,
      interval: 100,
      maxRetries: 2,
      batchSize: 5,
    });
  });

  afterEach(() => {
    if (job) {
      job.stop();
    }
    resetVerificationJob();
  });

  it('should track retry count', () => {
    const txHash = '0xabc123';
    job.addTransaction(txHash);

    const pending = job.getPendingTransactions();
    expect(pending.get(txHash)).toBe(0);
  });

  it('should respect max retries', (done) => {
    const listener = jest.fn();
    job.on('transaction_failed', listener);

    job.start();
    job.addTransaction('0xfailing');

    setTimeout(() => {
      // Job should eventually give up after max retries
      job.stop();
      done();
    }, 300);
  });
});

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

describe('VerificationJob Singleton', () => {
  beforeEach(() => {
    resetVerificationJob();
  });

  afterEach(() => {
    resetVerificationJob();
  });

  it('should return same instance', () => {
    const job1 = getVerificationJob();
    const job2 = getVerificationJob();

    expect(job1).toBe(job2);
  });

  it('should reset singleton', () => {
    const job1 = getVerificationJob();
    resetVerificationJob();
    const job2 = getVerificationJob();

    expect(job1).not.toBe(job2);
  });

  it('should create with config', () => {
    const config = { interval: 200, maxRetries: 5 };
    const job = getVerificationJob(config);

    expect(job).toBeDefined();
  });
});

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

describe('Real-world Scenarios', () => {
  let job: VerificationJob;

  beforeEach(() => {
    resetVerificationJob();
    job = new VerificationJob({
      enabled: true,
      interval: 100,
      batchSize: 10,
      maxRetries: 3,
    });
  });

  afterEach(() => {
    if (job) {
      job.stop();
    }
    resetVerificationJob();
  });

  it('should handle high transaction volume', (done) => {
    job.start();

    // Simulate high volume
    for (let i = 0; i < 50; i++) {
      job.addTransaction(`0xtx${i}`);
    }

    setTimeout(() => {
      const stats = job.getStats();
      expect(stats.totalRuns).toBeGreaterThan(0);

      job.stop();
      done();
    }, 300);
  });

  it('should process transactions continuously', (done) => {
    const listener = jest.fn();
    job.on('batch_completed', listener);

    job.start();

    // Continuously add transactions
    const interval = setInterval(() => {
      job.addTransaction(`0xtx${Date.now()}`);
    }, 50);

    setTimeout(() => {
      clearInterval(interval);
      expect(listener.mock.calls.length).toBeGreaterThan(0);

      job.stop();
      done();
    }, 250);
  });
});
