# Analytics & Monitoring Guide

Agent Audit Dashboard - Comprehensive analytics, event tracking, and real-time monitoring setup.

## Table of Contents

1. [Overview](#overview)
2. [Analytics Architecture](#analytics-architecture)
3. [Event Types](#event-types)
4. [Backend Analytics](#backend-analytics)
5. [Frontend Tracking](#frontend-tracking)
6. [Analytics Dashboard](#analytics-dashboard)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Data Retention](#data-retention)
9. [API Reference](#api-reference)

---

## Overview

The Agent Audit Dashboard provides comprehensive analytics and monitoring:

- **Event Tracking**: User actions, transactions, verifications, API calls
- **Real-Time Metrics**: Live dashboards showing system health
- **User Analytics**: Behavior tracking per user and agent
- **Performance Monitoring**: API response times, error rates
- **Business Analytics**: Transaction success rates, verification metrics
- **Alerting System**: Threshold-based notifications

---

## Analytics Architecture

### Three-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: User Interactions & Page Views                    │
│ (useAnalytics hook, event tracking)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓ HTTP POST /api/analytics/track
┌─────────────────────────────────────────────────────────────┐
│ Backend: Event Collection & Processing                      │
│ (AnalyticsService, middleware)                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓ In-Memory Storage + Aggregation
┌─────────────────────────────────────────────────────────────┐
│ Analytics Endpoints: Metrics Retrieval & Dashboards         │
│ (/api/analytics/metrics, /api/analytics/users, etc.)        │
└─────────────────────────────────────────────────────────────┘
```

### Event Flow

```
1. User Action (click, submit, etc.)
   ↓
2. Frontend Hook (useAnalytics)
   ↓
3. HTTP Request to Backend
   ↓
4. Analytics Middleware
   ↓
5. AnalyticsService (in-memory storage)
   ↓
6. Event Aggregation & Metrics
   ↓
7. Available via Analytics API
```

---

## Event Types

### User Events

```typescript
USER_REGISTERED     // New user created account
USER_LOGGED_IN      // User logged in
USER_LOGGED_OUT     // User logged out
USER_PROFILE_UPDATED// User updated profile
```

### Agent Events

```typescript
AGENT_CREATED       // New agent created
AGENT_UPDATED       // Agent configuration changed
AGENT_DELETED       // Agent deleted
AGENT_ENABLED       // Agent enabled
AGENT_DISABLED      // Agent disabled
```

### Transaction Events

```typescript
TRANSACTION_CREATED // New transaction added
TRANSACTION_VERIFIED// Transaction verified successfully
TRANSACTION_FAILED  // Transaction verification failed
```

### Verification Events

```typescript
VERIFICATION_STARTED   // Verification process started
VERIFICATION_COMPLETED // Verification completed successfully
VERIFICATION_FAILED    // Verification failed
```

### API Events

```typescript
API_REQUEST        // API request made
API_ERROR          // API request resulted in error
API_SLOW_REQUEST   // Request exceeded 500ms threshold
```

### WebSocket Events

```typescript
WEBSOCKET_CONNECTED    // WebSocket connected
WEBSOCKET_DISCONNECTED // WebSocket disconnected
WEBSOCKET_ERROR        // WebSocket error occurred
```

---

## Backend Analytics

### AnalyticsService

Central service for event collection and aggregation:

```typescript
import { analyticsService, EventType } from './services/analytics';

// Track an event
analyticsService.trackEvent({
  type: EventType.TRANSACTION_VERIFIED,
  timestamp: new Date(),
  userId: 'user-123',
  agentId: 'agent-456',
  data: { txHash: '0x...' },
  metadata: { duration: 1500 }
});

// Get metrics
const metrics = analyticsService.getMetrics(3600000); // Last hour
console.log(metrics.totalTransactions);
console.log(metrics.successRate);

// Get user analytics
const userAnalytics = analyticsService.getUserAnalytics('user-123');
console.log(userAnalytics.totalEvents);
```

### Analytics Middleware

Automatic event tracking for API requests:

```typescript
import {
  trackApiRequests,
  trackUserLogin,
  trackAgentEvents,
  trackTransactionEvents
} from './middleware/analytics';

// Apply middleware to Express app
app.use(trackApiRequests);           // Track all API calls
app.use(trackUserLogin);             // Track login events
app.use(trackAgentEvents);           // Track agent changes
app.use(trackTransactionEvents);     // Track transactions
```

### Manual Event Tracking

In route handlers:

```typescript
import { trackEvent, trackTransactionVerified } from './middleware/analytics';

// Track custom events
trackEvent(
  EventType.AGENT_CREATED,
  userId,
  agentId,
  { name: 'My Agent' }
);

// Track transaction verification
trackTransactionVerified(
  userId,
  agentId,
  txHash,
  duration
);

// Track errors
trackEvent(
  EventType.API_ERROR,
  userId,
  undefined,
  { method: 'GET', path: '/api/agents', status: 500 }
);
```

---

## Frontend Tracking

### useAnalytics Hook

Main hook for frontend event tracking:

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function MyComponent() {
  const {
    trackEvent,
    trackPageView,
    trackButtonClick,
    trackFormSubmit,
    trackError,
    sessionId
  } = useAnalytics();

  // Track page view
  useEffect(() => {
    trackPageView('dashboard');
  }, []);

  // Track button click
  const handleClick = () => {
    trackButtonClick('create-agent', { agentType: 'arbitrage' });
  };

  // Track form submission
  const handleSubmit = (data) => {
    trackFormSubmit('agent-form', { agentName: data.name });
  };

  // Track errors
  const handleError = (error) => {
    trackError(error, 'agent-creation');
  };

  return (
    <>
      <button onClick={handleClick}>Create Agent</button>
      <form onSubmit={handleSubmit}>...</form>
    </>
  );
}
```

### Specialized Hooks

**Page View Tracking**:
```typescript
import { usePageView } from '@/hooks/useAnalytics';

function DashboardPage() {
  usePageView('dashboard');  // Auto-tracks page views
  // ...
}
```

**Form Tracking**:
```typescript
import { useFormTracking } from '@/hooks/useAnalytics';

function AgentForm() {
  const { trackFormSubmit, trackFormError, trackFieldChange } =
    useFormTracking('agent-form');

  return (
    <form onSubmit={() => trackFormSubmit()}>
      <input onChange={(e) => trackFieldChange('name', e.target.value)} />
    </form>
  );
}
```

**Component Interaction Tracking**:
```typescript
import { useComponentTracking } from '@/hooks/useAnalytics';

function AgentCard({ agent }) {
  const { trackInteraction } = useComponentTracking('agent-card');

  return (
    <button onClick={() => trackInteraction('view-details', { agentId: agent.id })}>
      View Details
    </button>
  );
}
```

---

## Analytics Dashboard

### Admin Dashboard

View comprehensive system analytics:

```typescript
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';

function AdminPage() {
  return (
    <AnalyticsDashboard
      refreshInterval={30000}  // Refresh every 30 seconds
      isAdmin={true}           // Show admin-only metrics
    />
  );
}
```

### Displayed Metrics

**Key Metrics**:
- Total Events (last hour/day/week)
- Transaction Counts & Success Rate
- API Performance (response time, error rate)
- System Health Status

**User Analytics**:
- Top users by activity
- User event breakdown
- User transaction history
- Last activity timestamp

**Agent Analytics**:
- Top agents by transactions
- Success rates per agent
- Transaction volume trends
- Agent performance metrics

---

## Monitoring & Alerts

### Alert Thresholds

Configure monitoring thresholds:

```typescript
import { analyticsService } from './services/analytics';

// Add alert for high error rate
analyticsService.addThreshold({
  metric: 'error_rate',
  threshold: 0.05,  // 5% errors
  severity: 'critical',
  action: (value) => {
    sendAlert(`Error rate critical: ${(value * 100).toFixed(2)}%`);
  }
});

// Add alert for slow responses
analyticsService.addThreshold({
  metric: 'response_time',
  threshold: 500,    // 500ms
  severity: 'warning',
  action: (value) => {
    console.warn(`Slow response detected: ${value}ms`);
  }
});

// Add alert for high transaction failure rate
analyticsService.addThreshold({
  metric: 'transaction_failure_rate',
  threshold: 0.1,    // 10% failures
  severity: 'warning',
});
```

### Alert Actions

```typescript
function sendAlert(message: string) {
  // Send notification to admin
  fetch('/api/notifications/send', {
    method: 'POST',
    body: JSON.stringify({
      type: 'alert',
      title: 'System Alert',
      message,
      severity: 'critical'
    })
  });

  // Log alert
  console.error('ALERT:', message);

  // Optionally trigger incident management
  // incident.create({ title: message, severity: 'critical' });
}
```

### Health Status

Monitor overall system health:

```typescript
async function checkSystemHealth() {
  const response = await fetch('/api/analytics/health');
  const health = await response.json();

  console.log('System Health:', health.status);
  console.log('Error Rate:', health.metrics.errorRate);
  console.log('Response Time:', health.metrics.avgResponseTime);
}
```

---

## Data Retention

### In-Memory Storage

Current system keeps last 100,000 events in memory:

```typescript
// Metrics are calculated from recent events
const metrics = analyticsService.getMetrics(3600000);  // Last hour
const userAnalytics = analyticsService.getUserAnalytics(userId);
```

### Future: Persistent Storage

For production, recommend:

1. **Time-Series Database** (InfluxDB, TimescaleDB)
   - Store detailed metrics
   - Efficient aggregation queries
   - Long-term retention

2. **Event Log Database** (PostgreSQL)
   - Detailed event audit trail
   - User behavior analysis
   - Compliance reporting

3. **Data Warehouse** (BigQuery, Redshift)
   - Historical analysis
   - Trend identification
   - Business intelligence

---

## API Reference

### Metrics Endpoints

**Get Overall Metrics**:
```
GET /api/analytics/metrics?timeWindow=3600
```

Response:
```json
{
  "timeWindow": 3600000,
  "metrics": {
    "totalEvents": 1250,
    "totalTransactions": 45,
    "successfulTransactions": 43,
    "failedTransactions": 2,
    "successRate": 95.56,
    "apiRequests": 342,
    "apiErrors": 2,
    "errorRate": 0.58,
    "averageResponseTime": 145
  }
}
```

**Get Quick Summary**:
```
GET /api/analytics/metrics/summary
```

Response:
```json
{
  "totalEvents": 1250,
  "totalTransactions": 45,
  "successRate": 95.56,
  "avgResponseTime": "145.32",
  "errorRate": "0.58"
}
```

### User Analytics

**Get User Analytics**:
```
GET /api/analytics/users/:userId
```

Response:
```json
{
  "analytics": {
    "userId": "user-123",
    "totalEvents": 150,
    "totalTransactions": 12,
    "totalAgents": 3,
    "lastActivityAt": "2025-11-18T10:30:00Z",
    "firstActivityAt": "2025-11-01T14:20:00Z"
  },
  "recentEvents": [...]
}
```

**Get Top Users**:
```
GET /api/analytics/users/top?limit=10
```

### Agent Analytics

**Get Agent Analytics**:
```
GET /api/analytics/agents/:agentId
```

Response:
```json
{
  "analytics": {
    "agentId": "agent-456",
    "userId": "user-123",
    "totalTransactions": 45,
    "successfulTransactions": 43,
    "failedTransactions": 2,
    "successRate": 0.9556,
    "averageTransactionTime": 2500,
    "lastTransactionAt": "2025-11-18T10:25:00Z"
  }
}
```

**Get Top Agents**:
```
GET /api/analytics/agents/top?limit=10
```

### Transaction Analytics

**Get Transaction Metrics**:
```
GET /api/analytics/transactions?timeWindow=3600
```

Response:
```json
{
  "timeWindow": 3600000,
  "totalTransactions": 45,
  "successfulTransactions": 43,
  "failedTransactions": 2,
  "successRate": 95.56,
  "averageTime": "2500.00"
}
```

### Events

**Get Events by Type**:
```
GET /api/analytics/events?type=TRANSACTION_VERIFIED&limit=50
```

**Get Events by Time Range**:
```
GET /api/analytics/events/time-range?start=2025-11-18T00:00:00Z&end=2025-11-18T23:59:59Z
```

**Get User Events**:
```
GET /api/analytics/users/:userId/events?limit=100
```

### Monitoring

**Get System Health**:
```
GET /api/analytics/health
```

Response:
```json
{
  "status": "healthy",
  "metrics": {
    "errorRate": "0.58",
    "avgResponseTime": "145.32",
    "totalRequests": 342,
    "transactionSuccess": "95.56"
  }
}
```

**Get Slow Requests**:
```
GET /api/analytics/slow-requests?threshold=500
```

**Get Error Requests**:
```
GET /api/analytics/errors
```

---

## Implementation Checklist

### Backend Setup

- [ ] AnalyticsService created and running
- [ ] Analytics middleware configured
- [ ] Event tracking in all routes
- [ ] Analytics endpoints implemented
- [ ] Alert thresholds configured
- [ ] Health check endpoint working

### Frontend Setup

- [ ] useAnalytics hook imported in pages
- [ ] Page views tracked
- [ ] User interactions tracked
- [ ] Form submissions tracked
- [ ] Errors logged to analytics
- [ ] Performance metrics collected

### Monitoring

- [ ] Admin dashboard created
- [ ] Alert thresholds set
- [ ] Health monitoring in place
- [ ] Performance tracking configured
- [ ] Error tracking enabled

### Documentation

- [ ] Analytics guide completed
- [ ] API documentation updated
- [ ] Event types documented
- [ ] Alert procedures documented

---

## Common Use Cases

### User Behavior Analysis

```typescript
// Track user journey through app
trackPageView('dashboard');
trackButtonClick('create-agent');
trackFormSubmit('agent-form');
trackEvent(EventType.AGENT_CREATED, userId, agentId);
```

### Transaction Monitoring

```typescript
// Track complete transaction lifecycle
trackEvent(EventType.TRANSACTION_CREATED);
// ... verification process ...
trackEvent(EventType.TRANSACTION_VERIFIED);
// Or on failure:
trackEvent(EventType.TRANSACTION_FAILED, { error: 'reason' });
```

### Performance Analysis

```typescript
// Identify slow endpoints
const slowRequests = analyticsService.getEventsByType(
  EventType.API_SLOW_REQUEST,
  100
);

// Get average response time
const metrics = analyticsService.getMetrics();
console.log(`Avg response: ${metrics.averageResponseTime}ms`);
```

### Error Investigation

```typescript
// Get all errors in time range
const errors = analyticsService.getEventsByTimeRange(
  startTime,
  endTime
).filter(e => e.type === EventType.API_ERROR);

// Get errors for specific endpoint
const endpointErrors = errors.filter(
  e => e.data.path === '/api/transactions'
);
```

---

## Best Practices

### 1. Track Meaningful Events

```typescript
// ✓ Good: Specific, actionable events
trackButtonClick('create-agent', { agentType: 'arbitrage' });
trackFormError('agent-form', 'Invalid agent name');

// ✗ Bad: Too generic or not useful
trackEvent('something-happened');
trackEvent('click');
```

### 2. Include Context

```typescript
// ✓ Good: Include relevant metadata
trackEvent(EventType.TRANSACTION_VERIFIED, userId, agentId, {
  txHash: '0x...',
  protocol: 'uniswap',
  amount: '100'
});

// ✗ Bad: Missing important context
trackEvent(EventType.TRANSACTION_VERIFIED);
```

### 3. Handle Failures Gracefully

```typescript
// ✓ Good: Analytics failures shouldn't break app
fetch('/api/analytics/track', { ... })
  .catch(() => {
    console.debug('Analytics failed, continuing anyway');
  });

// ✗ Bad: Analytics failures break functionality
const result = await analyticsService.trackEvent(...);
if (!result) throw new Error('Analytics failed');
```

### 4. Monitor Critical Paths

```typescript
// High priority: Transaction verification
trackEvent(EventType.VERIFICATION_STARTED);
const duration = await verifyTransaction();
trackVerificationCompleted(userId, agentId, txHash, duration);

// Medium priority: User actions
trackButtonClick('view-details');

// Low priority: Page views
trackPageView('agents');
```

---

## Troubleshooting

### Events Not Appearing

1. Check service worker is registered
2. Verify analytics endpoint is accessible
3. Check browser console for errors
4. Ensure userId is being captured

### High Memory Usage

1. Check number of stored events (max 100k)
2. Consider adding data archival job
3. Monitor AnalyticsService instance size
4. Consider external storage for old events

### Slow Dashboard

1. Reduce refresh interval
2. Filter time window (use 1 hour instead of 7 days)
3. Limit dashboard to essential metrics
4. Move heavy analytics to background job

---

## Summary

The Analytics & Monitoring system provides:

✓ **Comprehensive Event Tracking** - 10+ event types
✓ **Real-Time Metrics** - Live dashboards and monitoring
✓ **User Analytics** - Understand user behavior
✓ **Performance Monitoring** - Track API and system performance
✓ **Business Analytics** - Transaction success, verification rates
✓ **Alert System** - Threshold-based notifications
✓ **Admin Dashboard** - Complete visibility for admins
✓ **Extensible Design** - Easy to add new metrics and alerts

This enables data-driven decisions about system performance and user experience.
