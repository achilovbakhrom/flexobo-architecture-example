import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerOpenError,
} from '../circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 60000,
      resetTimeout: 1000,
      name: 'TestCircuit',
    });
  });

  describe('CLOSED state', () => {
    it('should execute function successfully when CLOSED', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should remain CLOSED after single failure', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      await expect(circuitBreaker.execute(fn)).rejects.toThrow('failure');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should open circuit after failure threshold reached', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(fn)).rejects.toThrow('failure');
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      // Open the circuit by reaching failure threshold
      const fn = jest.fn().mockRejectedValue(new Error('failure'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(fn)).rejects.toThrow('failure');
      }
    });

    it('should reject requests immediately when OPEN', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      await expect(circuitBreaker.execute(fn)).rejects.toThrow(
        CircuitBreakerOpenError
      );
      expect(fn).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const fn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(fn);

      // After first success in HALF_OPEN, need second success to close
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);

      await circuitBreaker.execute(fn);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      // Open and wait for reset timeout
      const fn = jest.fn().mockRejectedValue(new Error('failure'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(fn)).rejects.toThrow('failure');
      }
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    it('should close circuit after success threshold reached', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      await circuitBreaker.execute(fn);
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);

      await circuitBreaker.execute(fn);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reopen circuit on failure', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      await expect(circuitBreaker.execute(fn)).rejects.toThrow('failure');
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('statistics', () => {
    it('should track statistics correctly', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const failureFn = jest.fn().mockRejectedValue(new Error('failure'));

      await circuitBreaker.execute(successFn);
      await expect(circuitBreaker.execute(failureFn)).rejects.toThrow();

      const stats = circuitBreaker.getStats();

      expect(stats.totalCalls).toBe(2);
      expect(stats.totalSuccesses).toBe(1);
      expect(stats.totalFailures).toBe(1);
      expect(stats.lastSuccessTime).not.toBeNull();
      expect(stats.lastFailureTime).not.toBeNull();
    });
  });

  describe('manual control', () => {
    it('should manually open circuit', () => {
      circuitBreaker.open();
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should manually close circuit', async () => {
      circuitBreaker.open();
      circuitBreaker.close();
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should manually set half-open', () => {
      circuitBreaker.halfOpen();
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
    });
  });

  describe('error filter', () => {
    it('should not count filtered errors', async () => {
      const cb = new CircuitBreaker({
        failureThreshold: 2,
        errorFilter: (error) => error.message !== 'ignored',
      });

      const fn1 = jest.fn().mockRejectedValue(new Error('ignored'));
      const fn2 = jest.fn().mockRejectedValue(new Error('counted'));

      await expect(cb.execute(fn1)).rejects.toThrow('ignored');
      expect(cb.getState()).toBe(CircuitState.CLOSED);

      await expect(cb.execute(fn2)).rejects.toThrow('counted');
      await expect(cb.execute(fn2)).rejects.toThrow('counted');
      expect(cb.getState()).toBe(CircuitState.OPEN);
    });
  });
});
