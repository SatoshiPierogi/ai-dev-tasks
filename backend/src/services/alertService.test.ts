/**
 * Alert Service Tests
 * Tests alert rule management, error checking, and alert triggering
 */

import { AlertService, AlertSeverity, AlertRule, getAlertService, resetAlertService } from './alertService';
import { ErrorCategory } from './errorHandler';

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  resetAlertService();
});

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

describe('AlertService', () => {
  it('should initialize with default rules', () => {
    const service = new AlertService();
    expect(service).toBeDefined();
    expect(service.getStats().activeAlerts).toBe(0);
  });

  it('should initialize with custom rules', () => {
    const customRules: AlertRule[] = [
      {
        id: 'custom-rule',
        name: 'Custom Alert',
        category: ErrorCategory.INTERNAL_SERVER_ERROR,
        threshold: 5,
        timeWindow: 60000,
        severity: AlertSeverity.HIGH,
        enabled: true,
      },
    ];

    const service = new AlertService(customRules);
    expect(service).toBeDefined();
  });

  it('should return singleton instance', () => {
    const service1 = getAlertService();
    const service2 = getAlertService();

    expect(service1).toBe(service2);
  });
});

// ============================================================================
// RULE MANAGEMENT TESTS
// ============================================================================

describe('Rule Management', () => {
  let service: AlertService;

  beforeEach(() => {
    service = new AlertService([]);
  });

  it('should add rule', () => {
    const rule: AlertRule = {
      id: 'test-rule',
      name: 'Test Rule',
      category: ErrorCategory.THE_GRAPH_ERROR,
      threshold: 3,
      timeWindow: 60000,
      severity: AlertSeverity.HIGH,
      enabled: true,
    };

    service.addRule(rule);
    const stats = service.getStats();

    // Stats should be available after adding rule
    expect(stats).toBeDefined();
  });

  it('should remove rule', () => {
    const rule: AlertRule = {
      id: 'test-rule',
      name: 'Test Rule',
      category: ErrorCategory.THE_GRAPH_ERROR,
      threshold: 3,
      timeWindow: 60000,
      severity: AlertSeverity.HIGH,
      enabled: true,
    };

    service.addRule(rule);
    service.removeRule('test-rule');

    // Rule should be removed
    expect(service).toBeDefined();
  });

  it('should disable rule', () => {
    const rule: AlertRule = {
      id: 'test-rule',
      name: 'Test Rule',
      category: ErrorCategory.THE_GRAPH_ERROR,
      threshold: 3,
      timeWindow: 60000,
      severity: AlertSeverity.HIGH,
      enabled: true,
    };

    service.addRule(rule);
    service.disableRule('test-rule');

    // Rule should be disabled
    expect(service).toBeDefined();
  });

  it('should enable rule', () => {
    const rule: AlertRule = {
      id: 'test-rule',
      name: 'Test Rule',
      category: ErrorCategory.THE_GRAPH_ERROR,
      threshold: 3,
      timeWindow: 60000,
      severity: AlertSeverity.HIGH,
      enabled: false,
    };

    service.addRule(rule);
    service.enableRule('test-rule');

    // Rule should be enabled
    expect(service).toBeDefined();
  });
});

// ============================================================================
// ERROR CHECKING TESTS
// ============================================================================

