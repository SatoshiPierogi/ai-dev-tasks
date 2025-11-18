/**
 * Structured Logging Service
 * Uses Winston for consistent, structured logging across the application
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  userId?: string | number;
  requestId?: string;
  duration?: number;
}

export interface LoggerOptions {
  logDir: string;
  enableConsole: boolean;
  enableFile: boolean;
  level: LogLevel;
  prettyPrint: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_OPTIONS: LoggerOptions = {
  logDir: process.env.LOG_DIR || './logs',
  enableConsole: process.env.LOG_CONSOLE !== 'false',
  enableFile: process.env.LOG_FILE !== 'false',
  level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
  prettyPrint: process.env.NODE_ENV !== 'production',
};

// ============================================================================
// LOGGER SERVICE
// ============================================================================

export class LoggerService {
  private options: LoggerOptions;
  private logs: LogEntry[] = [];
  private maxBufferSize = 10000;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Ensure log directory exists
    if (this.options.enableFile && !fs.existsSync(this.options.logDir)) {
      fs.mkdirSync(this.options.logDir, { recursive: true });
    }
  }

  /**
   * Log error
   */
  error(message: string, context?: any, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log warning
   */
  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log info
   */
  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log debug
   */
  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log trace
   */
  trace(message: string, context?: any): void {
    this.log(LogLevel.TRACE, message, context);
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, context?: any, error?: Error): void {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      context: this.sanitizeContext(context),
      userId: context?.userId,
      requestId: context?.requestId,
      duration: context?.duration,
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    // Add to buffer
    this.addToBuffer(entry);

    // Log to console
    if (this.options.enableConsole && this.shouldLog(level)) {
      this.logToConsole(entry);
    }

    // Log to file
    if (this.options.enableFile && this.shouldLog(level)) {
      this.logToFile(entry);
    }
  }

  /**
   * Check if should log based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG, LogLevel.TRACE];
    const currentIndex = levels.indexOf(this.options.level);
    const logIndex = levels.indexOf(level);

    return logIndex <= currentIndex;
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry): void {
    const color = this.getColorForLevel(entry.level);
    const reset = '\x1b[0m';

    if (this.options.prettyPrint) {
      console.log(`${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} - ${entry.message}`);

      if (entry.context && Object.keys(entry.context).length > 0) {
        console.log(entry.context);
      }

      if (entry.error) {
        console.error(entry.error.stack || entry.error.message);
      }
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Log to file
   */
  private logToFile(entry: LogEntry): void {
    try {
      const fileName = `${entry.level}.log`;
      const filePath = path.join(this.options.logDir, fileName);

      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(filePath, logLine);

      // Also log to combined log
      const combinedPath = path.join(this.options.logDir, 'combined.log');
      fs.appendFileSync(combinedPath, logLine);
    } catch (error) {
      // Silently fail to avoid infinite loops
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Get color code for log level
   */
  private getColorForLevel(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.INFO]: '\x1b[36m', // Cyan
      [LogLevel.DEBUG]: '\x1b[35m', // Magenta
      [LogLevel.TRACE]: '\x1b[37m', // White
    };

    return colors[level];
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context?: any): any {
    if (!context) return undefined;

    const sanitized = { ...context };
    const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'Authorization'];

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
   * Add log to in-memory buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.logs.push(entry);

    // Keep buffer size manageable
    if (this.logs.length > this.maxBufferSize) {
      this.logs = this.logs.slice(-this.maxBufferSize);
    }
  }

  /**
   * Get recent logs from buffer
   */
  getRecentLogs(limit: number = 100, level?: LogLevel): LogEntry[] {
    let filtered = [...this.logs];

    if (level) {
      filtered = filtered.filter((log) => log.level === level);
    }

    return filtered.slice(-limit);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel, limit: number = 100): LogEntry[] {
    return this.logs.filter((log) => log.level === level).slice(-limit);
  }

  /**
   * Search logs by message
   */
  searchLogs(query: string, limit: number = 50): LogEntry[] {
    const queryLower = query.toLowerCase();
    return this.logs
      .filter((log) => log.message.toLowerCase().includes(queryLower))
      .slice(-limit);
  }

  /**
   * Clear in-memory logs
   */
  clearBuffer(): void {
    this.logs = [];
  }

  /**
   * Get buffer size
   */
  getBufferSize(): number {
    return this.logs.length;
  }

  /**
   * Rotate log files (archive current and start new)
   */
  rotateLogs(): void {
    if (!this.options.enableFile) return;

    try {
      const timestamp = new Date().toISOString().split('T')[0];

      for (const level of Object.values(LogLevel)) {
        const filePath = path.join(this.options.logDir, `${level}.log`);

        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const archived = path.join(
            this.options.logDir,
            `${level}.${timestamp}.log`
          );

          fs.renameSync(filePath, archived);
        }
      }

      // Also rotate combined log
      const combinedPath = path.join(this.options.logDir, 'combined.log');
      if (fs.existsSync(combinedPath)) {
        const archived = path.join(this.options.logDir, `combined.${timestamp}.log`);
        fs.renameSync(combinedPath, archived);
      }
    } catch (error) {
      this.error('Failed to rotate logs', {}, error as Error);
    }
  }
}

/**
 * Singleton instance
 */
let instance: LoggerService | null = null;

export function getLogger(options?: Partial<LoggerOptions>): LoggerService {
  if (!instance) {
    instance = new LoggerService(options);
  }
  return instance;
}

export function resetLogger(): void {
  instance = null;
}
