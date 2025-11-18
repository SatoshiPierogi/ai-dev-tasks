/**
 * Error Handler Service
 * Categorizes errors and formats standardized error responses
 */

import { getLogger } from './logger';

// ============================================================================
// TYPES
// ============================================================================

export enum ErrorCategory {
  // Client errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  BAD_REQUEST_ERROR = 'BAD_REQUEST_ERROR',

  // Integration errors
  THE_GRAPH_ERROR = 'THE_GRAPH_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE_ERROR = 'SERVICE_UNAVAILABLE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError extends Error {
  category: ErrorCategory;
  statusCode: number;
  code: string;
  context?: Record<string, any>;
  isOperational: boolean;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    category: ErrorCategory;
    statusCode: number;
    details?: Record<string, any>;
    timestamp: string;
  };
}

// ============================================================================
// ERROR CATEGORIZATION
// ============================================================================

const ERROR_CATEGORY_MAP: Record<string, ErrorCategory> = {
  // Validation errors
  'VALIDATION_ERROR': ErrorCategory.VALIDATION_ERROR,
  'Invalid input': ErrorCategory.VALIDATION_ERROR,
  'Schema validation failed': ErrorCategory.VALIDATION_ERROR,

  // Auth errors
  'Unauthorized': ErrorCategory.AUTHENTICATION_ERROR,
  'Invalid token': ErrorCategory.AUTHENTICATION_ERROR,
  'Missing token': ErrorCategory.AUTHENTICATION_ERROR,

  // Authorization errors
  'Forbidden': ErrorCategory.AUTHORIZATION_ERROR,
  'Insufficient permissions': ErrorCategory.AUTHORIZATION_ERROR,

  // Not found
  'Not found': ErrorCategory.NOT_FOUND_ERROR,
  'Resource not found': ErrorCategory.NOT_FOUND_ERROR,

  // Conflict
  'Conflict': ErrorCategory.CONFLICT_ERROR,
  'Already exists': ErrorCategory.CONFLICT_ERROR,

  // The Graph errors
  'The Graph': ErrorCategory.THE_GRAPH_ERROR,
  'Subgraph': ErrorCategory.THE_GRAPH_ERROR,
  'GraphQL': ErrorCategory.THE_GRAPH_ERROR,

  // RPC errors
  'RPC': ErrorCategory.RPC_ERROR,
  'Provider': ErrorCategory.RPC_ERROR,
  'JSON-RPC': ErrorCategory.RPC_ERROR,

  // Database errors
  'Database': ErrorCategory.DATABASE_ERROR,
  'PostgreSQL': ErrorCategory.DATABASE_ERROR,
  'ECONNREFUSED': ErrorCategory.DATABASE_ERROR,

  // Timeout errors
  'Timeout': ErrorCategory.TIMEOUT_ERROR,
  'ECONNABORTED': ErrorCategory.TIMEOUT_ERROR,
  'deadline exceeded': ErrorCategory.TIMEOUT_ERROR,

  // Service unavailable
  '503': ErrorCategory.SERVICE_UNAVAILABLE_ERROR,
  '502': ErrorCategory.SERVICE_UNAVAILABLE_ERROR,
};

// ============================================================================
// ERROR HANDLER
// ============================================================================

export class ErrorHandler {
  private logger = getLogger();

  /**
   * Create standardized app error
   */
  createAppError(
    message: string,
    category: ErrorCategory = ErrorCategory.INTERNAL_SERVER_ERROR,
    statusCode: number = 500,
    code: string = category,
    context?: Record<string, any>
  ): AppError {
    const error = new Error(message) as AppError;

    error.category = category;
    error.statusCode = statusCode;
    error.code = code;
    error.context = context;
    error.isOperational = true;
    error.name = category;

    return error;
  }

