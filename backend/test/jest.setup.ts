/**
 * Jest Global Setup
 * Runs before all tests
 */

import 'jest-extended';

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/agent_audit_test';
process.env.JWT_SECRET = 'test_secret_key_12345';
process.env.WEBHOOK_SECRET = 'webhook_secret_test_key';

// ============================================================================
// GLOBAL TEST UTILITIES
// ============================================================================

// Add custom matchers
expect.extend({
  toBeValidEthereumAddress(received) {
    const pass = /^0x[0-9a-fA-F]{40}$/.test(received);
    return {
      pass,
      message: () =>
        `expected ${received} to be a valid Ethereum address`,
    };
  },
  toBeValidTxHash(received) {
    const pass = /^0x[0-9a-fA-F]{64}$/.test(received);
    return {
      pass,
      message: () =>
        `expected ${received} to be a valid transaction hash`,
    };
  },
  toBeVerificationStatus(received) {
    const validStatuses = ['pending', 'verified', 'unverified', 'error'];
    const pass = validStatuses.includes(received);
    return {
      pass,
      message: () =>
        `expected ${received} to be one of ${validStatuses.join(', ')}`,
    };
  },
});

// Global test timeout
jest.setTimeout(10000);

// Suppress console methods during tests (can be re-enabled with debug flag)
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

beforeAll(() => {
  if (process.env.DEBUG !== 'true') {
    console.error = jest.fn();
    console.warn = jest.fn();
    console.log = jest.fn();
  }
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});

// ============================================================================
// MOCK GLOBAL OBJECTS
// ============================================================================

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock Date.now for consistent timestamps
const originalDateNow = Date.now;
let mockTime = 1642000000000; // Fixed timestamp for consistency

global.Date.now = jest.fn(() => mockTime);

// Export utility to set mock time for tests
export const setMockTime = (timestamp: number) => {
  mockTime = timestamp;
};

export const resetMockTime = () => {
  mockTime = originalDateNow();
};

// ============================================================================
// DISPLAY TEST INFO
// ============================================================================

console.log('✓ Jest test environment configured');
console.log(`✓ Database: ${process.env.DATABASE_URL}`);
console.log(`✓ Environment: ${process.env.NODE_ENV}`);
