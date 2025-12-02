import {
  CacheInvalidationStrategy,
  DefaultCacheKeyStrategy,
} from '../cache-strategy';
import { ICache } from '../cache.interface';

describe('Cache Strategy', () => {
  let mockCache: jest.Mocked<ICache>;
  let keyStrategy: DefaultCacheKeyStrategy;
  let invalidationStrategy: CacheInvalidationStrategy;

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

    keyStrategy = new DefaultCacheKeyStrategy();
    invalidationStrategy = new CacheInvalidationStrategy(
      mockCache,
      keyStrategy
    );
  });

  describe('DefaultCacheKeyStrategy', () => {
    it('should generate aggregate key', () => {
      const key = keyStrategy.forAggregate('Truck', 'truck-123');
      expect(key).toBe('aggregate:Truck:truck-123');
    });

    it('should generate query key with sorted parameters', () => {
      const key = keyStrategy.forQuery('GetTrucksByStatus', {
        status: 'ACTIVE',
        limit: 10,
        companyId: 'company-1',
      });

      expect(key).toContain('query:GetTrucksByStatus:');
      expect(key).toContain('companyId=');
      expect(key).toContain('limit=');
      expect(key).toContain('status=');
    });

    it('should generate list key with filters', () => {
      const key = keyStrategy.forList('Truck', { status: 'ACTIVE' }, 1, 10);
      expect(key).toContain('list:Truck:');
      expect(key).toContain('status="ACTIVE"');
      expect(key).toContain(':page=1:limit=10');
    });

    it('should generate list key without pagination', () => {
      const key = keyStrategy.forList('Truck', { status: 'ACTIVE' });
      expect(key).toBe('list:Truck:status="ACTIVE"');
    });

    it('should generate company-specific key', () => {
      const key = keyStrategy.forCompany('company-1', 'Truck', 'truck-123');
      expect(key).toBe('company:company-1:Truck:truck-123');
    });
  });

  describe('CacheInvalidationStrategy', () => {
    it('should invalidate aggregate cache', async () => {
      await invalidationStrategy.invalidateAggregate('Truck', 'truck-123');
      expect(mockCache.del).toHaveBeenCalledWith('aggregate:Truck:truck-123');
    });

    it('should invalidate all aggregates of type', async () => {
      mockCache.delPattern.mockResolvedValue(10);

      await invalidationStrategy.invalidateAggregateType('Truck');
      expect(mockCache.delPattern).toHaveBeenCalledWith('aggregate:Truck:*');
    });

    it('should invalidate query caches', async () => {
      mockCache.delPattern.mockResolvedValue(5);

      await invalidationStrategy.invalidateQuery('GetTrucksByStatus');
      expect(mockCache.delPattern).toHaveBeenCalledWith(
        'query:GetTrucksByStatus:*'
      );
    });

    it('should invalidate list caches', async () => {
      mockCache.delPattern.mockResolvedValue(3);

      await invalidationStrategy.invalidateList('Truck');
      expect(mockCache.delPattern).toHaveBeenCalledWith('list:Truck:*');
    });

    it('should invalidate company caches for specific resource', async () => {
      mockCache.delPattern.mockResolvedValue(8);

      await invalidationStrategy.invalidateCompany('company-1', 'Truck');
      expect(mockCache.delPattern).toHaveBeenCalledWith(
        'company:company-1:Truck:*'
      );
    });

    it('should invalidate all company caches', async () => {
      mockCache.delPattern.mockResolvedValue(20);

      await invalidationStrategy.invalidateCompany('company-1');
      expect(mockCache.delPattern).toHaveBeenCalledWith('company:company-1:*');
    });

    it('should invalidate related caches', async () => {
      mockCache.delPattern.mockResolvedValue(5);

      await invalidationStrategy.invalidateRelated('Truck', 'truck-123');

      expect(mockCache.del).toHaveBeenCalledWith('aggregate:Truck:truck-123');
      expect(mockCache.delPattern).toHaveBeenCalledWith('list:Truck:*');
      expect(mockCache.delPattern).toHaveBeenCalledWith('query:Truck:*');
    });
  });
});
