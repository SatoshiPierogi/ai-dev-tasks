/**
 * Test Helper Utilities
 * Shared testing utilities for Jest tests
 */

import { Request, Response } from 'express';

// ============================================================================
// DATABASE HELPERS
// ============================================================================

/**
 * Reset test database (remove all data)
 * In production, use actual database reset with migration tools
 */
export async function resetTestDatabase(): Promise<void> {
  // This would be implemented with your database library
  // For now, it's a placeholder
  console.log('Test database reset');
}

/**
 * Seed test database with initial data
 */
export async function seedTestDatabase(): Promise<void> {
  console.log('Test database seeded with initial data');
}

// ============================================================================
// HTTP REQUEST HELPERS
// ============================================================================

/**
 * Create a mock Express request
 */
export function createMockRequest(overrides?: Partial<Request>): Partial<Request> {
  return {
    method: 'GET',
    url: '/',
    headers: {
      'content-type': 'application/json',
    },
    query: {},
    body: {},
    params: {},
    ...overrides,
  };
}

/**
 * Create a mock Express response with tracking
 */
export function createMockResponse(): {
  res: Partial<Response>;
  json: jest.Mock;
  status: jest.Mock;
  send: jest.Mock;
  setHeader: jest.Mock;
} {
  const res: any = {
    statusCode: 200,
    headers: {},
  };

  res.json = jest.fn((data) => {
    res.data = data;
    return res;
  });

  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });

  res.send = jest.fn((data) => {
    res.data = data;
    return res;
  });

  res.setHeader = jest.fn((key, value) => {
    res.headers[key] = value;
    return res;
  });

  return {
    res: res as Partial<Response>,
    json: res.json,
    status: res.status,
    send: res.send,
    setHeader: res.setHeader,
  };
}

// ============================================================================
// ASYNC TEST HELPERS
// ============================================================================

/**
 * Wait for a promise to settle
 */
export async function waitFor(
  fn: () => Promise<void> | void,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      await fn();
      return;
    } catch (error) {
      await sleep(interval);
    }
  }

  throw new Error(`waitFor timeout after ${timeout}ms`);
}

/**
 * Sleep for a given duration (in milliseconds)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delay?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 100 } = options;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      await sleep(delay * (i + 1)); // Exponential backoff
    }
  }

  throw new Error('Retry failed');
}

// ============================================================================
// DATA VALIDATION HELPERS
// ============================================================================

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Validate transaction hash format
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}

/**
 * Validate numeric string (for big numbers)
 */
export function isValidNumericString(value: string): boolean {
  return /^\d+$/.test(value);
}

// ============================================================================
// OBJECT COMPARISON HELPERS
// ============================================================================

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Compare two objects ignoring specified fields
 */
export function compareObjects<T extends Record<string, any>>(
  obj1: T,
  obj2: T,
  ignoreFields: string[] = []
): boolean {
  const keys1 = Object.keys(obj1).filter((k) => !ignoreFields.includes(k));
  const keys2 = Object.keys(obj2).filter((k) => !ignoreFields.includes(k));

  if (keys1.length !== keys2.length) return false;

  return keys1.every((key) => {
    const val1 = obj1[key];
    const val2 = obj2[key];

    if (typeof val1 === 'object' && typeof val2 === 'object') {
      return compareObjects(val1, val2, ignoreFields);
    }

    return val1 === val2;
  });
}

// ============================================================================
// ERROR ASSERTION HELPERS
// ============================================================================

/**
 * Assert that a function throws an error
 */
export async function expectToThrow(
  fn: () => Promise<any>,
  errorMessage?: string | RegExp
): Promise<Error> {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (errorMessage) {
      const message = error instanceof Error ? error.message : String(error);
      if (errorMessage instanceof RegExp) {
        if (!errorMessage.test(message)) {
          throw new Error(`Expected error message to match ${errorMessage}, but got "${message}"`);
        }
      } else {
        if (!message.includes(errorMessage)) {
          throw new Error(`Expected error message to include "${errorMessage}", but got "${message}"`);
        }
      }
    }
    return error as Error;
  }
}

/**
 * Assert that a function does not throw an error
 */
export async function expectNotToThrow(fn: () => Promise<any>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    throw new Error(`Expected function not to throw, but it threw: ${error}`);
  }
}

// ============================================================================
// MOCK DATA COMPARISON
// ============================================================================

/**
 * Normalize dates in object for comparison
 * Useful for comparing objects with timestamps
 */
export function normalizeDateFields<T extends Record<string, any>>(
  obj: T,
  dateFields: string[] = ['created_at', 'updated_at', 'timestamp']
): T {
  const normalized = { ...obj };

  dateFields.forEach((field) => {
    if (field in normalized && normalized[field] instanceof Date) {
      normalized[field] = normalized[field].toISOString();
    }
  });

  return normalized;
}

// ============================================================================
// DEBUGGING HELPERS
// ============================================================================

/**
 * Pretty print an object for debugging
 */
export function debug<T>(label: string, obj: T): T {
  console.log(`\n[DEBUG] ${label}:`);
  console.log(JSON.stringify(obj, null, 2));
  return obj;
}

/**
 * Assert and log differences between two objects
 */
export function assertObjectsEqual<T extends Record<string, any>>(
  actual: T,
  expected: T,
  label: string = 'Comparison'
): void {
  const differences: string[] = [];

  Object.keys(expected).forEach((key) => {
    if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
      differences.push(`${key}: expected ${expected[key]}, got ${actual[key]}`);
    }
  });

  if (differences.length > 0) {
    console.error(`\n[ERROR] ${label}:`);
    differences.forEach((diff) => console.error(`  - ${diff}`));
    throw new Error(`${label} failed with ${differences.length} difference(s)`);
  }
}

// ============================================================================
// PERFORMANCE TESTING HELPERS
// ============================================================================

/**
 * Measure execution time of a function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>,
  label: string = 'Operation'
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await fn();
  const duration = performance.now() - startTime;

  console.log(`[TIMING] ${label}: ${duration.toFixed(2)}ms`);

  return { result, duration };
}

/**
 * Assert that an operation completes within a time limit
 */
export async function expectWithinTime<T>(
  fn: () => Promise<T>,
  maxDuration: number,
  label: string = 'Operation'
): Promise<T> {
  const { result, duration } = await measureExecutionTime(fn, label);

  if (duration > maxDuration) {
    throw new Error(
      `Expected ${label} to complete within ${maxDuration}ms, but took ${duration.toFixed(2)}ms`
    );
  }

  return result;
}
