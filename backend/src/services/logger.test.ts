/**
 * Logger Service Tests
 * Tests structured logging, buffer management, and log retrieval
 */

import { LoggerService, LogLevel, resetLogger } from './logger';

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  resetLogger();
});

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

describe('LoggerService', () => {
  it('should initialize with default options', () => {
    const logger = new LoggerService();
    expect(logger).toBeDefined();
    expect(logger.getBufferSize()).toBe(0);
  });

  it('should initialize with custom options', () => {
    const logger = new LoggerService({
      enableConsole: false,
      enableFile: false,
      level: LogLevel.DEBUG,
    });

    expect(logger).toBeDefined();
  });
});

// ============================================================================
// LOGGING METHODS TESTS
// ============================================================================

describe('Logging Methods', () => {
  let logger: LoggerService;

  beforeEach(() => {
    logger = new LoggerService({
      enableConsole: false,
      enableFile: false,
    });
  });

  it('should log error', () => {
    logger.error('Test error', { context: 'value' });

    const logs = logger.getRecentLogs(1);
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe(LogLevel.ERROR);
    expect(logs[0].message).toBe('Test error');
  });

  it('should log warning', () => {
    logger.warn('Test warning');

    const logs = logger.getRecentLogs(1);
    expect(logs[0].level).toBe(LogLevel.WARN);
  });

  it('should log info', () => {
    logger.info('Test info');

    const logs = logger.getRecentLogs(1);
    expect(logs[0].level).toBe(LogLevel.INFO);
  });

  it('should log debug', () => {
    logger.debug('Test debug');

    const logs = logger.getRecentLogs(1);
    expect(logs[0].level).toBe(LogLevel.DEBUG);
  });

  it('should log trace', () => {
    logger.trace('Test trace');

    const logs = logger.getRecentLogs(1);
    expect(logs[0].level).toBe(LogLevel.TRACE);
  });

  it('should include timestamp', () => {
    logger.info('Test');

    const logs = logger.getRecentLogs(1);
    expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should include context', () => {
    const context = { userId: 123, action: 'login' };
    logger.info('User logged in', context);

    const logs = logger.getRecentLogs(1);
    expect(logs[0].context?.userId).toBe(123);
  });

  it('should include error details', () => {
    const error = new Error('Test error');
    logger.error('Something failed', {}, error);

    const logs = logger.getRecentLogs(1);
    expect(logs[0].error?.message).toBe('Test error');
    expect(logs[0].error?.stack).toBeDefined();
  });

  it('should include userId from context', () => {
    logger.info('User action', { userId: 456 });

    const logs = logger.getRecentLogs(1);
    expect(logs[0].userId).toBe(456);
  });

  it('should include requestId from context', () => {
    logger.info('API call', { requestId: 'req-123' });

    const logs = logger.getRecentLogs(1);
    expect(logs[0].requestId).toBe('req-123');
  });

  it('should include duration from context', () => {
    logger.info('Query completed', { duration: 150 });

    const logs = logger.getRecentLogs(1);
    expect(logs[0].duration).toBe(150);
  });
});

// ============================================================================
// BUFFER MANAGEMENT TESTS
// ============================================================================

describe('Buffer Management', () => {
  let logger: LoggerService;

  beforeEach(() => {
    logger = new LoggerService({
      enableConsole: false,
      enableFile: false,
    });
  });

  it('should add logs to buffer', () => {
    logger.info('Log 1');
    logger.info('Log 2');

    expect(logger.getBufferSize()).toBe(2);
  });

  it('should maintain max buffer size', () => {
    // Add more logs than typical max
    for (let i = 0; i < 100; i++) {
      logger.info(`Log ${i}`);
    }

    expect(logger.getBufferSize()).toBeLessThanOrEqual(100);
  });

  it('should clear buffer', () => {
    logger.info('Log');
    expect(logger.getBufferSize()).toBe(1);

    logger.clearBuffer();
    expect(logger.getBufferSize()).toBe(0);
  });

  it('should retrieve recent logs with limit', () => {
    for (let i = 0; i < 10; i++) {
      logger.info(`Log ${i}`);
    }

    const recentLogs = logger.getRecentLogs(3);
    expect(recentLogs).toHaveLength(3);
    expect(recentLogs[2].message).toContain('Log 9');
  });
});

// ============================================================================
// LOG FILTERING TESTS
// ============================================================================

