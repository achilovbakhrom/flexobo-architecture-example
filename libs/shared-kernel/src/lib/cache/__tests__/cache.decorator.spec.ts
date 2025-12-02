import {
  Cacheable,
  CacheEvict,
  registerCache,
  getCache,
  clearCaches,
} from '../cache.decorator';
import { ICache } from '../cache.interface';

describe('Cache Decorators', () => {
  let mockCache: jest.Mocked<ICache>;

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      clear: jest.fn(),
      keys: jest.fn(),
    };

    clearCaches();
    registerCache('default', mockCache);
  });

  describe('@Cacheable', () => {
    it('should cache method result', async () => {
      class TestService {
        callCount = 0;

        @Cacheable({
          ttl: 300,
          keyGenerator: (...args: unknown[]) => `user:${args[0] as string}`,
        })
        async getUser(id: string): Promise<{ id: string; name: string }> {
          this.callCount++;
          return { id, name: `User ${id}` };
        }
      }

      const service = new TestService();
      mockCache.get.mockResolvedValue(null);

      // First call - miss
      await service.getUser('123');
      expect(service.callCount).toBe(1);
      expect(mockCache.get).toHaveBeenCalledWith('user:123');
      expect(mockCache.set).toHaveBeenCalledWith(
        'user:123',
        { id: '123', name: 'User 123' },
        300
      );

      // Second call - hit
      mockCache.get.mockResolvedValue({ id: '123', name: 'User 123' });
      const result = await service.getUser('123');
      expect(service.callCount).toBe(1); // Not called again
      expect(result).toEqual({ id: '123', name: 'User 123' });
    });

    it('should use default key generator when not provided', async () => {
      class TestService {
        @Cacheable({ ttl: 60 })
        async getData(param: string): Promise<string> {
          return `data-${param}`;
        }
      }

      const service = new TestService();
      mockCache.get.mockResolvedValue(null);

      await service.getData('test');

      expect(mockCache.get).toHaveBeenCalled();
      const key = (mockCache.get as jest.Mock).mock.calls[0][0];
      expect(key).toContain('TestService.getData');
    });

    it('should not cache when condition returns false', async () => {
      class TestService {
        @Cacheable({
          ttl: 60,
          keyGenerator: (...args: unknown[]) => `user:${args[0] as string}`,
          condition: (result: unknown) =>
            (result as { id: string; active: boolean }).active,
        })
        async getUser(id: string): Promise<{ id: string; active: boolean }> {
          return { id, active: false };
        }
      }

      const service = new TestService();
      mockCache.get.mockResolvedValue(null);

      await service.getUser('123');

      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should execute original method when cache is not available', async () => {
      clearCaches(); // Remove cache

      class TestService {
        @Cacheable({
          keyGenerator: (...args: unknown[]) => `user:${args[0] as string}`,
        })
        async getUser(id: string): Promise<{ id: string }> {
          return { id };
        }
      }

      const service = new TestService();
      const result = await service.getUser('123');

      expect(result).toEqual({ id: '123' });
    });
  });

  describe('@CacheEvict', () => {
    it('should evict single key after method execution', async () => {
      class TestService {
        @CacheEvict({
          keyGenerator: (...args: unknown[]) => `user:${args[0] as string}`,
        })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async updateUser(
          _id: string,
          _data: Record<string, unknown>
        ): Promise<void> {
          // Update logic
        }
      }

      const service = new TestService();
      await service.updateUser('123', { name: 'Updated' });

      expect(mockCache.del).toHaveBeenCalledWith('user:123');
    });

    it('should evict keys matching pattern', async () => {
      mockCache.delPattern.mockResolvedValue(5);

      class TestService {
        @CacheEvict({ pattern: 'users:*', allEntries: true })
        async deleteAllUsers(): Promise<void> {
          // Delete logic
        }
      }

      const service = new TestService();
      await service.deleteAllUsers();

      expect(mockCache.delPattern).toHaveBeenCalledWith('users:*');
    });

    it('should evict before method execution when beforeInvocation is true', async () => {
      const executionOrder: string[] = [];

      mockCache.del.mockImplementation(async () => {
        executionOrder.push('evict');
      });

      class TestService {
        @CacheEvict({
          keyGenerator: (...args: unknown[]) => `user:${args[0] as string}`,
          beforeInvocation: true,
        })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async updateUser(_id: string): Promise<void> {
          executionOrder.push('method');
        }
      }

      const service = new TestService();
      await service.updateUser('123');

      expect(executionOrder).toEqual(['evict', 'method']);
    });

    it('should evict after method execution by default', async () => {
      const executionOrder: string[] = [];

      mockCache.del.mockImplementation(async () => {
        executionOrder.push('evict');
      });

      class TestService {
        @CacheEvict({
          keyGenerator: (...args: unknown[]) => `user:${args[0] as string}`,
        })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async updateUser(_id: string): Promise<void> {
          executionOrder.push('method');
        }
      }

      const service = new TestService();
      await service.updateUser('123');

      expect(executionOrder).toEqual(['method', 'evict']);
    });
  });

  describe('cache registry', () => {
    it('should register and retrieve cache', () => {
      const cache = getCache('default');
      expect(cache).toBe(mockCache);
    });

    it('should return undefined for unregistered cache', () => {
      const cache = getCache('nonexistent');
      expect(cache).toBeUndefined();
    });

    it('should clear all caches', () => {
      clearCaches();
      const cache = getCache('default');
      expect(cache).toBeUndefined();
    });
  });
});
