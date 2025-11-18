/**
 * Analytics Routes
 * Endpoints for accessing analytics and monitoring data
 */

import { Router, Request, Response } from 'express';
import { analyticsService, EventType } from '../services/analytics';
import { authMiddleware, adminMiddleware } from './auth'; // Assuming auth middleware exists

const router = Router();

// ============================================================================
// METRICS ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/metrics
 * Get overall system metrics
 */
router.get('/metrics', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const timeWindow = req.query.timeWindow
    ? parseInt(req.query.timeWindow as string) * 1000
    : 3600000; // 1 hour default

  const metrics = analyticsService.getMetrics(timeWindow);

  res.json({
    timeWindow,
    metrics,
    timestamp: new Date(),
  });
});

/**
 * GET /api/analytics/metrics/summary
 * Get quick summary of key metrics
 */
router.get('/metrics/summary', authMiddleware, (req: Request, res: Response) => {
  const metrics = analyticsService.getMetrics(3600000); // Last hour

  res.json({
    totalEvents: metrics.totalEvents,
    totalTransactions: metrics.totalTransactions,
    successfulTransactions: metrics.successfulTransactions,
    failedTransactions: metrics.failedTransactions,
    successRate:
      metrics.totalTransactions > 0
        ? (metrics.successfulTransactions / metrics.totalTransactions) * 100
        : 0,
    avgResponseTime: metrics.averageResponseTime.toFixed(2),
    errorRate: (metrics.errorRate * 100).toFixed(2),
    apiRequests: metrics.apiRequests,
  });
});

// ============================================================================
// USER ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/users/top
 * Get top users by activity
 */
router.get('/users/top', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
  const topUsers = analyticsService.getTopUsers(limit);

  res.json({
    count: topUsers.length,
    users: topUsers,
  });
});

/**
 * GET /api/analytics/users/:userId
 * Get analytics for specific user
 */
