/**
 * Logger Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createLogger,
  generateRequestId,
  getErrorMetrics,
  resetErrorMetrics,
  registerMonitoringHook,
  notifyRequestComplete,
  type MonitoringHook,
} from '../lib/logger';

describe('Logger', () => {
  beforeEach(() => {
    resetErrorMetrics();
    vi.restoreAllMocks();
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('should have req_ prefix', () => {
      const id = generateRequestId();
      expect(id.startsWith('req_')).toBe(true);
    });
  });

  describe('createLogger', () => {
    it('should create logger with context', () => {
      const logger = createLogger({
        requestId: 'req_test_123',
        sessionId: 'session_456',
        query: 'test query',
      });

      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
    });

    it('should track elapsed time', async () => {
      const logger = createLogger({ requestId: 'req_test' });

      await new Promise(resolve => setTimeout(resolve, 50));

      const elapsed = logger.elapsed();
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });

    it('should allow setting phase', () => {
      const logger = createLogger({ requestId: 'req_test' });

      logger.setPhase('classification');

      const context = logger.getContext();
      expect(context.phase).toBe('classification');
    });

    it('should return context copy', () => {
      const logger = createLogger({
        requestId: 'req_test',
        sessionId: 'session_123',
      });

      const context = logger.getContext();

      expect(context.requestId).toBe('req_test');
      expect(context.sessionId).toBe('session_123');
    });
  });

  describe('error metrics', () => {
    it('should track errors by phase', () => {
      const logger = createLogger({ requestId: 'req_test' });
      logger.setPhase('generation');

      logger.error('Test error', new Error('test'));

      const metrics = getErrorMetrics();
      expect(metrics.total).toBe(1);
      expect(metrics.byPhase['generation']).toBe(1);
    });

    it('should track errors by type', () => {
      const logger = createLogger({ requestId: 'req_test' });

      logger.error('Test error', new TypeError('type error'));

      const metrics = getErrorMetrics();
      expect(metrics.byType['TypeError']).toBe(1);
    });

    it('should track multiple errors', () => {
      const logger1 = createLogger({ requestId: 'req_1' });
      logger1.setPhase('classification');
      const logger2 = createLogger({ requestId: 'req_2' });
      logger2.setPhase('rendering');

      logger1.error('Error 1', new Error('e1'));
      logger2.error('Error 2', new Error('e2'));
      logger2.error('Error 3', new Error('e3'));

      const metrics = getErrorMetrics();
      expect(metrics.total).toBe(3);
      expect(metrics.byPhase['classification']).toBe(1);
      expect(metrics.byPhase['rendering']).toBe(2);
    });

    it('should store last error', () => {
      const logger = createLogger({ requestId: 'req_test' });
      logger.setPhase('test');

      logger.error('First error', new Error('first'));
      logger.error('Last error', new Error('last'));

      const metrics = getErrorMetrics();
      expect(metrics.lastError?.message).toBe('Last error');
    });

    it('should reset metrics', () => {
      const logger = createLogger({ requestId: 'req_test' });
      logger.setPhase('test');
      logger.error('Test error', new Error('test'));

      resetErrorMetrics();

      const metrics = getErrorMetrics();
      expect(metrics.total).toBe(0);
      expect(Object.keys(metrics.byPhase)).toHaveLength(0);
    });
  });

  describe('monitoring hooks', () => {
    it('should notify on request complete', () => {
      const mockHook: MonitoringHook = {
        onError: vi.fn(),
        onPhaseComplete: vi.fn(),
        onRequestComplete: vi.fn(),
      };

      registerMonitoringHook(mockHook);
      notifyRequestComplete('req_test', 1000, true);

      expect(mockHook.onRequestComplete).toHaveBeenCalledWith('req_test', 1000, true);
    });
  });

  describe('log output', () => {
    it('should log info messages', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger({ requestId: 'req_test' });

      logger.info('Test message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log warnings', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logger = createLogger({ requestId: 'req_test' });

      logger.warn('Warning message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logger = createLogger({ requestId: 'req_test' });

      logger.error('Error message', new Error('test'));

      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