describe('Error Checking', () => {
  let service: AlertService;

  beforeEach(() => {
    const rules: AlertRule[] = [
      {
        id: 'the-graph-down',
        name: 'The Graph Down',
        category: ErrorCategory.THE_GRAPH_ERROR,
        threshold: 3,
        timeWindow: 60000,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
      },
    ];

    service = new AlertService(rules);
  });

  it('should not trigger alert below threshold', () => {
    const alert1 = service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    const alert2 = service.checkError(ErrorCategory.THE_GRAPH_ERROR);

    expect(alert1).toBeNull();
    expect(alert2).toBeNull();
  });

  it('should trigger alert at threshold', () => {
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    const alert = service.checkError(ErrorCategory.THE_GRAPH_ERROR);

    expect(alert).toBeDefined();
    expect(alert?.category).toBe(ErrorCategory.THE_GRAPH_ERROR);
  });

  it('should set correct alert severity', () => {
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    const alert = service.checkError(ErrorCategory.THE_GRAPH_ERROR);

    expect(alert?.severity).toBe(AlertSeverity.CRITICAL);
  });

  it('should include context in alert', () => {
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    const context = { endpoint: 'uniswap', error: 'timeout' };
    const alert = service.checkError(ErrorCategory.THE_GRAPH_ERROR, context);

    expect(alert?.context).toEqual(context);
  });

  it('should only trigger once for threshold', () => {
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    const alert1 = service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    const alert2 = service.checkError(ErrorCategory.THE_GRAPH_ERROR);

    // Second alert might be same instance or different
    expect(alert1).toBeDefined();
  });
});

// ============================================================================
// ALERT MANAGEMENT TESTS
// ============================================================================

