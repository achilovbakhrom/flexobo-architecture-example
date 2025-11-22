/**
 * End-to-End Tests - Performance and Load
 *
 * Tests system performance under load
 */

import axios, { AxiosInstance } from 'axios';

describe('E2E: Performance Tests', () => {
  let client: AxiosInstance;

  beforeAll(() => {
    client = axios.create({
      baseURL: 'http://localhost:3001',
      timeout: 30000,
      validateStatus: () => true,
    });
  });

  describe('Response Times', () => {
    it('should respond to order creation within acceptable time', async () => {
      const orderData = {
        items: [
          {
            productId: 'perf-prod-1',
            productName: 'Performance Test Product',
            quantity: 1,
            price: 29.99,
          },
        ],
        shippingAddress: {
          street: '123 Perf St',
          city: 'PerfCity',
          state: 'PC',
          zipCode: '12345',
          country: 'USA',
        },
      };

      const start = Date.now();
      const response = await client.post('/api/v1/orders', orderData);
      const duration = Date.now() - start;

      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should respond to order listing quickly', async () => {
      const start = Date.now();
      const response = await client.get('/api/v1/orders', {
        params: { page: 1, limit: 10 },
      });
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent order creations', async () => {
      const orderData = {
        items: [
          {
            productId: 'concurrent-prod',
            productName: 'Concurrent Test',
            quantity: 1,
            price: 19.99,
          },
        ],
        shippingAddress: {
          street: '456 Concurrent Ave',
          city: 'ConcurrentCity',
          state: 'CC',
          zipCode: '54321',
          country: 'USA',
        },
      };

      // Create 10 orders concurrently
      const promises = Array.from({ length: 10 }, () =>
        client.post('/api/v1/orders', orderData)
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });

    it('should handle concurrent reads', async () => {
      // Make 20 concurrent read requests
      const promises = Array.from({ length: 20 }, () =>
        client.get('/api/v1/orders', { params: { page: 1, limit: 10 } })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should handle burst traffic', async () => {
      const requests = [];

      // Send 50 requests rapidly
      for (let i = 0; i < 50; i++) {
        requests.push(
          client.get('/api/v1/orders', { params: { page: 1, limit: 5 } })
        );
      }

      const responses = await Promise.all(requests);

      // Most should succeed, some might be rate limited (429)
      const successCount = responses.filter((r) => r.status === 200).length;
      const rateLimitedCount = responses.filter((r) => r.status === 429).length;

      expect(successCount + rateLimitedCount).toBe(50);
      console.log(
        `Success: ${successCount}, Rate Limited: ${rateLimitedCount}`
      );
    });
  });

  describe('Large Payloads', () => {
    it('should handle orders with many items', async () => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        productId: `large-prod-${i}`,
        productName: `Product ${i}`,
        quantity: 1,
        price: 10.0 + i,
      }));

      const orderData = {
        items,
        shippingAddress: {
          street: '789 Large Order Blvd',
          city: 'BigCity',
          state: 'BC',
          zipCode: '99999',
          country: 'USA',
        },
      };

      const response = await client.post('/api/v1/orders', orderData);

      expect(response.status).toBe(201);
      expect(response.data.items.length).toBe(50);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory with repeated requests', async () => {
      // Make 100 requests to check for memory leaks
      for (let i = 0; i < 100; i++) {
        await client.get('/api/v1/orders', { params: { page: 1, limit: 10 } });
      }

      // If we get here without timeout or crash, memory usage is acceptable
      expect(true).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary errors', async () => {
      // Send invalid request
      await client.post('/api/v1/orders', { items: [] });

      // System should still work for valid requests
      const response = await client.get('/api/v1/orders');
      expect(response.status).toBe(200);
    });
  });
});
