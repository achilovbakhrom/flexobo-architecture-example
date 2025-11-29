/**
 * CQRS Stress Tests for Order Service
 * Tests performance under high load
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { OrderModule } from '../../order.module';

describe('Order Service CQRS Stress Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OrderModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      })
    );

    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('High Volume Order Creation', () => {
    it('should handle 20 concurrent order creations', async () => {
      const startTime = Date.now();
      const orderCount = 20;

      const promises = Array.from({ length: orderCount }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({ userId: `stress-user-${i}` })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      const successCount = responses.filter(r => r.status === 201).length;
      const failCount = responses.filter(r => r.status !== 201).length;
      const avgTime = (endTime - startTime) / orderCount;

      console.log(`
        Stress Test Results - Order Creation:
        Total Orders: ${orderCount}
        Successful: ${successCount}
        Failed: ${failCount}
        Total Time: ${endTime - startTime}ms
        Avg Time per Order: ${avgTime.toFixed(2)}ms
      `);

      expect(successCount).toBe(orderCount);
      expect(avgTime).toBeLessThan(100); // Each order should complete in < 100ms avg
    }, 30000);

    it('should handle 100 sequential order creations', async () => {
      const startTime = Date.now();
      const orderCount = 100;
      const orderIds: string[] = [];

      for (let i = 0; i < orderCount; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({ userId: `seq-stress-user-${i}` });

        if (response.status === 201) {
          orderIds.push(response.body.orderId);
        }
      }

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / orderCount;

      console.log(`
        Stress Test Results - Sequential Order Creation:
        Total Orders: ${orderCount}
        Successful: ${orderIds.length}
        Total Time: ${endTime - startTime}ms
        Avg Time per Order: ${avgTime.toFixed(2)}ms
      `);

      expect(orderIds.length).toBe(orderCount);
    }, 60000);
  });

  describe('High Volume Item Additions', () => {
    it('should handle adding 20 items to single order', async () => {
      // Create order
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ userId: 'items-stress-user' });
      const orderId = createResponse.body.orderId;

      const startTime = Date.now();
      const itemCount = 20;
      let successCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < itemCount; i++) {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/orders/${orderId}/items`)
          .send({
            productId: `stress-prod-${i}`,
            productName: `Stress Product ${i}`,
            quantity: 1,
            price: 10.00,
            currency: 'USD',
          });

        if (response.status === 200) {
          successCount++;
        } else {
          errors.push(`Item ${i}: ${response.status} - ${JSON.stringify(response.body)}`);
        }
      }

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / itemCount;

      console.log(`
        Stress Test Results - Item Additions:
        Total Items: ${itemCount}
        Successful: ${successCount}
        Failed: ${errors.length}
        Total Time: ${endTime - startTime}ms
        Avg Time per Item: ${avgTime.toFixed(2)}ms
        ${errors.length > 0 ? `\nErrors:\n${errors.slice(0, 5).join('\n')}` : ''}
      `);

      expect(successCount).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Mixed Operations Stress Test', () => {
    it('should handle mixed concurrent operations', async () => {
      const startTime = Date.now();
      const operationCount = 30;

      // Create base orders first
      const orderPromises = Array.from({ length: operationCount }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({ userId: `mixed-user-${i}` })
      );
      const orderResponses = await Promise.all(orderPromises);
      const orderIds = orderResponses
        .filter(r => r.status === 201)
        .map(r => r.body.orderId);

      // Now perform mixed operations concurrently
      const mixedPromises: Promise<request.Response>[] = [];

      orderIds.forEach((orderId, i) => {
        // Add item
        mixedPromises.push(
          request(app.getHttpServer())
            .post(`/api/v1/orders/${orderId}/items`)
            .send({
              productId: `mixed-prod-${i}`,
              productName: `Mixed Product ${i}`,
              quantity: 1,
              price: 25.00,
              currency: 'USD',
            })
        );

        // Query order
        mixedPromises.push(
          request(app.getHttpServer())
            .get(`/api/v1/orders/${orderId}`)
        );
      });

      const mixedResponses = await Promise.all(mixedPromises);
      const endTime = Date.now();

      const successCount = mixedResponses.filter(r => r.status === 200).length;

      console.log(`
        Stress Test Results - Mixed Operations:
        Total Operations: ${mixedPromises.length}
        Successful: ${successCount}
        Total Time: ${endTime - startTime}ms
        Operations/second: ${(mixedPromises.length / ((endTime - startTime) / 1000)).toFixed(2)}
      `);

      expect(successCount).toBeGreaterThan(mixedPromises.length * 0.8); // 80% success rate
    }, 60000);
  });

  describe('Full Lifecycle Stress Test', () => {
    it('should complete multiple full order lifecycles concurrently', async () => {
      const startTime = Date.now();
      const lifecycleCount = 10;

      const lifecyclePromise = async (index: number) => {
        // Create
        const createRes = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({ userId: `lifecycle-user-${index}` });

        if (createRes.status !== 201) return false;
        const orderId = createRes.body.orderId;

        // Add item
        const itemRes = await request(app.getHttpServer())
          .post(`/api/v1/orders/${orderId}/items`)
          .send({
            productId: `lifecycle-prod-${index}`,
            productName: `Lifecycle Product ${index}`,
            quantity: 1,
            price: 50.00,
            currency: 'USD',
          });

        if (itemRes.status !== 200) return false;

        // Confirm
        const confirmRes = await request(app.getHttpServer())
          .put(`/api/v1/orders/${orderId}/confirm`);

        if (confirmRes.status !== 200) return false;

        // Ship
        const shipRes = await request(app.getHttpServer())
          .put(`/api/v1/orders/${orderId}/ship`)
          .send({ trackingNumber: `STRESS-TRACK-${index}` });

        return shipRes.status === 200;
      };

      const results = await Promise.all(
        Array.from({ length: lifecycleCount }, (_, i) => lifecyclePromise(i))
      );

      const endTime = Date.now();
      const successCount = results.filter(r => r).length;

      console.log(`
        Stress Test Results - Full Lifecycles:
        Total Lifecycles: ${lifecycleCount}
        Successful: ${successCount}
        Total Time: ${endTime - startTime}ms
        Avg Time per Lifecycle: ${((endTime - startTime) / lifecycleCount).toFixed(2)}ms
      `);

      expect(successCount).toBe(lifecycleCount);
    }, 60000);
  });

  describe('Query Performance', () => {
    it('should handle high volume queries', async () => {
      // First create some orders
      const orderIds: string[] = [];
      for (let i = 0; i < 20; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({ userId: `query-perf-user-${i}` });
        if (response.status === 201) {
          orderIds.push(response.body.orderId);
        }
      }

      const startTime = Date.now();
      const queryCount = 100;

      const queryPromises = Array.from({ length: queryCount }, (_, i) =>
        request(app.getHttpServer())
          .get(`/api/v1/orders/${orderIds[i % orderIds.length]}`)
      );

      const responses = await Promise.all(queryPromises);
      const endTime = Date.now();

      const successCount = responses.filter(r => r.status === 200).length;
      const avgTime = (endTime - startTime) / queryCount;

      console.log(`
        Stress Test Results - Queries:
        Total Queries: ${queryCount}
        Successful: ${successCount}
        Total Time: ${endTime - startTime}ms
        Avg Time per Query: ${avgTime.toFixed(2)}ms
        Queries/second: ${(queryCount / ((endTime - startTime) / 1000)).toFixed(2)}
      `);

      expect(successCount).toBe(queryCount);
      expect(avgTime).toBeLessThan(50); // Each query should be < 50ms avg
    }, 30000);
  });
});
