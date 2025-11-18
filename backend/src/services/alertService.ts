/**
 * Alert Service
 * Implements alert rules for critical failures
 */

import { EventEmitter } from 'events';
import { ErrorCategory } from './errorHandler';
import { getLogger } from './logger';

// ============================================================================
// TYPES
// ============================================================================

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  category: ErrorCategory;
  timestamp: string;
  context?: Record<string, any>;
  resolved: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  category: ErrorCategory;
  threshold: number; // Trigger after N occurrences
  timeWindow: number; // within this milliseconds
  severity: AlertSeverity;
  enabled: boolean;
}

// ============================================================================
// BUILT-IN ALERT RULES
// ============================================================================

const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'the-graph-down',
    name: 'The Graph API Unavailable',
    category: ErrorCategory.THE_GRAPH_ERROR,
    threshold: 5,
    timeWindow: 60000, // 1 minute
    severity: AlertSeverity.CRITICAL,
    enabled: true,
  },
  {
    id: 'db-connection-failed',
    name: 'Database Connection Failure',
    category: ErrorCategory.DATABASE_ERROR,
    threshold: 3,
    timeWindow: 60000,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
  },
  {
    id: 'rpc-timeout',
    name: 'RPC Provider Timeout',
    category: ErrorCategory.RPC_ERROR,
    threshold: 10,
    timeWindow: 300000, // 5 minutes
    severity: AlertSeverity.HIGH,
    enabled: true,
  },
  {
    id: 'service-unavailable',
    name: 'Service Unavailable',
    category: ErrorCategory.SERVICE_UNAVAILABLE_ERROR,
    threshold: 5,
    timeWindow: 60000,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
  },
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    category: ErrorCategory.INTERNAL_SERVER_ERROR,
    threshold: 20,
    timeWindow: 300000,
    severity: AlertSeverity.HIGH,
    enabled: true,
  },
];

// ============================================================================
// ALERT SERVICE
// ============================================================================

export class AlertService extends EventEmitter {
  private rules: Map<string, AlertRule>;
  private errorCounts: Map<string, Array<number>> = new Map(); // category -> timestamps
  private activeAlerts: Map<string, Alert> = new Map();
  private logger = getLogger();
  private maxErrorHistorySize = 1000;

  constructor(rules: AlertRule[] = DEFAULT_ALERT_RULES) {
    super();

    this.rules = new Map();
    for (const rule of rules) {
      this.addRule(rule);
    }
  }

  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Disable a rule
   */
  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }

  /**
   * Enable a rule
   */
  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }

  /**
   * Check error against alert rules
   */
  checkError(category: ErrorCategory, context?: Record<string, any>): Alert | null {
    const now = Date.now();

    // Get or initialize error history for this category
    if (!this.errorCounts.has(category)) {
      this.errorCounts.set(category, []);
    }

    const history = this.errorCounts.get(category)!;
    history.push(now);

    // Keep only recent errors within largest time window
    const maxTimeWindow = Math.max(...Array.from(this.rules.values()).map((r) => r.timeWindow));
    const cutoff = now - maxTimeWindow;
    const recentErrors = history.filter((timestamp) => timestamp >= cutoff);
    this.errorCounts.set(category, recentErrors);

    // Check all rules for this category
    for (const rule of this.rules.values()) {
      if (!rule.enabled || rule.category !== category) {
        continue;
      }

      const withinWindow = recentErrors.filter((timestamp) => timestamp >= now - rule.timeWindow);

      if (withinWindow.length >= rule.threshold) {
        // Trigger alert
        const alert = this.createAlert(rule, context);
        return this.triggerAlert(alert);
      }
    }

    return null;
  }

  /**
   * Create an alert from a rule
   */
  private createAlert(rule: AlertRule, context?: Record<string, any>): Alert {
    return {
      id: `${rule.id}-${Date.now()}`,
      severity: rule.severity,
      title: rule.name,
      message: `Alert triggered: ${rule.name}`,
      category: rule.category,
      timestamp: new Date().toISOString(),
      context,
      resolved: false,
    };
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(alert: Alert): Alert {
    // Check if similar alert already active
    const existingAlert = Array.from(this.activeAlerts.values()).find(
      (a) => a.category === alert.category && !a.resolved
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.timestamp = alert.timestamp;
      return existingAlert;
    }

    // New alert
    this.activeAlerts.set(alert.id, alert);

    // Log alert
    this.logger.error(`ALERT: ${alert.title}`, {
      alertId: alert.id,
      severity: alert.severity,
      category: alert.category,
      context: alert.context,
    });

    // Emit event
    this.emit('alert', alert);

    return alert;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): Alert | null {
    const alert = this.activeAlerts.get(alertId);

    if (!alert) {
      return null;
    }

    alert.resolved = true;
    this.logger.info(`RESOLVED: ${alert.title}`, { alertId });
    this.emit('alertResolved', alert);

    // Remove resolved alert after a period
    setTimeout(() => {
      this.activeAlerts.delete(alertId);
    }, 300000); // 5 minutes

    return alert;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter((a) => !a.resolved);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return this.getActiveAlerts().filter((a) => a.severity === severity);
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts(): Alert[] {
    return this.getAlertsBySeverity(AlertSeverity.CRITICAL);
  }

  /**
   * Check if critical alerts exist
   */
  hasCriticalAlerts(): boolean {
    return this.getCriticalAlerts().length > 0;
  }

  /**
   * Get error count for category
   */
  getErrorCount(category: ErrorCategory, timeWindow: number = 60000): number {
    const history = this.errorCounts.get(category) || [];
    const cutoff = Date.now() - timeWindow;

    return history.filter((timestamp) => timestamp >= cutoff).length;
  }

  /**
   * Reset error counts
   */
  resetErrorCounts(): void {
    this.errorCounts.clear();
  }

  /**
   * Get all active alerts
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    for (const alert of this.activeAlerts.values()) {
      this.emit('alertResolved', alert);
    }
    this.activeAlerts.clear();
  }

  /**
   * Get alert statistics
   */
  getStats(): {
    activeAlerts: number;
    criticalAlerts: number;
    errorCount: Record<string, number>;
  } {
    const stats: any = {
      activeAlerts: this.getActiveAlerts().length,
      criticalAlerts: this.getCriticalAlerts().length,
      errorCount: {},
    };

    for (const category of Object.values(ErrorCategory)) {
      stats.errorCount[category] = this.getErrorCount(category as ErrorCategory);
    }

    return stats;
  }
}

/**
 * Singleton instance
 */
let instance: AlertService | null = null;

export function getAlertService(rules?: AlertRule[]): AlertService {
  if (!instance) {
    instance = new AlertService(rules);
  }
  return instance;
}

export function resetAlertService(): void {
  instance = null;
}
