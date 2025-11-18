/**
 * Archival Job Tests
 * Tests for transaction archival and data cleanup
 */

import { ArchivalJob, getArchivalJob, resetArchivalJob } from './archivalJob';

// ============================================================================
// ARCHIVAL JOB TESTS
// ============================================================================

describe('ArchivalJob', () => {
  let job: ArchivalJob;

  beforeEach(() => {
    resetArchivalJob();
    job = new ArchivalJob({
      enabled: true,
      interval: 100,
      retentionDays: 7,
      batchSize: 100,
    });
  });

  afterEach(() => {
    resetArchivalJob();
  });

  it('should initialize archival job', () => {
    expect(job).toBeDefined();
  });

  it('should get empty stats on initialization', () => {
    const stats = job.getStats();

    expect(stats.isRunning).toBe(false);
    expect(stats.totalRuns).toBe(0);
    expect(stats.totalArchived).toBe(0);
    expect(stats.totalCleaned).toBe(0);
  });

  it('should start archival job', (done) => {
    const listener = jest.fn();
    job.on('started', listener);

    job.start();

    setTimeout(() => {
      expect(listener).toHaveBeenCalled();
      expect(job.getStats().isRunning).toBe(true);

      job.stop();
      done();
    }, 50);
  });

  it('should stop archival job', (done) => {
    const listener = jest.fn();
    job.on('stopped', listener);

    job.start();

    setTimeout(() => {
      job.stop();

      setTimeout(() => {
        expect(listener).toHaveBeenCalled();
        expect(job.getStats().isRunning).toBe(false);
        done();
      }, 50);
    }, 50);
  });

  it('should not start if already running', (done) => {
    const listener = jest.fn();

    job.start();

    setTimeout(() => {
      job.start(); // Try to start again

      const stats = job.getStats();
      expect(stats.isRunning).toBe(true);

      job.stop();
      done();
    }, 50);
  });

  it('should not start if disabled', () => {
    const disabledJob = new ArchivalJob({ enabled: false });

    disabledJob.start();

    const stats = disabledJob.getStats();
    expect(stats.isRunning).toBe(false);
  });
});

// ============================================================================
// ARCHIVAL EXECUTION
// ============================================================================

describe('Archival Execution', () => {
  let job: ArchivalJob;

  beforeEach(() => {
    resetArchivalJob();
    job = new ArchivalJob({
      enabled: true,
      interval: 100,
      retentionDays: 7,
      batchSize: 100,
    });
  });

  afterEach(() => {
    resetArchivalJob();
  });

  it('should emit archival_complete event', (done) => {
    const listener = jest.fn();
    job.on('archival_complete', listener);

    job.start();

    setTimeout(() => {
      expect(listener).toHaveBeenCalled();

      const call = listener.mock.calls[0][0];
      expect(call).toHaveProperty('archivedCount');
      expect(call).toHaveProperty('cleanedCount');
      expect(call).toHaveProperty('duration');

      job.stop();
      done();
    }, 150);
  });

  it('should emit transactions_archived event', (done) => {
    const listener = jest.fn();
    job.on('transactions_archived', listener);

    job.start();

    setTimeout(() => {
      expect(listener).toHaveBeenCalled();

      job.stop();
      done();
    }, 150);
  });

  it('should emit cleanup_operation events', (done) => {
    const listener = jest.fn();
    job.on('cleanup_operation', listener);

    job.start();

    setTimeout(() => {
      expect(listener.mock.calls.length).toBeGreaterThan(0);

      job.stop();
      done();
    }, 150);
  });

  it('should track total archived transactions', (done) => {
    job.start();

    setTimeout(() => {
      const stats = job.getStats();

      expect(stats.totalRuns).toBeGreaterThan(0);
      expect(stats.totalArchived).toBeGreaterThan(0);

      job.stop();
      done();
    }, 150);
  });

  it('should track total cleaned items', (done) => {
    job.start();

    setTimeout(() => {
      const stats = job.getStats();

      expect(stats.totalCleaned).toBeGreaterThan(0);

      job.stop();
      done();
    }, 150);
  });

  it('should update last run time', (done) => {
    job.start();

    setTimeout(() => {
      const stats = job.getStats();

      expect(stats.lastRunTime).toBeGreaterThan(0);
      expect(stats.lastRunDuration).toBeGreaterThan(0);

      job.stop();
      done();
    }, 150);
  });

  it('should schedule next run', (done) => {
    job.start();

    setTimeout(() => {
      const stats = job.getStats();
      const now = Date.now();

      expect(stats.nextScheduledRun).toBeGreaterThan(now);

      job.stop();
      done();
    }, 150);
  });

  it('should handle errors gracefully', (done) => {
    const listener = jest.fn();
    job.on('error', listener);

    job.start();

    setTimeout(() => {
      // Errors will be emitted if they occur
      job.stop();
      done();
    }, 150);
  });
});

// ============================================================================
// ARCHIVAL POLICY
// ============================================================================

