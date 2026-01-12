/**
 * Structured Logger
 * Provides request-scoped logging with context
 */

export interface LogContext {
  requestId: string;
  sessionId?: string;
  query?: string;
  phase?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context: LogContext;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
  duration?: number;
}

export interface ErrorMetrics {
  total: number;
  byPhase: Record<string, number>;
  byType: Record<string, number>;
  lastError?: LogEntry;
}

// In-memory metrics (per worker instance)
const errorMetrics: ErrorMetrics = {
  total: 0,
  byPhase: {},
  byType: {},
};

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a logger instance for a specific request
 */
export function createLogger(context: LogContext) {
  const startTime = Date.now();

  const log = (level: LogEntry['level'], message: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      duration: Date.now() - startTime,
    };

    // Format for console output
    const prefix = `[${context.requestId}]${context.phase ? `[${context.phase}]` : ''}`;

    switch (level) {
      case 'debug':
        console.log(`${prefix} ${message}`, data ? JSON.stringify(data) : '');
        break;
      case 'info':
        console.log(`${prefix} ${message}`, data ? JSON.stringify(data) : '');
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data ? JSON.stringify(data) : '');
        break;
      case 'error':
        console.error(`${prefix} ${message}`, data ? JSON.stringify(data) : '');
        // Track error metrics
        errorMetrics.total++;
        if (context.phase) {
          errorMetrics.byPhase[context.phase] = (errorMetrics.byPhase[context.phase] || 0) + 1;
        }
        if (data?.errorType) {
          const errorType = String(data.errorType);
          errorMetrics.byType[errorType] = (errorMetrics.byType[errorType] || 0) + 1;
        }
        errorMetrics.lastError = entry;
        break;
    }

    return entry;
  };

  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
    info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
    error: (message: string, error?: Error | unknown, data?: Record<string, unknown>) => {
      const errorData = error instanceof Error
        ? { errorType: error.name, errorMessage: error.message, ...data }
        : { errorType: 'Unknown', errorMessage: String(error), ...data };
      return log('error', message, errorData);
    },

    // Update context
    setPhase: (phase: string) => {
      context.phase = phase;
    },

    // Get timing
    elapsed: () => Date.now() - startTime,

    // Get context for passing to sub-components
    getContext: () => ({ ...context }),
  };
}

export type Logger = ReturnType<typeof createLogger>;

/**
 * Get current error metrics
 */
export function getErrorMetrics(): ErrorMetrics {
  return { ...errorMetrics };
}

/**
 * Reset error metrics (for testing)
 */
export function resetErrorMetrics(): void {
  errorMetrics.total = 0;
  errorMetrics.byPhase = {};
  errorMetrics.byType = {};
  errorMetrics.lastError = undefined;
}

/**
 * Log URL correction for analysis
 */
export function logUrlCorrection(
  logger: Logger,
  originalUrl: string,
  correctedUrl: string,
  matchType: 'exact' | 'fuzzy' | 'keyword',
  confidence: number
): void {
  logger.info('URL corrected', {
    originalUrl,
    correctedUrl,
    matchType,
    confidence,
  });
}

/**
 * Monitoring hook interface
 */
export interface MonitoringHook {
  onError: (entry: LogEntry) => void;
  onPhaseComplete: (phase: string, duration: number, success: boolean) => void;
  onRequestComplete: (requestId: string, duration: number, success: boolean) => void;
}

// Global monitoring hooks
const monitoringHooks: MonitoringHook[] = [];

/**
 * Register a monitoring hook
 */
export function registerMonitoringHook(hook: MonitoringHook): void {
  monitoringHooks.push(hook);
}

/**
 * Notify monitoring hooks of an error
 */
export function notifyError(entry: LogEntry): void {
  for (const hook of monitoringHooks) {
    try {
      hook.onError(entry);
    } catch (e) {
      console.error('Monitoring hook error:', e);
    }
  }
}

/**
 * Notify monitoring hooks of phase completion
 */
export function notifyPhaseComplete(phase: string, duration: number, success: boolean): void {
  for (const hook of monitoringHooks) {
    try {
      hook.onPhaseComplete(phase, duration, success);
    } catch (e) {
      console.error('Monitoring hook error:', e);
    }
  }
}

/**
 * Notify monitoring hooks of request completion
 */
export function notifyRequestComplete(requestId: string, duration: number, success: boolean): void {
  for (const hook of monitoringHooks) {
    try {
      hook.onRequestComplete(requestId, duration, success);
    } catch (e) {
      console.error('Monitoring hook error:', e);
    }
  }
}
