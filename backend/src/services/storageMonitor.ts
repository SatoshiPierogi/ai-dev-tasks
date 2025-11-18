/**
 * Storage Monitor
 * Tracks database size and alerts on capacity thresholds
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface StorageMetrics {
  tableName: string;
  rowCount: number;
  sizeBytes: number;
  sizeMB: number;
  sizeGB: number;
  percentOfTotal: number;
}

export interface StorageStats {
  timestamp: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  totalSizeGB: number;
  tableMetrics: StorageMetrics[];
  utilizationPercent: number;
  warningThreshold: number;
  criticalThreshold: number;
}

export interface StorageAlertConfig {
  warningThresholdGB?: number; // Default: 10GB
  criticalThresholdGB?: number; // Default: 20GB
  checkInterval?: number; // Default: 3600000 (1 hour)
}

// ============================================================================
// STORAGE MONITOR
// ============================================================================

export class StorageMonitor extends EventEmitter {
  private config: Required<StorageAlertConfig>;
  private checkInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private lastMetrics: StorageStats | null = null;

  constructor(config: StorageAlertConfig = {}) {
    super();

    this.config = {
      warningThresholdGB: config.warningThresholdGB || 10,
      criticalThresholdGB: config.criticalThresholdGB || 20,
      checkInterval: config.checkInterval || 3600000, // 1 hour
    };
  }

  /**
   * Start monitoring storage
   */
  start(): void {
    if (this.isMonitoring) {
      console.warn('Storage monitor is already running');
      return;
    }

    console.log('Starting storage monitor');

    this.isMonitoring = true;

    // Check immediately
    this.checkStorage();

    // Schedule periodic checks
    this.checkInterval = setInterval(() => {
      this.checkStorage();
    }, this.config.checkInterval);

    this.emit('started', { timestamp: Date.now() });
  }

  /**
   * Stop monitoring storage
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isMonitoring = false;

    console.log('Storage monitor stopped');
    this.emit('stopped', { timestamp: Date.now() });
  }

  /**
   * Check storage usage
   */
  async checkStorage(): Promise<StorageStats> {
    try {
      // In production, this would query the database:
      // SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
      // FROM pg_tables WHERE schemaname='public'

      // Simulated metrics
      const metrics = this.generateMockMetrics();
      const stats = this.calculateStats(metrics);

      this.lastMetrics = stats;

      // Check thresholds
      this.checkThresholds(stats);

      this.emit('storage_checked', stats);

      return stats;
    } catch (error) {
      console.error('Storage check error:', error);
      this.emit('error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Get latest metrics
   */
  getLastMetrics(): StorageStats | null {
    return this.lastMetrics;
  }

  /**
   * Calculate storage statistics
   */
  private calculateStats(metrics: StorageMetrics[]): StorageStats {
    let totalSize = 0;

    for (const metric of metrics) {
      totalSize += metric.sizeBytes;
    }

    // Calculate percentage for each table
    for (const metric of metrics) {
      metric.percentOfTotal = (metric.sizeBytes / totalSize) * 100;
    }

    // Sort by size descending
    metrics.sort((a, b) => b.sizeBytes - a.sizeBytes);

    const utilizationPercent = (totalSize / (1024 * 1024 * 1024)) / this.config.criticalThresholdGB * 100;

    return {
      timestamp: Date.now(),
      totalSizeBytes: totalSize,
      totalSizeMB: totalSize / (1024 * 1024),
      totalSizeGB: totalSize / (1024 * 1024 * 1024),
      tableMetrics: metrics,
      utilizationPercent: Math.min(utilizationPercent, 100),
      warningThreshold: this.config.warningThresholdGB,
      criticalThreshold: this.config.criticalThresholdGB,
    };
  }

  /**
   * Check if thresholds are exceeded
   */
  private checkThresholds(stats: StorageStats): void {
    const sizeGB = stats.totalSizeGB;

    if (sizeGB >= this.config.criticalThresholdGB) {
      this.emit('critical_threshold_exceeded', {
        currentSize: sizeGB,
        threshold: this.config.criticalThresholdGB,
        timestamp: Date.now(),
      });

      console.error(`CRITICAL: Database size ${sizeGB.toFixed(2)}GB exceeds critical threshold`);
    } else if (sizeGB >= this.config.warningThresholdGB) {
      this.emit('warning_threshold_exceeded', {
        currentSize: sizeGB,
        threshold: this.config.warningThresholdGB,
        timestamp: Date.now(),
      });

      console.warn(`WARNING: Database size ${sizeGB.toFixed(2)}GB exceeds warning threshold`);
    }
  }

  /**
   * Get growth rate (requires multiple measurements)
   */
  getGrowthRate(): { bytesPerHour: number; estimatedDaysToFull: number } | null {
    if (!this.lastMetrics) {
      return null;
    }

    // In production, would calculate actual growth rate
    // For now, return estimated values
    const bytesPerHour = 100000; // Mock: 100KB per hour
    const availableBytes =
      this.config.criticalThresholdGB * 1024 * 1024 * 1024 - this.lastMetrics.totalSizeBytes;
    const hoursToFull = availableBytes / bytesPerHour;
    const daysToFull = hoursToFull / 24;

    return {
      bytesPerHour,
      estimatedDaysToFull: daysToFull,
    };
  }

  /**
   * Get table recommendations
   */
  getRecommendations(): string[] {
    if (!this.lastMetrics) {
      return [];
    }

    const recommendations: string[] = [];
    const stats = this.lastMetrics;

    // Get largest tables
    const largestTables = stats.tableMetrics.slice(0, 3);

    for (const table of largestTables) {
      const percentOfTotal = table.percentOfTotal;

      if (percentOfTotal > 30) {
        recommendations.push(
          `Table "${table.tableName}" is ${percentOfTotal.toFixed(1)}% of total size. Consider archival.`
        );
      }

      if (table.rowCount > 1000000) {
        recommendations.push(`Table "${table.tableName}" has ${table.rowCount} rows. Consider partitioning.`);
      }
    }

    if (stats.totalSizeGB >= this.config.warningThresholdGB) {
      recommendations.push('Enable archival job to move old transactions to archive table.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Storage usage is healthy. No immediate action needed.');
    }

    return recommendations;
  }

  /**
   * Generate mock metrics for testing
   */
  private generateMockMetrics(): StorageMetrics[] {
    return [
      {
        tableName: 'transactions',
        rowCount: 500000,
        sizeBytes: 3 * 1024 * 1024 * 1024, // 3GB
        sizeMB: 3072,
        sizeGB: 3,
        percentOfTotal: 0, // Calculated later
      },
      {
        tableName: 'verification_proofs',
        rowCount: 400000,
        sizeBytes: 1.5 * 1024 * 1024 * 1024, // 1.5GB
        sizeMB: 1536,
        sizeGB: 1.5,
        percentOfTotal: 0,
      },
      {
        tableName: 'agents',
        rowCount: 5000,
        sizeBytes: 50 * 1024 * 1024, // 50MB
        sizeMB: 50,
        sizeGB: 0.049,
        percentOfTotal: 0,
      },
      {
        tableName: 'users',
        rowCount: 10000,
        sizeBytes: 100 * 1024 * 1024, // 100MB
        sizeMB: 100,
        sizeGB: 0.098,
        percentOfTotal: 0,
      },
    ];
  }

  /**
   * Is monitoring
   */
  isActive(): boolean {
    return this.isMonitoring;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: StorageMonitor | null = null;

export function getStorageMonitor(config?: StorageAlertConfig): StorageMonitor {
  if (!instance) {
    instance = new StorageMonitor(config);
  }
  return instance;
}

export function resetStorageMonitor(): void {
  if (instance) {
    instance.stop();
    instance.removeAllListeners();
  }
  instance = null;
}