describe('Archival Policy', () => {
  let job: ArchivalJob;

  beforeEach(() => {
    resetArchivalJob();
    job = new ArchivalJob({
      enabled: true,
      interval: 3600000,
      retentionDays: 7,
      batchSize: 1000,
    });
  });

  afterEach(() => {
    resetArchivalJob();
  });

  it('should get archival policy', () => {
    const policy = job.getPolicy();

    expect(policy).toHaveProperty('retentionDays');
    expect(policy).toHaveProperty('cutoffDate');
    expect(policy).toHaveProperty('nextArchivalDate');

    expect(policy.retentionDays).toBe(7);
  });

  it('should calculate cutoff date correctly', () => {
    const policy = job.getPolicy();
    const expectedCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const diffMs = Math.abs(policy.cutoffDate.getTime() - expectedCutoff.getTime());
    expect(diffMs).toBeLessThan(1000); // Within 1 second
  });

  it('should calculate next archival date', () => {
    const policy = job.getPolicy();
    const now = Date.now();

    expect(policy.nextArchivalDate.getTime()).toBeGreaterThanOrEqual(now);
  });

  it('should support different retention periods', () => {
    const policy30 = new ArchivalJob({ retentionDays: 30 }).getPolicy();
    const policy7 = new ArchivalJob({ retentionDays: 7 }).getPolicy();

    const cutoff30 = policy30.cutoffDate.getTime();
    const cutoff7 = policy7.cutoffDate.getTime();

    expect(cutoff30).toBeLessThan(cutoff7); // 30-day cutoff is older
  });
});

// ============================================================================
// MANUAL TRIGGERS
// ============================================================================

describe('Manual Triggers', () => {
  let job: ArchivalJob;

  beforeEach(() => {
    resetArchivalJob();
    job = new ArchivalJob({
      enabled: true,
      interval: 3600000,
      retentionDays: 7,
    });
  });

  afterEach(() => {
    resetArchivalJob();
  });

  it('should trigger manual archival', (done) => {
    const listener = jest.fn();
    job.on('archival_complete', listener);

    job.triggerManual().then(() => {
      expect(listener).toHaveBeenCalled();
      done();
    });
  });

  it('should estimate archival requirements', async () => {
    const estimate = await job.estimateArchival();

    expect(estimate).toHaveProperty('estimatedTransactions');
    expect(estimate).toHaveProperty('estimatedSize');
    expect(estimate).toHaveProperty('estimatedDuration');

    expect(estimate.estimatedTransactions).toBeGreaterThan(0);
    expect(estimate.estimatedSize).toMatch(/MB/);
    expect(estimate.estimatedDuration).toMatch(/seconds/);
  });
});

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

describe('ArchivalJob Singleton', () => {
  beforeEach(() => {
    resetArchivalJob();
  });

  afterEach(() => {
    resetArchivalJob();
  });

  it('should return same instance', () => {
    const job1 = getArchivalJob();
    const job2 = getArchivalJob();

    expect(job1).toBe(job2);
  });

  it('should reset singleton', () => {
    const job1 = getArchivalJob();
    job1.start();

    resetArchivalJob();

    const job2 = getArchivalJob();
    expect(job1).not.toBe(job2);
    expect(job2.getStats().isRunning).toBe(false);
  });

  it('should create with custom config', () => {
    const config = { retentionDays: 30, batchSize: 5000 };
    const job = getArchivalJob(config);

    const policy = job.getPolicy();
    expect(policy.retentionDays).toBe(30);
  });
});

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

describe('Real-world Archival Scenarios', () => {
  let job: ArchivalJob;

  beforeEach(() => {
    resetArchivalJob();
    job = new ArchivalJob({
      enabled: true,
      interval: 100,
      retentionDays: 7,
      batchSize: 1000,
    });
  });

  afterEach(() => {
    resetArchivalJob();
  });

  it('should handle continuous archival runs', (done) => {
    const listener = jest.fn();
    job.on('archival_complete', listener);

    job.start();

    setTimeout(() => {
      const stats = job.getStats();

      // Should have run multiple times
      expect(stats.totalRuns).toBeGreaterThan(1);
      expect(listener.mock.calls.length).toBeGreaterThan(1);

      job.stop();
      done();
    }, 300);
  });

  it('should track statistics across multiple runs', (done) => {
    job.start();

    setTimeout(() => {
      const stats1 = job.getStats();
      const run1Count = stats1.totalRuns;

      setTimeout(() => {
        const stats2 = job.getStats();

        expect(stats2.totalRuns).toBeGreaterThan(run1Count);
        expect(stats2.totalArchived).toBeGreaterThan(0);
        expect(stats2.totalCleaned).toBeGreaterThan(0);

        job.stop();
        done();
      }, 150);
    }, 150);
  });

  it('should handle various retention periods', () => {
    const policies = [
      new ArchivalJob({ retentionDays: 7 }).getPolicy(),
      new ArchivalJob({ retentionDays: 30 }).getPolicy(),
      new ArchivalJob({ retentionDays: 90 }).getPolicy(),
    ];

    // Verify each policy has different cutoff dates
    const cutoffs = policies.map((p) => p.cutoffDate.getTime());
    expect(cutoffs[0]).toBeGreaterThan(cutoffs[1]); // 7-day is more recent
    expect(cutoffs[1]).toBeGreaterThan(cutoffs[2]); // 30-day is more recent than 90-day
  });

  it('should manage large batch operations', (done) => {
    const largeJob = new ArchivalJob({
      enabled: true,
      interval: 100,
      retentionDays: 7,
      batchSize: 50000, // Large batch
    });

    const listener = jest.fn();
    largeJob.on('archival_complete', listener);

    largeJob.start();

    setTimeout(() => {
      expect(listener).toHaveBeenCalled();

      const stats = largeJob.getStats();
      expect(stats.totalRuns).toBeGreaterThan(0);

      largeJob.stop();
      done();
    }, 150);
  });

  it('should handle compression settings', () => {
    const compressedJob = new ArchivalJob({
      retentionDays: 7,
      compressionEnabled: true,
    });

    const uncompressedJob = new ArchivalJob({
      retentionDays: 7,
      compressionEnabled: false,
    });

    expect(compressedJob).toBeDefined();
    expect(uncompressedJob).toBeDefined();
  });
});
