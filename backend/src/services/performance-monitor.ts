/**
 * Performance Monitor Service
 * Tracks and reports on application performance metrics
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceMetric {
  timestamp: Date;
  method: string;
  path: string;
  duration: number; // milliseconds
  statusCode: number;
  memoryUsage: number; // bytes
  dbQueries?: number;
  cacheHits?: number;
  cacheMisses?: number;
  error?: Error;
}

export interface PerformanceSummary {
  totalRequests: number;
  avgDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  errorRate: number;
  avgMemory: number;
  peakMemory: number;
}

export interface AlertThreshold {
  metric: string;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  action?: (value: number) => void;
}

// ============================================================================
// PERFORMANCE MONITOR SERVICE
// ============================================================================

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetric[] = [];
  private thresholds: Map<string, AlertThreshold> = new Map();
  private maxMetricsSize = 10000; // Keep last 10k metrics
  private intervalId?: NodeJS.Timeout;

  constructor() {
    super();
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Trim old metrics if exceeds max size
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }

    // Check thresholds
    this.checkThresholds(metric);

    // Emit metric event
    this.emit('metric', metric);
  }

  /**
   * Get summary statistics
   */
  getSummary(timeWindowMs = 3600000): PerformanceSummary {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(
      (m) => m.timestamp.getTime() + timeWindowMs > now
    );

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        avgDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        errorRate: 0,
        avgMemory: 0,
        peakMemory: 0,
      };
    }

    const durations = recentMetrics.map((m) => m.duration).sort((a, b) => a - b);
    const errors = recentMetrics.filter((m) => m.statusCode >= 400).length;
    const memoryUsages = recentMetrics.map((m) => m.memoryUsage);

    return {
      totalRequests: recentMetrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50Duration: this.percentile(durations, 50),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      errorRate: errors / recentMetrics.length,
      avgMemory: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      peakMemory: Math.max(...memoryUsages),
    };
  }

  /**
   * Get metrics by path
   */
  getMetricsByPath(path: string, timeWindowMs = 3600000): PerformanceSummary {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(
      (m) => m.path === path && m.timestamp.getTime() + timeWindowMs > now
    );

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        avgDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        errorRate: 0,
        avgMemory: 0,
        peakMemory: 0,
      };
    }

    const durations = recentMetrics.map((m) => m.duration).sort((a, b) => a - b);
    const errors = recentMetrics.filter((m) => m.statusCode >= 400).length;
    const memoryUsages = recentMetrics.map((m) => m.memoryUsage);

    return {
      totalRequests: recentMetrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50Duration: this.percentile(durations, 50),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      errorRate: errors / recentMetrics.length,
      avgMemory: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      peakMemory: Math.max(...memoryUsages),
    };
  }

  /**
   * Get slow requests
   */
  getSlowRequests(threshold = 200, limit = 10): PerformanceMetric[] {
    return this.metrics
      .filter((m) => m.duration > threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get error requests
   */
  getErrorRequests(limit = 10): PerformanceMetric[] {
    return this.metrics
      .filter((m) => m.statusCode >= 400)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Add alert threshold
   */
  addThreshold(threshold: AlertThreshold): void {
    this.thresholds.set(threshold.metric, threshold);
  }

  /**
   * Remove alert threshold
   */
  removeThreshold(metric: string): void {
    this.thresholds.delete(metric);
  }

  /**
   * Get all thresholds
   */
  getThresholds(): AlertThreshold[] {
    return Array.from(this.thresholds.values());
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Start periodic reporting
   */
  startReporting(intervalMs = 60000): void {
    this.intervalId = setInterval(() => {
      const summary = this.getSummary();
      console.log('=== Performance Summary ===');
      console.log(`Requests: ${summary.totalRequests}`);
      console.log(`Avg Duration: ${summary.avgDuration.toFixed(2)}ms`);
      console.log(`P95 Duration: ${summary.p95Duration.toFixed(2)}ms`);
      console.log(`Error Rate: ${(summary.errorRate * 100).toFixed(2)}%`);
      console.log(`Peak Memory: ${(summary.peakMemory / 1024 / 1024).toFixed(2)}MB`);

      this.emit('report', summary);
    }, intervalMs);
  }

  /**
   * Stop periodic reporting
   */
  stopReporting(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Calculate percentile
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const index = Math.ceil((arr.length * p) / 100) - 1;
    return arr[Math.max(0, index)];
  }

  /**
   * Check metrics against thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    this.thresholds.forEach((threshold) => {
      let value: number | undefined;

      switch (threshold.metric) {
        case 'response_time':
          value = metric.duration;
          break;
        case 'error_rate': {
          const errors = this.metrics.filter((m) => m.statusCode >= 400).length;
          value = errors / this.metrics.length;
          break;
        }
        case 'memory_usage':
          value = metric.memoryUsage;
          break;
      }

      if (value !== undefined && value > threshold.threshold) {
        const alert = {
          metric: threshold.metric,
          value,
          threshold: threshold.threshold,
          severity: threshold.severity,
          timestamp: new Date(),
        };

        this.emit('alert', alert);

        if (threshold.action) {
          try {
            threshold.action(value);
          } catch (error) {
            console.error('Error in threshold action:', error);
          }
        }
      }
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const performanceMonitor = new PerformanceMonitor();

// Setup default thresholds
performanceMonitor.addThreshold({
  metric: 'response_time',
  threshold: 500,
  severity: 'warning',
});

performanceMonitor.addThreshold({
  metric: 'error_rate',
  threshold: 0.01, // 1%
  severity: 'critical',
});

performanceMonitor.addThreshold({
  metric: 'memory_usage',
  threshold: 536870912, // 512MB
  severity: 'critical',
});
