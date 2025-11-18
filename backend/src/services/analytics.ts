/**
 * Analytics Service
 * Tracks user behavior, transactions, and system metrics
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export enum EventType {
  // User events
  USER_REGISTERED = 'user_registered',
  USER_LOGGED_IN = 'user_logged_in',
  USER_LOGGED_OUT = 'user_logged_out',
  USER_PROFILE_UPDATED = 'user_profile_updated',

  // Agent events
  AGENT_CREATED = 'agent_created',
  AGENT_UPDATED = 'agent_updated',
  AGENT_DELETED = 'agent_deleted',
  AGENT_ENABLED = 'agent_enabled',
  AGENT_DISABLED = 'agent_disabled',

  // Transaction events
  TRANSACTION_CREATED = 'transaction_created',
  TRANSACTION_VERIFIED = 'transaction_verified',
  TRANSACTION_FAILED = 'transaction_failed',

  // Verification events
  VERIFICATION_STARTED = 'verification_started',
  VERIFICATION_COMPLETED = 'verification_completed',
  VERIFICATION_FAILED = 'verification_failed',

  // API events
  API_REQUEST = 'api_request',
  API_ERROR = 'api_error',
  API_SLOW_REQUEST = 'api_slow_request',

  // WebSocket events
  WEBSOCKET_CONNECTED = 'websocket_connected',
  WEBSOCKET_DISCONNECTED = 'websocket_disconnected',
  WEBSOCKET_ERROR = 'websocket_error',
}

export interface AnalyticsEvent {
  type: EventType;
  timestamp: Date;
  userId?: string;
  agentId?: string;
  data?: Record<string, any>;
  metadata?: {
    ip?: string;
    userAgent?: string;
    duration?: number;
    error?: string;
  };
}

export interface AnalyticsMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByUser: Record<string, number>;
  eventsByAgent: Record<string, number>;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageTransactionTime: number;
  totalVerifications: number;
  successfulVerifications: number;
  failedVerifications: number;
  averageVerificationTime: number;
  apiRequests: number;
  apiErrors: number;
  errorRate: number;
  averageResponseTime: number;
}

export interface UserAnalytics {
  userId: string;
  totalEvents: number;
  totalTransactions: number;
  totalAgents: number;
  lastActivityAt: Date;
  firstActivityAt: Date;
  eventTypes: Record<string, number>;
}

export interface AgentAnalytics {
  agentId: string;
  userId: string;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  averageTransactionTime: number;
  lastTransactionAt?: Date;
  createdAt: Date;
}

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================

export class AnalyticsService extends EventEmitter {
  private events: AnalyticsEvent[] = [];
  private maxEventsSize = 100000; // Keep last 100k events
  private metrics: Map<string, AnalyticsMetrics> = new Map();
  private userAnalytics: Map<string, UserAnalytics> = new Map();
  private agentAnalytics: Map<string, AgentAnalytics> = new Map();

  constructor() {
    super();
  }

  /**
   * Track an analytics event
   */
  trackEvent(event: AnalyticsEvent): void {
    // Add timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = new Date();
    }

    // Store event
    this.events.push(event);

    // Trim old events if exceeds max size
    if (this.events.length > this.maxEventsSize) {
      this.events = this.events.slice(-this.maxEventsSize);
    }

    // Update analytics
    this.updateAnalytics(event);

    // Emit event
    this.emit('event', event);
  }

  /**
   * Get metrics for a time window
   */
  getMetrics(timeWindowMs = 3600000): AnalyticsMetrics {
    const now = Date.now();
    const recentEvents = this.events.filter(
      (e) => e.timestamp.getTime() + timeWindowMs > now
    );

    const eventsByType: Record<string, number> = {};
    const eventsByUser: Record<string, number> = {};
    const eventsByAgent: Record<string, number> = {};

    let totalTransactions = 0;
    let successfulTransactions = 0;
    let failedTransactions = 0;
    let totalTransactionTime = 0;

    let totalVerifications = 0;
    let successfulVerifications = 0;
    let failedVerifications = 0;
    let totalVerificationTime = 0;

    let apiRequests = 0;
    let apiErrors = 0;
    let totalResponseTime = 0;

    recentEvents.forEach((event) => {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      // Count by user
      if (event.userId) {
        eventsByUser[event.userId] = (eventsByUser[event.userId] || 0) + 1;
      }

      // Count by agent
      if (event.agentId) {
        eventsByAgent[event.agentId] = (eventsByAgent[event.agentId] || 0) + 1;
      }

      // Transaction metrics
      if (event.type === EventType.TRANSACTION_CREATED) {
        totalTransactions++;
      }
      if (event.type === EventType.TRANSACTION_VERIFIED) {
        successfulTransactions++;
        if (event.metadata?.duration) {
          totalTransactionTime += event.metadata.duration;
        }
      }
      if (event.type === EventType.TRANSACTION_FAILED) {
        failedTransactions++;
      }

      // Verification metrics
      if (event.type === EventType.VERIFICATION_STARTED) {
        totalVerifications++;
      }
      if (event.type === EventType.VERIFICATION_COMPLETED) {
        successfulVerifications++;
        if (event.metadata?.duration) {
          totalVerificationTime += event.metadata.duration;
        }
      }
      if (event.type === EventType.VERIFICATION_FAILED) {
        failedVerifications++;
      }

      // API metrics
      if (event.type === EventType.API_REQUEST) {
        apiRequests++;
        if (event.metadata?.duration) {
          totalResponseTime += event.metadata.duration;
        }
      }
      if (event.type === EventType.API_ERROR) {
        apiErrors++;
      }
    });

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsByUser,
      eventsByAgent,
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      averageTransactionTime:
        successfulTransactions > 0 ? totalTransactionTime / successfulTransactions : 0,
      totalVerifications,
      successfulVerifications,
      failedVerifications,
      averageVerificationTime:
        successfulVerifications > 0 ? totalVerificationTime / successfulVerifications : 0,
      apiRequests,
      apiErrors,
      errorRate: apiRequests > 0 ? apiErrors / apiRequests : 0,
      averageResponseTime: apiRequests > 0 ? totalResponseTime / apiRequests : 0,
    };
  }

  /**
   * Get user analytics
   */
  getUserAnalytics(userId: string): UserAnalytics | undefined {
    return this.userAnalytics.get(userId);
  }

  /**
   * Get agent analytics
   */
  getAgentAnalytics(agentId: string): AgentAnalytics | undefined {
    return this.agentAnalytics.get(agentId);
  }

  /**
   * Get top users by event count
   */
  getTopUsers(limit = 10): UserAnalytics[] {
    return Array.from(this.userAnalytics.values())
      .sort((a, b) => b.totalEvents - a.totalEvents)
      .slice(0, limit);
  }

  /**
   * Get top agents by transaction count
   */
  getTopAgents(limit = 10): AgentAnalytics[] {
    return Array.from(this.agentAnalytics.values())
      .sort((a, b) => b.totalTransactions - a.totalTransactions)
      .slice(0, limit);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: EventType, limit = 100): AnalyticsEvent[] {
    return this.events
      .filter((e) => e.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get user events
   */
  getUserEvents(userId: string, limit = 100): AnalyticsEvent[] {
    return this.events
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get agent events
   */
  getAgentEvents(agentId: string, limit = 100): AnalyticsEvent[] {
    return this.events
      .filter((e) => e.agentId === agentId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get events in time range
   */
  getEventsByTimeRange(startTime: Date, endTime: Date): AnalyticsEvent[] {
    return this.events.filter(
      (e) => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  /**
   * Clear all analytics (for testing)
   */
  clear(): void {
    this.events = [];
    this.metrics.clear();
    this.userAnalytics.clear();
    this.agentAnalytics.clear();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Update analytics on new event
   */
  private updateAnalytics(event: AnalyticsEvent): void {
    // Update user analytics
    if (event.userId) {
      const userAnalytics = this.userAnalytics.get(event.userId) || {
        userId: event.userId,
        totalEvents: 0,
        totalTransactions: 0,
        totalAgents: 0,
        lastActivityAt: new Date(),
        firstActivityAt: new Date(),
        eventTypes: {},
      };

      userAnalytics.totalEvents++;
      userAnalytics.lastActivityAt = event.timestamp;
      userAnalytics.eventTypes[event.type] =
        (userAnalytics.eventTypes[event.type] || 0) + 1;

      if (event.type === EventType.TRANSACTION_CREATED) {
        userAnalytics.totalTransactions++;
      }
      if (event.type === EventType.AGENT_CREATED) {
        userAnalytics.totalAgents++;
      }

      this.userAnalytics.set(event.userId, userAnalytics);
    }

    // Update agent analytics
    if (event.agentId) {
      const agentAnalytics = this.agentAnalytics.get(event.agentId) || {
        agentId: event.agentId,
        userId: event.userId || '',
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        successRate: 0,
        averageTransactionTime: 0,
        createdAt: event.timestamp,
      };

      if (event.type === EventType.TRANSACTION_CREATED) {
        agentAnalytics.totalTransactions++;
      }
      if (event.type === EventType.TRANSACTION_VERIFIED) {
        agentAnalytics.successfulTransactions++;
        agentAnalytics.lastTransactionAt = event.timestamp;
      }
      if (event.type === EventType.TRANSACTION_FAILED) {
        agentAnalytics.failedTransactions++;
        agentAnalytics.lastTransactionAt = event.timestamp;
      }

      // Calculate success rate
      if (agentAnalytics.totalTransactions > 0) {
        agentAnalytics.successRate =
          agentAnalytics.successfulTransactions / agentAnalytics.totalTransactions;
      }

      this.agentAnalytics.set(event.agentId, agentAnalytics);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const analyticsService = new AnalyticsService();
