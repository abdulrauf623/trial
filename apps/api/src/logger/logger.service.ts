import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  trace?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.writeLog(LogLevel.INFO, message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.writeLog(LogLevel.ERROR, message, context, trace);
  }

  warn(message: any, context?: string) {
    this.writeLog(LogLevel.WARN, message, context);
  }

  debug(message: any, context?: string) {
    this.writeLog(LogLevel.DEBUG, message, context);
  }

  verbose(message: any, context?: string) {
    this.writeLog(LogLevel.INFO, message, context);
  }

  private writeLog(
    level: LogLevel,
    message: any,
    context?: string,
    trace?: string
  ) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      context: context || this.context,
      ...(trace && { trace }),
    };

    // In production, this would send to a logging service (e.g., Winston, Sentry)
    const logString = this.formatLog(logEntry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.DEBUG:
        console.debug(logString);
        break;
      default:
        console.log(logString);
    }
  }

  private formatLog(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
    ];

    if (entry.context) {
      parts.push(`[${entry.context}]`);
    }

    parts.push(entry.message);

    if (entry.trace) {
      parts.push(`\n${entry.trace}`);
    }

    return parts.join(' ');
  }

  trackError(error: Error, context?: string, _metadata?: Record<string, any>) {
    this.error(
      `Error tracked: ${error.message}`,
      error.stack,
      context || this.context
    );

    // In production, send to error tracking service (e.g., Sentry)
    // Sentry.captureException(error, {
    //   contexts: {
    //     metadata: {
    //       name: error.name,
    //       message: error.message,
    //       stack: error.stack,
    //       ..._metadata,
    //     }
    //   }
    // });
  }

  trackEvent(eventName: string, properties?: Record<string, any>) {
    this.log(`Event: ${eventName}`, JSON.stringify(properties));

    // In production, send to analytics service
    // analytics.track(eventName, properties);
  }

  trackPerformance(operation: string, duration: number, metadata?: Record<string, any>) {
    this.log(
      `Performance: ${operation} took ${duration}ms`,
      JSON.stringify(metadata)
    );

    // In production, send to performance monitoring service
    // newrelic.recordMetric(operation, duration);
  }
}
