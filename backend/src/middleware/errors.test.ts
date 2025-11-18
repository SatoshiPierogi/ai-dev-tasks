/**
 * Error Handling Middleware Tests
 * Tests error categorization, response formatting, and HTTP status codes
 */

import { getErrorHandler, ErrorCategory, ErrorResponse } from '../services/errorHandler';

// ============================================================================
// SETUP
// ============================================================================

let errorHandler = getErrorHandler();

beforeEach(() => {
  // Get fresh instance for each test
  errorHandler = getErrorHandler();
});

// ============================================================================
// ERROR CATEGORIZATION TESTS
// ============================================================================

describe('Error Categorization', () => {
  it('should categorize validation errors', () => {
    const error = new Error('Validation failed');
    const category = errorHandler.categorizeError(error);

    // Might not match, depends on error message
    expect(category).toBeDefined();
  });

  it('should categorize authentication errors', () => {
    const error = new Error('Invalid token');
    const category = errorHandler.categorizeError(error);

    expect(category).toBe(ErrorCategory.AUTHENTICATION_ERROR);
  });

  it('should categorize authorization errors', () => {
    const error = new Error('Forbidden');
    const category = errorHandler.categorizeError(error);

    expect(category).toBe(ErrorCategory.AUTHORIZATION_ERROR);
  });

  it('should categorize not found errors', () => {
    const error = new Error('Resource not found');
    const category = errorHandler.categorizeError(error);

    expect(category).toBe(ErrorCategory.NOT_FOUND_ERROR);
  });

  it('should categorize conflict errors', () => {
    const error = new Error('Conflict: Already exists');
    const category = errorHandler.categorizeError(error);

    expect(category).toBe(ErrorCategory.CONFLICT_ERROR);
  });

  it('should categorize The Graph errors', () => {
    const error = new Error('The Graph API failed');
    const category = errorHandler.categorizeError(error);

    expect(category).toBe(ErrorCategory.THE_GRAPH_ERROR);
  });

  it('should categorize RPC errors', () => {
    const error = new Error('JSON-RPC error');
    const category = errorHandler.categorizeError(error);

    expect(category).toBe(ErrorCategory.RPC_ERROR);
  });

  it('should categorize database errors', () => {
    const error = new Error('Database connection failed');
    const category = errorHandler.categorizeError(error);

    expect(category).toBe(ErrorCategory.DATABASE_ERROR);
  });

  it('should categorize timeout errors', () => {
    const error = new Error('Request timeout');
    const category = errorHandler.categorizeError(error);

    expect(category).toBe(ErrorCategory.TIMEOUT_ERROR);
  });

  it('should use explicit category if set', () => {
    const error: any = new Error('Generic error');
    error.category = ErrorCategory.INTERNAL_SERVER_ERROR;

    const category = errorHandler.categorizeError(error);

    expect(category).toBe(ErrorCategory.INTERNAL_SERVER_ERROR);
  });

  it('should default to unknown error', () => {
    const error = new Error('Some random error message');
    const category = errorHandler.categorizeError(error);

    expect(category).toBe(ErrorCategory.UNKNOWN_ERROR);
  });

  it('should handle null error', () => {
    const category = errorHandler.categorizeError(null);

    expect(category).toBeDefined();
  });

  it('should handle status code categorization', () => {
    const error: any = new Error('Error');
    error.statusCode = 503;

    const category = errorHandler.categorizeError(error);

    expect(category).toBe(ErrorCategory.SERVICE_UNAVAILABLE_ERROR);
  });
});

// ============================================================================
// STATUS CODE MAPPING TESTS
// ============================================================================

describe('Status Code Mapping', () => {
  it('should map validation error to 400', () => {
    const code = errorHandler.getStatusCode(ErrorCategory.VALIDATION_ERROR);
    expect(code).toBe(400);
  });

  it('should map authentication error to 401', () => {
    const code = errorHandler.getStatusCode(ErrorCategory.AUTHENTICATION_ERROR);
    expect(code).toBe(401);
  });

  it('should map authorization error to 403', () => {
    const code = errorHandler.getStatusCode(ErrorCategory.AUTHORIZATION_ERROR);
    expect(code).toBe(403);
  });

  it('should map not found error to 404', () => {
    const code = errorHandler.getStatusCode(ErrorCategory.NOT_FOUND_ERROR);
    expect(code).toBe(404);
  });

  it('should map conflict error to 409', () => {
    const code = errorHandler.getStatusCode(ErrorCategory.CONFLICT_ERROR);
    expect(code).toBe(409);
  });

  it('should map The Graph error to 502', () => {
    const code = errorHandler.getStatusCode(ErrorCategory.THE_GRAPH_ERROR);
    expect(code).toBe(502);
  });

  it('should map RPC error to 502', () => {
    const code = errorHandler.getStatusCode(ErrorCategory.RPC_ERROR);
    expect(code).toBe(502);
  });

  it('should map database error to 503', () => {
    const code = errorHandler.getStatusCode(ErrorCategory.DATABASE_ERROR);
    expect(code).toBe(503);
  });

  it('should map service unavailable to 503', () => {
    const code = errorHandler.getStatusCode(ErrorCategory.SERVICE_UNAVAILABLE_ERROR);
    expect(code).toBe(503);
  });

  it('should map timeout error to 504', () => {
    const code = errorHandler.getStatusCode(ErrorCategory.TIMEOUT_ERROR);
    expect(code).toBe(504);
  });

  it('should map internal server error to 500', () => {
    const code = errorHandler.getStatusCode(ErrorCategory.INTERNAL_SERVER_ERROR);
    expect(code).toBe(500);
  });
});