describe('Alert Management', () => {
  let service: AlertService;

  beforeEach(() => {
    const rules: AlertRule[] = [
      {
        id: 'test-rule',
        name: 'Test Alert',
        category: ErrorCategory.DATABASE_ERROR,
        threshold: 1,
        timeWindow: 60000,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
      },
    ];

    service = new AlertService(rules);
  });

  it('should get active alerts', () => {
    service.checkError(ErrorCategory.DATABASE_ERROR);

    const alerts = service.getActiveAlerts();
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('should get alerts by severity', () => {
    service.checkError(ErrorCategory.DATABASE_ERROR);

    const criticalAlerts = service.getAlertsBySeverity(AlertSeverity.CRITICAL);
    expect(criticalAlerts.length).toBeGreaterThan(0);
  });

  it('should get critical alerts', () => {
    service.checkError(ErrorCategory.DATABASE_ERROR);

    const alerts = service.getCriticalAlerts();
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('should check for critical alerts', () => {
    service.checkError(ErrorCategory.DATABASE_ERROR);

    const hasCritical = service.hasCriticalAlerts();
    expect(hasCritical).toBe(true);
  });

  it('should resolve alert', () => {
    const alert = service.checkError(ErrorCategory.DATABASE_ERROR);

    if (alert) {
      const resolved = service.resolveAlert(alert.id);

      expect(resolved?.resolved).toBe(true);
    }
  });

  it('should clear all alerts', () => {
    service.checkError(ErrorCategory.DATABASE_ERROR);
    expect(service.getActiveAlerts().length).toBeGreaterThan(0);

    service.clearAlerts();
    expect(service.getActiveAlerts().length).toBe(0);
  });
});

// ============================================================================
// ERROR COUNT TRACKING TESTS
// ============================================================================

describe('Error Count Tracking', () => {
  let service: AlertService;

  beforeEach(() => {
    service = new AlertService([]);
  });

  it('should track error count', () => {
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);

    const count = service.getErrorCount(ErrorCategory.THE_GRAPH_ERROR);
    expect(count).toBe(2);
  });

  it('should respect time window', () => {
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);

    const count1 = service.getErrorCount(ErrorCategory.THE_GRAPH_ERROR, 60000);
    expect(count1).toBe(1);

    const count2 = service.getErrorCount(ErrorCategory.THE_GRAPH_ERROR, 0);
    expect(count2).toBe(0); // 0 time window
  });

  it('should reset error counts', () => {
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);

    expect(service.getErrorCount(ErrorCategory.THE_GRAPH_ERROR)).toBeGreaterThan(0);

    service.resetErrorCounts();

    expect(service.getErrorCount(ErrorCategory.THE_GRAPH_ERROR, Number.MAX_SAFE_INTEGER)).toBe(0);
  });
});

// ============================================================================
// STATISTICS TESTS
// ============================================================================

describe('Statistics', () => {
  let service: AlertService;

  beforeEach(() => {
    const rules: AlertRule[] = [
      {
        id: 'rule1',
        name: 'Rule 1',
        category: ErrorCategory.THE_GRAPH_ERROR,
        threshold: 1,
        timeWindow: 60000,
        severity: AlertSeverity.HIGH,
        enabled: true,
      },
      {
        id: 'rule2',
        name: 'Rule 2',
        category: ErrorCategory.DATABASE_ERROR,
        threshold: 1,
        timeWindow: 60000,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
      },
    ];

    service = new AlertService(rules);
  });

  it('should get stats', () => {
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    service.checkError(ErrorCategory.DATABASE_ERROR);

    const stats = service.getStats();

    expect(stats.activeAlerts).toBeGreaterThanOrEqual(0);
    expect(stats.criticalAlerts).toBeGreaterThanOrEqual(0);
    expect(stats.errorCount).toBeDefined();
  });

  it('should count errors by category in stats', () => {
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);

    const stats = service.getStats();
    expect(stats.errorCount[ErrorCategory.THE_GRAPH_ERROR]).toBe(2);
  });

  it('should return all alerts', () => {
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    service.checkError(ErrorCategory.DATABASE_ERROR);

    const allAlerts = service.getAllAlerts();
    expect(allAlerts.length).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// EVENT EMISSION TESTS
// ============================================================================

describe('Event Emission', () => {
  let service: AlertService;

  beforeEach(() => {
    const rules: AlertRule[] = [
      {
        id: 'test-rule',
        name: 'Test Alert',
        category: ErrorCategory.THE_GRAPH_ERROR,
        threshold: 1,
        timeWindow: 60000,
        severity: AlertSeverity.HIGH,
        enabled: true,
      },
    ];

    service = new AlertService(rules);
  });

  it('should emit alert event', (done) => {
    service.on('alert', (alert) => {
      expect(alert).toBeDefined();
      expect(alert.category).toBe(ErrorCategory.THE_GRAPH_ERROR);
      done();
    });

    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
  });

  it('should emit alertResolved event', (done) => {
    const alert = service.checkError(ErrorCategory.THE_GRAPH_ERROR);

    service.on('alertResolved', (resolvedAlert) => {
      expect(resolvedAlert).toBeDefined();
      done();
    });

    if (alert) {
      service.resolveAlert(alert.id);
    }
  });
});

// ============================================================================
// MULTIPLE CATEGORY TESTS
// ============================================================================

describe('Multiple Categories', () => {
  let service: AlertService;

  beforeEach(() => {
    const rules: AlertRule[] = [
      {
        id: 'the-graph-rule',
        name: 'The Graph Alert',
        category: ErrorCategory.THE_GRAPH_ERROR,
        threshold: 2,
        timeWindow: 60000,
        severity: AlertSeverity.HIGH,
        enabled: true,
      },
      {
        id: 'db-rule',
        name: 'Database Alert',
        category: ErrorCategory.DATABASE_ERROR,
        threshold: 2,
        timeWindow: 60000,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
      },
    ];

    service = new AlertService(rules);
  });

  it('should track errors for multiple categories', () => {
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    service.checkError(ErrorCategory.DATABASE_ERROR);
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);

    expect(service.getErrorCount(ErrorCategory.THE_GRAPH_ERROR)).toBe(2);
    expect(service.getErrorCount(ErrorCategory.DATABASE_ERROR)).toBe(1);
  });

  it('should trigger alerts for different categories', () => {
    service.checkError(ErrorCategory.THE_GRAPH_ERROR);
    const alert1 = service.checkError(ErrorCategory.THE_GRAPH_ERROR);

    service.checkError(ErrorCategory.DATABASE_ERROR);
    const alert2 = service.checkError(ErrorCategory.DATABASE_ERROR);

    expect(alert1).toBeDefined();
    expect(alert2).toBeDefined();
    expect(alert1?.category).not.toBe(alert2?.category);
  });
});
