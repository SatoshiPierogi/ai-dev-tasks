/**
 * Analytics Middleware
 * Tracks API requests, transactions, and user behavior
 */

import { Request, Response, NextFunction } from 'express';
import { analyticsService, EventType } from '../services/analytics';

// ============================================================================
// TYPES
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      analyticsStartTime?: number;
      analyticsUserId?: string;
    }
  }
}

// ============================================================================
// ANALYTICS TRACKING MIDDLEWARE
// ============================================================================

/**
 * Middleware to track all API requests
 */
export function trackApiRequests(req: Request, res: Response, next: NextFunction) {
  // Skip health check endpoints
  if (req.path === '/health' || req.path === '/readiness') {
    return next();
  }

  // Record start time
  req.analyticsStartTime = Date.now();

  // Try to extract user ID from token or session
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In a real app, would decode JWT to get user ID
      // For now, just note that we could track it
      req.analyticsUserId = 'anonymous';
    }
  } catch (error) {
    // Ignore errors in extraction
  }

  // Capture original send method
  const originalSend = res.send;

  // Override send to track response
  res.send = function (data: any) {
    // Calculate request duration
    const duration = Date.now() - (req.analyticsStartTime || Date.now());

    // Track API request event
    analyticsService.trackEvent({
      type: EventType.API_REQUEST,
      timestamp: new Date(),
      userId: req.analyticsUserId,
      data: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        query: req.query,
      },
      metadata: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        duration,
        error:
          res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined,
      },
    });

    // Track API error if applicable
    if (res.statusCode >= 400) {
      analyticsService.trackEvent({
        type: EventType.API_ERROR,
        timestamp: new Date(),
        userId: req.analyticsUserId,
        data: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
        },
        metadata: {
          ip: req.ip,
          duration,
        },
      });
    }

    // Track slow requests
    if (duration > 500) {
      analyticsService.trackEvent({
        type: EventType.API_SLOW_REQUEST,
        timestamp: new Date(),
        userId: req.analyticsUserId,
        data: {
          method: req.method,
          path: req.path,
          duration,
        },
        metadata: {
          duration,
        },
      });
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware to track user login events
 */
export function trackUserLogin(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;

  res.send = function (data: any) {
    // Track successful login
    if (res.statusCode === 200 && req.path === '/api/auth/login') {
      try {
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        if (responseData.user) {
          analyticsService.trackEvent({
            type: EventType.USER_LOGGED_IN,
            timestamp: new Date(),
            userId: responseData.user.id,
            data: {
              email: responseData.user.email,
              provider: req.body.provider || 'local',
            },
            metadata: {
              ip: req.ip,
            },
          });
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware to track user registration
 */
export function trackUserRegistration(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;

  res.send = function (data: any) {
    // Track successful registration
    if (res.statusCode === 201 && req.path === '/api/auth/register') {
      try {
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        if (responseData.user) {
          analyticsService.trackEvent({
            type: EventType.USER_REGISTERED,
            timestamp: new Date(),
            userId: responseData.user.id,
            data: {
              email: responseData.user.email,
            },
            metadata: {
              ip: req.ip,
            },
          });
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware to track agent creation/updates
 */
export function trackAgentEvents(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;

  res.send = function (data: any) {
    // Track agent creation
    if (res.statusCode === 201 && req.path === '/api/agents') {
      try {
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        if (responseData.id) {
          analyticsService.trackEvent({
            type: EventType.AGENT_CREATED,
            timestamp: new Date(),
            userId: req.analyticsUserId,
            agentId: responseData.id,
            data: {
              name: responseData.name,
              type: responseData.type,
            },
          });
        }
      } catch (error) {
        // Ignore errors
      }
    }

    // Track agent updates
    if (res.statusCode === 200 && req.path.match(/^\/api\/agents\/[\w-]+$/)) {
      try {
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        if (responseData.id) {
          analyticsService.trackEvent({
            type: EventType.AGENT_UPDATED,
            timestamp: new Date(),
            userId: req.analyticsUserId,
            agentId: responseData.id,
            data: {
              changes: req.body,
            },
          });
        }
      } catch (error) {
        // Ignore errors
      }
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware to track transaction events
 */
export function trackTransactionEvents(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;

  res.send = function (data: any) {
    // Track transaction creation
    if (res.statusCode === 201 && req.path === '/api/transactions') {
      try {
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        if (responseData.id) {
          analyticsService.trackEvent({
            type: EventType.TRANSACTION_CREATED,
            timestamp: new Date(),
            userId: req.analyticsUserId,
            agentId: responseData.agent_id,
            data: {
              txHash: responseData.tx_hash,
              protocol: responseData.protocol,
              amount: responseData.amount,
            },
          });
        }
      } catch (error) {
        // Ignore errors
      }
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware to track verification events
 */
export function trackVerificationEvents(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;

  res.send = function (data: any) {
    // Track verification started
    if (req.path.match(/^\/api\/verify\/.+$/)) {
      try {
        analyticsService.trackEvent({
          type: EventType.VERIFICATION_STARTED,
          timestamp: new Date(),
          userId: req.analyticsUserId,
          data: {
            txHash: req.params.txHash,
          },
        });
      } catch (error) {
        // Ignore errors
      }
    }

    return originalSend.call(this, data);
  };

  next();
}

// ============================================================================
// EVENT TRACKING FUNCTIONS (for manual tracking in route handlers)
// ============================================================================

/**
 * Track custom event
 */
export function trackEvent(
  type: EventType,
  userId?: string,
  agentId?: string,
  data?: Record<string, any>,
  metadata?: Record<string, any>
) {
  analyticsService.trackEvent({
    type,
    timestamp: new Date(),
    userId,
    agentId,
    data,
    metadata,
  });
}

/**
 * Track transaction verification
 */
export function trackTransactionVerified(
  userId: string | undefined,
  agentId: string,
  txHash: string,
  duration: number
) {
  analyticsService.trackEvent({
    type: EventType.TRANSACTION_VERIFIED,
    timestamp: new Date(),
    userId,
    agentId,
    data: {
      txHash,
    },
    metadata: {
      duration,
    },
  });
}

/**
 * Track transaction failure
 */
export function trackTransactionFailed(
  userId: string | undefined,
  agentId: string,
  txHash: string,
  error: string
) {
  analyticsService.trackEvent({
    type: EventType.TRANSACTION_FAILED,
    timestamp: new Date(),
    userId,
    agentId,
    data: {
      txHash,
    },
    metadata: {
      error,
    },
  });
}

/**
 * Track verification completion
 */
export function trackVerificationCompleted(
  userId: string | undefined,
  agentId: string,
  txHash: string,
  duration: number
) {
  analyticsService.trackEvent({
    type: EventType.VERIFICATION_COMPLETED,
    timestamp: new Date(),
    userId,
    agentId,
    data: {
      txHash,
    },
    metadata: {
      duration,
    },
  });
}

/**
 * Track verification failure
 */
export function trackVerificationFailed(
  userId: string | undefined,
  agentId: string,
  txHash: string,
  error: string
) {
  analyticsService.trackEvent({
    type: EventType.VERIFICATION_FAILED,
    timestamp: new Date(),
    userId,
    agentId,
    data: {
      txHash,
    },
    metadata: {
      error,
    },
  });
}
