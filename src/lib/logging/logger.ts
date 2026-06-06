/**
 * Structured Logger for Smart Ride
 *
 * - JSON output in production (parseable by log aggregators)
 * - Pretty-print in development (readable in terminal)
 * - Automatic context enrichment (timestamp, requestId, service)
 * - Log levels: debug, info, warn, error, fatal
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service?: string;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV !== 'production') {
    // Pretty print for development
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
      fatal: '\x1b[35m', // magenta
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];
    const prefix = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp}`;
    const context = entry.requestId ? ` [req:${entry.requestId}]` : '';
    const service = entry.service ? ` [${entry.service}]` : '';
    const { level: _, timestamp: __, message: ___, requestId: ____, ...rest } = entry;
    const extra = Object.keys(rest).length > 0 ? `\n  ${JSON.stringify(rest, null, 2)}` : '';
    return `${prefix}${service}${context} ${entry.message}${extra}`;
  }
  // JSON for production
  return JSON.stringify(entry);
}

class Logger {
  private service?: string;
  private defaultContext: Record<string, unknown> = {};

  constructor(service?: string, defaultContext?: Record<string, unknown>) {
    this.service = service;
    if (defaultContext) this.defaultContext = defaultContext;
  }

  child(service: string, context?: Record<string, unknown>): Logger {
    return new Logger(service, { ...this.defaultContext, ...context });
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      ...this.defaultContext,
      ...context,
    };

    const output = formatEntry(entry);

    switch (level) {
      case 'debug':
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'fatal':
        console.error(output);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void { this.log('debug', message, context); }
  info(message: string, context?: Record<string, unknown>): void { this.log('info', message, context); }
  warn(message: string, context?: Record<string, unknown>): void { this.log('warn', message, context); }
  error(message: string, context?: Record<string, unknown>): void { this.log('error', message, context); }
  fatal(message: string, context?: Record<string, unknown>): void { this.log('fatal', message, context); }
}

// Pre-configured loggers
export const logger = new Logger('api');
export const authLogger = new Logger('auth');
export const paymentLogger = new Logger('payment');
export const dbLogger = new Logger('db');
export const dispatchLogger = new Logger('dispatch');
export const realtimeLogger = new Logger('realtime');
export const notificationLogger = new Logger('notification');

export { Logger };
export default logger;
