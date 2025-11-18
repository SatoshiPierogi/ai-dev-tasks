/**
 * Express Logging Middleware
 * Logs all HTTP requests and responses with timing information
 */

import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../services/logger';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

export interface RequestLog {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  userId?: string | number;
  clientIp?: string;
}

// ============================================================================
// LOGGING MIDDLEWARE
// ============================================================================

const logger = getLogger();

/**
 * Request logging middleware
 * Captures request/response details and logs with timing
 */
export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  const requestId = req.headers['x-request-id'] || uuidv4();
  const startTime = Date.now();

  // Attach request ID to response headers
  res.setHeader('x-request-id', String(requestId));

  // Store original send function
  const originalSend = res.send;

  // Override send to capture response
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log request details
    const logContext: any = {
      requestId,
      method: req.method,
      url: sanitizeUrl(req.url),
      statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      clientIp: getClientIp(req),
    };

    // Add user ID if available
    if ((req as any).user?.walletAddress) {
      logContext.userId = (req as any).user.walletAddress;
    }

    // Determine log level based on status code
    if (statusCode >= 500) {
      logger.error(`${req.method} ${req.url} - ${statusCode}`, logContext);
    } else if (statusCode >= 400) {
      logger.warn(`${req.method} ${req.url} - ${statusCode}`, logContext);
    } else if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.url} (${duration}ms)`, logContext);
    } else {
      logger.info(`${req.method} ${req.url} - ${statusCode}`, logContext);
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Error logging middleware
 * Captures and logs errors that occur during request processing
 */
export function errorLoggingMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = res.getHeader('x-request-id') || uuidv4();

  const logContext: any = {
    requestId,
    method: req.method,
    url: sanitizeUrl(req.url),
    statusCode: err.statusCode || err.status || 500,
    clientIp: getClientIp(req),
    errorCategory: err.category || 'UNKNOWN',
    errorCode: err.code,
  };

  if ((req as any).user?.walletAddress) {
    logContext.userId = (req as any).user.walletAddress;
  }

  logger.error(`${err.message}`, logContext, err);

  // Pass error to next handler
  next(err);
}

/**
 * Request body logging middleware (for debugging)
 * Only use in development - sanitizes sensitive data
 */
export function requestBodyLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only log for specific methods
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const requestId = res.getHeader('x-request-id') || uuidv4();
  const body = sanitizeBody(req.body);

  if (Object.keys(body).length > 0) {
    logger.debug('Request body', {
      requestId,
      method: req.method,
      url: sanitizeUrl(req.url),
      body,
    });
  }

  next();
}

/**
 * Performance monitoring middleware
 * Tracks API latency and slow queries
 */
export function performanceMonitoringMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const requestId = res.getHeader('x-request-id') || uuidv4();

  // Override send to capture response and calculate performance metrics
  const originalSend = res.send;

  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log performance metrics
    if (duration > 100) {
      const severity = duration > 5000 ? 'error' : duration > 1000 ? 'warn' : 'info';

      const message =
        `Slow API response: ${req.method} ${req.url} (${duration}ms)`;

      logger[severity as any](message, {
        requestId,
        duration,
        statusCode,
        method: req.method,
        url: sanitizeUrl(req.url),
      });
    }

    return originalSend.call(this, data);
  };

  next();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  const xForwardedFor = req.headers['x-forwarded-for'];

  if (xForwardedFor) {
    return Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0];
  }

  return req.socket.remoteAddress || 'unknown';
}

/**
 * Sanitize URL to remove sensitive query parameters
 */
function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url, 'http://localhost');

    // Remove sensitive query parameters
    const sensitiveParams = ['token', 'api_key', 'secret', 'password'];
    const params = urlObj.searchParams;

    for (const param of sensitiveParams) {
      if (params.has(param)) {
        params.set(param, '[REDACTED]');
      }
    }

    return urlObj.pathname + (params.toString() ? '?' + params.toString() : '');
  } catch {
    return url;
  }
}

/**
 * Sanitize request body to remove sensitive fields
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = JSON.parse(JSON.stringify(body));
  const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'signature', 'privateKey'];

  const sanitizeObject = (obj: any) => {
    for (const key of Object.keys(obj)) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  sanitizeObject(sanitized);
  return sanitized;
}

/**
 * Create request log entry (for manual logging)
 */
export function createRequestLog(req: Request, res: Response, duration: number): RequestLog {
  return {
    requestId: String(res.getHeader('x-request-id') || 'unknown'),
    method: req.method,
    url: sanitizeUrl(req.url),
    statusCode: res.statusCode,
    duration,
    userAgent: req.headers['user-agent'],
    clientIp: getClientIp(req),
    userId: (req as any).user?.walletAddress,
  };
}

/**
 * Export log context for use in other services
 */
export function getLogContext(req: Request, res: Response): Record<string, any> {
  return {
    requestId: res.getHeader('x-request-id'),
    userId: (req as any).user?.walletAddress,
    method: req.method,
    url: sanitizeUrl(req.url),
    clientIp: getClientIp(req),
  };
}
