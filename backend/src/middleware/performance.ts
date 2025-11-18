/**
 * Performance Middleware
 * Tracks performance metrics for all requests
 */

import { Request, Response, NextFunction } from 'express';
import { performanceMonitor } from '../services/performance-monitor';

// ============================================================================
// PERFORMANCE TRACKING MIDDLEWARE
// ============================================================================

/**
 * Middleware to track request performance
 */
export function performanceTracking(req: Request, res: Response, next: NextFunction) {
  // Ignore health check endpoints
  if (req.path === '/health' || req.path === '/readiness') {
    return next();
  }

  // Record start time
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed;

  // Capture original send method
  const originalSend = res.send;

  // Override send to capture response
  res.send = function (data: any) {
    // Record end time and metrics
    const duration = performance.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = endMemory - startMemory;

    // Log slow requests
    if (duration > 200) {
      console.warn(
        `Slow request: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`
      );
    }

    // Record metric
    performanceMonitor.recordMetric({
      timestamp: new Date(),
      method: req.method,
      path: req.path,
      duration,
      statusCode: res.statusCode,
      memoryUsage: memoryUsed,
      dbQueries: (req as any).dbQueries,
      cacheHits: (req as any).cacheHits,
      cacheMisses: (req as any).cacheMisses,
    });

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Endpoint to get performance metrics
 */
export function getPerformanceMetrics(req: Request, res: Response) {
  const timeWindow = req.query.timeWindow
    ? parseInt(req.query.timeWindow as string) * 1000
    : 3600000;

  const summary = performanceMonitor.getSummary(timeWindow);

  res.json({
    summary,
    timestamp: new Date(),
  });
}

/**
 * Endpoint to get metrics by path
 */
export function getMetricsByPath(req: Request, res: Response) {
  const { path } = req.params;
  const timeWindow = req.query.timeWindow
    ? parseInt(req.query.timeWindow as string) * 1000
    : 3600000;

  const summary = performanceMonitor.getMetricsByPath(path, timeWindow);

  res.json({
    path,
    summary,
    timestamp: new Date(),
  });
}

/**
 * Endpoint to get slow requests
 */
export function getSlowRequests(req: Request, res: Response) {
  const threshold = req.query.threshold
    ? parseInt(req.query.threshold as string)
    : 200;

  const slowRequests = performanceMonitor.getSlowRequests(threshold);

  res.json({
    threshold,
    count: slowRequests.length,
    requests: slowRequests,
  });
}

/**
 * Endpoint to get error requests
 */
export function getErrorRequests(req: Request, res: Response) {
  const errorRequests = performanceMonitor.getErrorRequests(10);

  res.json({
    count: errorRequests.length,
    requests: errorRequests,
  });
}

/**
 * Middleware to track database queries
 */
export function trackDatabaseQueries(req: Request, res: Response, next: NextFunction) {
  (req as any).dbQueries = 0;

  // Intercept database calls (implementation depends on your DB client)
  // This is a placeholder - actual implementation would hook into your DB driver

  next();
}

/**
 * Middleware to track cache operations
 */
export function trackCacheOperations(req: Request, res: Response, next: NextFunction) {
  (req as any).cacheHits = 0;
  (req as any).cacheMisses = 0;

  // Placeholder - actual implementation would hook into your cache service

  next();
}

/**
 * Middleware for request logging
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const method = req.method;
  const path = req.path;
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] ${method} ${path}`);

  next();
}

/**
 * Health check endpoint
 */
export function healthCheck(req: Request, res: Response) {
  const summary = performanceMonitor.getSummary(60000); // Last minute

  const isHealthy =
    summary.errorRate < 0.05 && // Less than 5% errors
    summary.avgDuration < 1000; // Average under 1 second

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date(),
    metrics: {
      totalRequests: summary.totalRequests,
      avgDuration: summary.avgDuration.toFixed(2),
      errorRate: (summary.errorRate * 100).toFixed(2),
      memory: (summary.peakMemory / 1024 / 1024).toFixed(2),
    },
  });
}

/**
 * Readiness check endpoint
 */
export function readinessCheck(req: Request, res: Response) {
  // Check database connection
  // Check cache connection
  // Check external services

  const isReady = true; // Placeholder - implement actual checks

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not ready',
    timestamp: new Date(),
  });
}