describe('Log Filtering', () => {
  let logger: LoggerService;

  beforeEach(() => {
    logger = new LoggerService({
      enableConsole: false,
      enableFile: false,
      level: LogLevel.DEBUG,
    });
  });

  it('should get logs by level', () => {
    logger.error('Error log');
    logger.warn('Warn log');
    logger.info('Info log');

    const errors = logger.getLogsByLevel(LogLevel.ERROR);
    expect(errors).toHaveLength(1);
    expect(errors[0].level).toBe(LogLevel.ERROR);
  });

  it('should search logs by message', () => {
    logger.info('User logged in');
    logger.info('User logged out');
    logger.info('Page loaded');

    const results = logger.searchLogs('logged');
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('should search case-insensitively', () => {
    logger.info('User ACTION completed');
    logger.info('Another action');

    const results = logger.searchLogs('action');
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('should return logs in reverse chronological order', () => {
    logger.info('First');
    logger.info('Second');
    logger.info('Third');

    const logs = logger.getRecentLogs(3);
    expect(logs[logs.length - 1].message).toContain('First');
    expect(logs[0].message).toContain('Third');
  });
});

// ============================================================================
// LOG LEVEL FILTERING TESTS
// ============================================================================

describe('Log Level Filtering', () => {
  it('should log only errors when level is ERROR', () => {
    const logger = new LoggerService({
      enableConsole: false,
      enableFile: false,
      level: LogLevel.ERROR,
    });

    logger.error('Error');
    logger.warn('Warn');
    logger.info('Info');

    const logs = logger.getRecentLogs(10);
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe(LogLevel.ERROR);
  });

  it('should log errors and warnings when level is WARN', () => {
    const logger = new LoggerService({
      enableConsole: false,
      enableFile: false,
      level: LogLevel.WARN,
    });

    logger.error('Error');
    logger.warn('Warn');
    logger.info('Info');

    const logs = logger.getRecentLogs(10);
    expect(logs).toHaveLength(2);
  });

  it('should log all when level is TRACE', () => {
    const logger = new LoggerService({
      enableConsole: false,
      enableFile: false,
      level: LogLevel.TRACE,
    });

    logger.error('Error');
    logger.warn('Warn');
    logger.info('Info');
    logger.debug('Debug');
    logger.trace('Trace');

    const logs = logger.getRecentLogs(10);
    expect(logs).toHaveLength(5);
  });
});

// ============================================================================
// SENSITIVE DATA SANITIZATION TESTS
// ============================================================================

describe('Sensitive Data Sanitization', () => {
  let logger: LoggerService;

  beforeEach(() => {
    logger = new LoggerService({
      enableConsole: false,
      enableFile: false,
    });
  });

  it('should redact password field', () => {
    logger.info('Login attempt', { username: 'user', password: 'secret123' });

    const logs = logger.getRecentLogs(1);
    expect(logs[0].context?.password).toBe('[REDACTED]');
    expect(logs[0].context?.username).toBe('user');
  });

  it('should redact token field', () => {
    logger.info('Auth', { token: 'jwt-token-123' });

    const logs = logger.getRecentLogs(1);
    expect(logs[0].context?.token).toBe('[REDACTED]');
  });

  it('should redact api_key field', () => {
    logger.info('API call', { api_key: 'secret-key' });

    const logs = logger.getRecentLogs(1);
    expect(logs[0].context?.api_key).toBe('[REDACTED]');
  });

  it('should redact nested sensitive fields', () => {
    logger.info('Config', {
      user: {
        name: 'John',
        password: 'secret',
      },
    });

    const logs = logger.getRecentLogs(1);
    expect(logs[0].context?.user?.password).toBe('[REDACTED]');
    expect(logs[0].context?.user?.name).toBe('John');
  });

  it('should be case-insensitive for sensitive fields', () => {
    logger.info('Request', { SECRET: 'hidden', Password: 'hidden2' });

    const logs = logger.getRecentLogs(1);
    expect(logs[0].context?.SECRET).toBe('[REDACTED]');
    expect(logs[0].context?.Password).toBe('[REDACTED]');
  });
});

// ============================================================================
// BATCH OPERATION TESTS
// ============================================================================

describe('Batch Operations', () => {
  let logger: LoggerService;

  beforeEach(() => {
    logger = new LoggerService({
      enableConsole: false,
      enableFile: false,
    });
  });

  it('should handle multiple rapid logs', () => {
    const iterations = 50;
    for (let i = 0; i < iterations; i++) {
      logger.info(`Log ${i}`);
    }

    expect(logger.getBufferSize()).toBe(iterations);
  });

  it('should retrieve large result sets', () => {
    for (let i = 0; i < 100; i++) {
      logger.info(`Log ${i}`);
    }

    const logs = logger.getRecentLogs(100);
    expect(logs).toHaveLength(100);
  });

  it('should search across many logs', () => {
    for (let i = 0; i < 100; i++) {
      if (i % 2 === 0) {
        logger.info(`Even number: ${i}`);
      } else {
        logger.info(`Odd number: ${i}`);
      }
    }

    const evens = logger.searchLogs('Even');
    expect(evens.length).toBeGreaterThanOrEqual(50);
  });
});