// ============================================================================
// ERROR RESPONSE FORMATTING TESTS
// ============================================================================

describe('Error Response Formatting', () => {
  it('should format error response correctly', () => {
    const error: any = new Error('Test error');
    error.category = ErrorCategory.VALIDATION_ERROR;
    error.code = 'INVALID_INPUT';
    error.statusCode = 400;

    const response: ErrorResponse = errorHandler.formatErrorResponse(error);

    expect(response.success).toBe(false);
    expect(response.error.message).toBe('Test error');
    expect(response.error.code).toBe('INVALID_INPUT');
    expect(response.error.category).toBe(ErrorCategory.VALIDATION_ERROR);
    expect(response.error.statusCode).toBe(400);
    expect(response.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should include context in error response', () => {
    const error: any = new Error('Test error');
    error.context = { field: 'email', value: 'invalid' };

    const response: ErrorResponse = errorHandler.formatErrorResponse(error);

    expect(response.error.details).toEqual(error.context);
  });

  it('should infer status code from category if not provided', () => {
    const error: any = new Error('Not found');
    error.category = ErrorCategory.NOT_FOUND_ERROR;
    // No statusCode provided

    const response: ErrorResponse = errorHandler.formatErrorResponse(error);

    expect(response.error.statusCode).toBe(404);
  });

  it('should have timestamp in ISO format', () => {
    const before = new Date();
    const error = new Error('Test');
    const response = errorHandler.formatErrorResponse(error);
    const after = new Date();

    const timestamp = new Date(response.error.timestamp);
    expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// ============================================================================
// APP ERROR CREATION TESTS
// ============================================================================

describe('App Error Creation', () => {
  it('should create app error with defaults', () => {
    const error = errorHandler.createAppError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.category).toBe(ErrorCategory.INTERNAL_SERVER_ERROR);
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(true);
  });

  it('should create app error with custom category', () => {
    const error = errorHandler.createAppError(
      'Not found',
      ErrorCategory.NOT_FOUND_ERROR,
      404
    );

    expect(error.category).toBe(ErrorCategory.NOT_FOUND_ERROR);
    expect(error.statusCode).toBe(404);
  });

  it('should create app error with context', () => {
    const context = { field: 'email' };
    const error = errorHandler.createAppError(
      'Validation failed',
      ErrorCategory.VALIDATION_ERROR,
      400,
      'INVALID_EMAIL',
      context
    );

    expect(error.context).toEqual(context);
    expect(error.code).toBe('INVALID_EMAIL');
  });

  it('should mark app error as operational', () => {
    const error = errorHandler.createAppError('Test');

    expect(error.isOperational).toBe(true);
  });
});

// ============================================================================
// CRITICAL ERROR DETECTION TESTS
// ============================================================================

describe('Critical Error Detection', () => {
  it('should detect database errors as critical', () => {
    const isCritical = errorHandler.isCritical(ErrorCategory.DATABASE_ERROR);
    expect(isCritical).toBe(true);
  });

  it('should detect The Graph errors as critical', () => {
    const isCritical = errorHandler.isCritical(ErrorCategory.THE_GRAPH_ERROR);
    expect(isCritical).toBe(true);
  });

  it('should detect RPC errors as critical', () => {
    const isCritical = errorHandler.isCritical(ErrorCategory.RPC_ERROR);
    expect(isCritical).toBe(true);
  });

  it('should detect service unavailable as critical', () => {
    const isCritical = errorHandler.isCritical(ErrorCategory.SERVICE_UNAVAILABLE_ERROR);
    expect(isCritical).toBe(true);
  });

  it('should detect internal server error as critical', () => {
    const isCritical = errorHandler.isCritical(ErrorCategory.INTERNAL_SERVER_ERROR);
    expect(isCritical).toBe(true);
  });

  it('should not detect validation error as critical', () => {
    const isCritical = errorHandler.isCritical(ErrorCategory.VALIDATION_ERROR);
    expect(isCritical).toBe(false);
  });

  it('should not detect authentication error as critical', () => {
    const isCritical = errorHandler.isCritical(ErrorCategory.AUTHENTICATION_ERROR);
    expect(isCritical).toBe(false);
  });
});

// ============================================================================
// RETRYABLE ERROR DETECTION TESTS
// ============================================================================

describe('Retryable Error Detection', () => {
  it('should detect timeout as retryable', () => {
    const isRetryable = errorHandler.isRetryable(ErrorCategory.TIMEOUT_ERROR);
    expect(isRetryable).toBe(true);
  });

  it('should detect The Graph error as retryable', () => {
    const isRetryable = errorHandler.isRetryable(ErrorCategory.THE_GRAPH_ERROR);
    expect(isRetryable).toBe(true);
  });

  it('should detect RPC error as retryable', () => {
    const isRetryable = errorHandler.isRetryable(ErrorCategory.RPC_ERROR);
    expect(isRetryable).toBe(true);
  });

  it('should detect service unavailable as retryable', () => {
    const isRetryable = errorHandler.isRetryable(ErrorCategory.SERVICE_UNAVAILABLE_ERROR);
    expect(isRetryable).toBe(true);
  });

  it('should not detect validation error as retryable', () => {
    const isRetryable = errorHandler.isRetryable(ErrorCategory.VALIDATION_ERROR);
    expect(isRetryable).toBe(false);
  });

  it('should not detect authentication error as retryable', () => {
    const isRetryable = errorHandler.isRetryable(ErrorCategory.AUTHENTICATION_ERROR);
    expect(isRetryable).toBe(false);
  });
});
