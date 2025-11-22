import { RedisCache } from '../redis-cache';
import { CacheConfig } from '../cache.interface';
import Redis from 'ioredis-mock';

describe('RedisCache', () => {
  let cache: RedisCache;
  let redisClient: InstanceType<typeof Redis>;

  beforeEach(() => {
    redisClient = new Redis();
    const config: CacheConfig = {
      prefix: 'test:',
      defaultTtl: 60,
      enableStats: true,
    };
    cache = new RedisCache(redisClient, config);
  });

  afterEach(async () => {
    await cache.clear();
    await cache.onModuleDestroy();
  });

  describe('set and get', () => {
    it('should set and get value', async () => {
      await cache.set('key1', { name: 'test' });
      const value = await cache.get<{ name: string }>('key1');

      expect(value).toEqual({ name: 'test' });
    });

    it('should return null for non-existent key', async () => {
      const value = await cache.get('nonexistent');
      expect(value).toBeNull();
    });

    it('should set value with custom TTL', async () => {
      await cache.set('key2', 'value', 1);

      let value = await cache.get('key2');
      expect(value).toBe('value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));
      value = await cache.get('key2');
      expect(value).toBeNull();
    });

    it('should handle complex objects', async () => {
      const data = {
        id: '123',
        nested: {
          array: [1, 2, 3],
          boolean: true,
        },
      };

      await cache.set('complex', data);
      const retrieved = await cache.get('complex');
      expect(retrieved).toEqual(data);
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      await cache.set('key1', 'value');
      await cache.del('key1');

      const value = await cache.get('key1');
      expect(value).toBeNull();
    });
  });

  describe('delPattern', () => {
    it('should delete keys matching pattern', async () => {
      await cache.set('user:1', 'user1');
      await cache.set('user:2', 'user2');
      await cache.set('post:1', 'post1');

      const deleted = await cache.delPattern('user:*');
      expect(deleted).toBe(2);

      const user1 = await cache.get('user:1');
      const user2 = await cache.get('user:2');
      const post1 = await cache.get('post:1');

      expect(user1).toBeNull();
      expect(user2).toBeNull();
      expect(post1).toBe('post1');
    });
  });

  describe('exists', () => {
    it('should check if key exists', async () => {
      await cache.set('key1', 'value');

      const exists = await cache.exists('key1');
      expect(exists).toBe(true);

      const notExists = await cache.exists('key2');
      expect(notExists).toBe(false);
    });
  });

  describe('expire and ttl', () => {
    it('should set expiration on key', async () => {
      await cache.set('key1', 'value', 0); // No expiration
      await cache.expire('key1', 60);

      const ttl = await cache.ttl('key1');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should return -1 for key without expiration', async () => {
      await cache.set('key1', 'value', 0);
      const ttl = await cache.ttl('key1');
      expect(ttl).toBe(-1);
    });
  });

  describe('mget and mset', () => {
    it('should get multiple values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      const values = await cache.mget<string>([
        'key1',
        'key2',
        'key3',
        'nonexistent',
      ]);
      expect(values).toEqual(['value1', 'value2', 'value3', null]);
    });

    it('should set multiple values', async () => {
      await cache.mset({
        key1: 'value1',
        key2: { name: 'test' },
        key3: [1, 2, 3],
      });

      const value1 = await cache.get('key1');
      const value2 = await cache.get('key2');
      const value3 = await cache.get('key3');

      expect(value1).toBe('value1');
      expect(value2).toEqual({ name: 'test' });
      expect(value3).toEqual([1, 2, 3]);
    });
  });

  describe('incr and decr', () => {
    it('should increment value', async () => {
      const count1 = await cache.incr('counter');
      const count2 = await cache.incr('counter');
      const count3 = await cache.incr('counter');

      expect(count1).toBe(1);
      expect(count2).toBe(2);
      expect(count3).toBe(3);
    });

    it('should decrement value', async () => {
      await cache.incr('counter'); // 1
      await cache.incr('counter'); // 2
      await cache.incr('counter'); // 3

      const count1 = await cache.decr('counter');
      const count2 = await cache.decr('counter');

      expect(count1).toBe(2);
      expect(count2).toBe(1);
    });
  });

  describe('keys', () => {
    it('should get keys matching pattern', async () => {
      await cache.set('user:1', 'user1');
      await cache.set('user:2', 'user2');
      await cache.set('post:1', 'post1');

      const keys = await cache.keys('user:*');
      expect(keys).toHaveLength(2);
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      await cache.clear();

      const value1 = await cache.get('key1');
      const value2 = await cache.get('key2');

      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should track cache hits and misses', async () => {
      await cache.set('key1', 'value');

      await cache.get('key1'); // hit
      await cache.get('key2'); // miss
      await cache.get('key1'); // hit
      await cache.get('key3'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track sets and deletes', async () => {
      await cache.set('key1', 'value');
      await cache.set('key2', 'value');
      await cache.del('key1');

      const stats = cache.getStats();
      expect(stats.sets).toBe(2);
      expect(stats.deletes).toBe(1);
    });

    it('should reset statistics', async () => {
      await cache.set('key1', 'value');
      await cache.get('key1');

      cache.resetStats();
      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.deletes).toBe(0);
    });
  });

  describe('key prefix', () => {
    it('should use prefix for all keys', async () => {
      await cache.set('mykey', 'value');

      // Access underlying Redis client
      const rawValue = await redisClient.get('test:mykey');
      expect(rawValue).toBeDefined();
      if (rawValue) {
        expect(JSON.parse(rawValue)).toBe('value');
      }
    });
  });
});