  /**
   * Categorize an error
   */
  categorizeError(error: any): ErrorCategory {
    const message = error.message || error.toString();
    const stack = error.stack || '';

    // Check explicit category if already set
    if ((error as any).category) {
      return (error as any).category;
    }

    // Check message for known patterns
    for (const [pattern, category] of Object.entries(ERROR_CATEGORY_MAP)) {
      if (message.includes(pattern) || stack.includes(pattern)) {
        return category;
      }
    }

    // Check status code
    const statusCode = error.statusCode || error.status;
    if (statusCode) {
      if (statusCode >= 400 && statusCode < 500) {
        return ErrorCategory.BAD_REQUEST_ERROR;
      }
      if (statusCode >= 500) {
        return ErrorCategory.INTERNAL_SERVER_ERROR;
      }
    }

    return ErrorCategory.UNKNOWN_ERROR;
  }

  /**
   * Get HTTP status code for error category
   */
  getStatusCode(category: ErrorCategory): number {
    const statusCodes: Record<ErrorCategory, number> = {
      [ErrorCategory.VALIDATION_ERROR]: 400,
      [ErrorCategory.AUTHENTICATION_ERROR]: 401,
      [ErrorCategory.AUTHORIZATION_ERROR]: 403,
      [ErrorCategory.NOT_FOUND_ERROR]: 404,
      [ErrorCategory.CONFLICT_ERROR]: 409,
      [ErrorCategory.BAD_REQUEST_ERROR]: 400,
      [ErrorCategory.THE_GRAPH_ERROR]: 502,
      [ErrorCategory.RPC_ERROR]: 502,
      [ErrorCategory.DATABASE_ERROR]: 503,
      [ErrorCategory.EXTERNAL_API_ERROR]: 502,
      [ErrorCategory.INTERNAL_SERVER_ERROR]: 500,
      [ErrorCategory.SERVICE_UNAVAILABLE_ERROR]: 503,
      [ErrorCategory.TIMEOUT_ERROR]: 504,
      [ErrorCategory.UNKNOWN_ERROR]: 500,
    };

    return statusCodes[category];
  }

  /**
   * Check if error is critical (should trigger alerts)
   */
  isCritical(category: ErrorCategory): boolean {
    const criticalCategories = [
      ErrorCategory.DATABASE_ERROR,
      ErrorCategory.THE_GRAPH_ERROR,
      ErrorCategory.RPC_ERROR,
      ErrorCategory.SERVICE_UNAVAILABLE_ERROR,
      ErrorCategory.INTERNAL_SERVER_ERROR,
    ];

    return criticalCategories.includes(category);
  }

  /**
   * Format error for response
   */
  formatErrorResponse(error: any): ErrorResponse {
    const category = this.categorizeError(error);
    const statusCode = (error as any).statusCode || this.getStatusCode(category);
    const code = (error as any).code || category;
    const message = error.message || 'An unexpected error occurred';
    const context = (error as any).context;

    return {
      success: false,
      error: {
        message,
        code,
        category,
        statusCode,
        details: context,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Log error with appropriate level
   */
  logError(error: any, context?: Record<string, any>): void {
    const category = this.categorizeError(error);
    const isCritical = this.isCritical(category);
    const message = `${category}: ${error.message}`;

    if (isCritical) {
      this.logger.error(message, { ...context, category, code: (error as any).code }, error);
    } else {
      this.logger.warn(message, { ...context, category });
    }
  }

  /**
   * Handle uncaught error
   */
  handleUncaughtError(error: unknown): AppError {
    const message = error instanceof Error ? error.message : String(error);
    const category = this.categorizeError(error);
    const appError = this.createAppError(message, category);

    this.logError(error, { uncaught: true });

    return appError;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(category: ErrorCategory): boolean {
    const retryableCategories = [
      ErrorCategory.TIMEOUT_ERROR,
      ErrorCategory.THE_GRAPH_ERROR,
      ErrorCategory.RPC_ERROR,
      ErrorCategory.SERVICE_UNAVAILABLE_ERROR,
    ];

    return retryableCategories.includes(category);
  }
}

/**
 * Singleton instance
 */
let instance: ErrorHandler | null = null;

export function getErrorHandler(): ErrorHandler {
  if (!instance) {
    instance = new ErrorHandler();
  }
  return instance;
}

export function resetErrorHandler(): void {
  instance = null;
}