router.get('/users/:userId', authMiddleware, (req: Request, res: Response) => {
  const { userId } = req.params;

  // Only allow users to view their own data (or admins)
  if (req.user?.id !== userId && !req.user?.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const userAnalytics = analyticsService.getUserAnalytics(userId);
  const userEvents = analyticsService.getUserEvents(userId, 50);

  res.json({
    analytics: userAnalytics,
    recentEvents: userEvents,
  });
});

/**
 * GET /api/analytics/users/:userId/events
 * Get all events for a user
 */
router.get('/users/:userId/events', authMiddleware, (req: Request, res: Response) => {
  const { userId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

  // Only allow users to view their own data (or admins)
  if (req.user?.id !== userId && !req.user?.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const userEvents = analyticsService.getUserEvents(userId, limit);

  res.json({
    userId,
    count: userEvents.length,
    events: userEvents,
  });
});

// ============================================================================
// AGENT ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/agents/top
 * Get top agents by transaction count
 */
router.get('/agents/top', authMiddleware, (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
  const topAgents = analyticsService.getTopAgents(limit);

  res.json({
    count: topAgents.length,
    agents: topAgents,
  });
});

/**
 * GET /api/analytics/agents/:agentId
 * Get analytics for specific agent
 */
router.get('/agents/:agentId', authMiddleware, (req: Request, res: Response) => {
  const { agentId } = req.params;
  const agentAnalytics = analyticsService.getAgentAnalytics(agentId);
  const agentEvents = analyticsService.getAgentEvents(agentId, 50);

  if (!agentAnalytics) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json({
    analytics: agentAnalytics,
    recentEvents: agentEvents,
  });
});

/**
 * GET /api/analytics/agents/:agentId/events
 * Get all events for an agent
 */
router.get('/agents/:agentId/events', authMiddleware, (req: Request, res: Response) => {
  const { agentId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

  const agentEvents = analyticsService.getAgentEvents(agentId, limit);

  res.json({
    agentId,
    count: agentEvents.length,
    events: agentEvents,
  });
});

// ============================================================================
// TRANSACTION ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/transactions
 * Get transaction analytics
 */
router.get('/transactions', authMiddleware, (req: Request, res: Response) => {
  const timeWindow = req.query.timeWindow
    ? parseInt(req.query.timeWindow as string) * 1000
    : 3600000;

  const metrics = analyticsService.getMetrics(timeWindow);

  res.json({
    timeWindow,
    totalTransactions: metrics.totalTransactions,
    successfulTransactions: metrics.successfulTransactions,
    failedTransactions: metrics.failedTransactions,
    successRate:
      metrics.totalTransactions > 0
        ? (metrics.successfulTransactions / metrics.totalTransactions) * 100
        : 0,
    averageTime: metrics.averageTransactionTime.toFixed(2),
  });
});

// ============================================================================
// VERIFICATION ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/verifications
 * Get verification analytics
 */
router.get('/verifications', authMiddleware, (req: Request, res: Response) => {
  const timeWindow = req.query.timeWindow
    ? parseInt(req.query.timeWindow as string) * 1000
    : 3600000;

  const metrics = analyticsService.getMetrics(timeWindow);

  res.json({
    timeWindow,
    totalVerifications: metrics.totalVerifications,
    successfulVerifications: metrics.successfulVerifications,
    failedVerifications: metrics.failedVerifications,
    successRate:
      metrics.totalVerifications > 0
        ? (metrics.successfulVerifications / metrics.totalVerifications) * 100
        : 0,
    averageTime: metrics.averageVerificationTime.toFixed(2),
  });
});

// ============================================================================
// EVENTS ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/events
 * Get events by type
 */
router.get('/events', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const type = req.query.type as EventType | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

  let events;
  if (type) {
    events = analyticsService.getEventsByType(type, limit);
  } else {
    // Return recent events across all types
    events = analyticsService['events']
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  res.json({
    count: events.length,
    events,
  });
});

/**
 * GET /api/analytics/events/time-range
 * Get events in time range
 */
router.get('/events/time-range', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const startTime = req.query.start ? new Date(req.query.start as string) : undefined;
  const endTime = req.query.end ? new Date(req.query.end as string) : undefined;

  if (!startTime || !endTime) {
    return res.status(400).json({ error: 'start and end query parameters required' });
  }

  const events = analyticsService.getEventsByTimeRange(startTime, endTime);

  res.json({
    startTime,
    endTime,
    count: events.length,
    events,
  });
});

// ============================================================================
// ERROR TRACKING ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/errors
 * Get recent errors
 */
router.get('/errors', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const errors = analyticsService.getEventsByType(EventType.API_ERROR, 50);

  res.json({
    count: errors.length,
    errors,
  });
});

/**
 * GET /api/analytics/slow-requests
 * Get slow requests
 */
router.get('/slow-requests', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : 500;
  const slowRequests = analyticsService.getEventsByType(EventType.API_SLOW_REQUEST, 50);

  const filtered = slowRequests.filter((e) => (e.metadata?.duration || 0) > threshold);

  res.json({
    threshold,
    count: filtered.length,
    requests: filtered,
  });
});

// ============================================================================
// HEALTH & STATUS ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/health
 * Get system health based on analytics
 */
router.get('/health', authMiddleware, (req: Request, res: Response) => {
  const metrics = analyticsService.getMetrics(300000); // Last 5 minutes

  const isHealthy =
    metrics.errorRate < 0.05 && // Less than 5% errors
    metrics.averageResponseTime < 500; // Average under 500ms

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    metrics: {
      errorRate: (metrics.errorRate * 100).toFixed(2),
      avgResponseTime: metrics.averageResponseTime.toFixed(2),
      totalRequests: metrics.apiRequests,
      transactionSuccess:
        metrics.totalTransactions > 0
          ? ((metrics.successfulTransactions / metrics.totalTransactions) * 100).toFixed(2)
          : 'N/A',
    },
  });
});

export default router;
