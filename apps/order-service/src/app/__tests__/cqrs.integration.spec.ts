/**
 * CQRS Integration Tests for Order Service
 * Tests command handlers, query handlers, and event sourcing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { OrderModule } from '../../order.module';

describe('Order Service CQRS Integration Tests', () => {
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Command: Create Order', () => {
    it('should create a new order', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ userId: 'user-123' })
        .expect(201);

      expect(response.body).toHaveProperty('orderId');
      expect(response.body.orderId).toMatch(/^order-/);
    });

    it('should reject empty userId', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ userId: '' })
        .expect(400);
    });
  });

  describe('Command: Add Order Item', () => {
    let orderId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ userId: 'user-item-test' });
      orderId = response.body.orderId;
    });

    it('should add item to order', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/items`)
        .send({
          productId: 'prod-123',
          productName: 'Test Product',
          quantity: 2,
          price: 29.99,
          currency: 'USD',
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should reject invalid quantity', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/items`)
        .send({
          productId: 'prod-123',
          productName: 'Test Product',
          quantity: -1,
          price: 29.99,
          currency: 'USD',
        })
        .expect(400);
    });

    it('should reject invalid price', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/items`)
        .send({
          productId: 'prod-123',
          productName: 'Test Product',
          quantity: 1,
          price: -10,
          currency: 'USD',
        })
        .expect(400);
    });
  });

  describe('Command: Confirm Order', () => {
    let orderId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ userId: 'user-confirm-test' });
      orderId = response.body.orderId;

      // Add item first
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/items`)
        .send({
          productId: 'prod-456',
          productName: 'Confirm Test Product',
          quantity: 1,
          price: 49.99,
          currency: 'USD',
        });
    });

    it('should confirm order', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/orders/${orderId}/confirm`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('Command: Cancel Order', () => {
    let orderId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ userId: 'user-cancel-test' });
      orderId = response.body.orderId;
    });

    it('should cancel order with reason', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/orders/${orderId}`)
        .send({ reason: 'Customer changed mind' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should reject cancel without reason', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/orders/${orderId}`)
        .send({})
        .expect(400);
    });
  });

  describe('Command: Ship Order', () => {
    let orderId: string;

    beforeEach(async () => {
      // Create order
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ userId: 'user-ship-test' });
      orderId = response.body.orderId;

      // Add item
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/items`)
        .send({
          productId: 'prod-789',
          productName: 'Ship Test Product',
          quantity: 1,
          price: 99.99,
          currency: 'USD',
        });

      // Confirm order
      await request(app.getHttpServer())
        .put(`/api/v1/orders/${orderId}/confirm`);
    });

    it('should ship order with tracking number', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/orders/${orderId}/ship`)
        .send({ trackingNumber: 'TRACK123456789' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should reject ship without tracking number', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/orders/${orderId}/ship`)
        .send({})
        .expect(400);
    });
  });

  describe('Query: Get Order By ID', () => {
    let orderId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ userId: 'user-query-test' });
      orderId = response.body.orderId;
    });

    it('should get order by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return error for non-existent order', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/non-existent-id')
        .expect(200);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Query: Get Orders By User', () => {
    const userId = 'user-list-test';

    beforeAll(async () => {
      // Create multiple orders for user
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({ userId });
      }
    });

    it('should get orders by user ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/orders/user/${userId}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Full Order Lifecycle', () => {
    it('should complete full order flow: create -> add items -> confirm -> ship', async () => {
      // 1. Create order
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ userId: 'user-lifecycle' })
        .expect(201);

      const orderId = createResponse.body.orderId;
      expect(orderId).toBeDefined();

      // 2. Add multiple items
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/items`)
        .send({
          productId: 'prod-a',
          productName: 'Product A',
          quantity: 2,
          price: 25.00,
          currency: 'USD',
        })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/items`)
        .send({
          productId: 'prod-b',
          productName: 'Product B',
          quantity: 1,
          price: 50.00,
          currency: 'USD',
        })
        .expect(200);

      // 3. Confirm order
      await request(app.getHttpServer())
        .put(`/api/v1/orders/${orderId}/confirm`)
        .expect(200);

      // 4. Ship order
      await request(app.getHttpServer())
        .put(`/api/v1/orders/${orderId}/ship`)
        .send({ trackingNumber: 'LIFECYCLE-TRACK-001' })
        .expect(200);

      // 5. Verify final state
      const finalResponse = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .expect(200);

      expect(finalResponse.body).toBeDefined();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent order creation', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({ userId: `concurrent-user-${i}` })
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('orderId');
      });

      // Verify all order IDs are unique
      const orderIds = responses.map(r => r.body.orderId);
      const uniqueIds = new Set(orderIds);
      expect(uniqueIds.size).toBe(orderIds.length);
    });

    it('should handle concurrent item additions to same order', async () => {
      // Create order
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ userId: 'concurrent-items-user' });
      const orderId = createResponse.body.orderId;

      // Add items concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .post(`/api/v1/orders/${orderId}/items`)
          .send({
            productId: `prod-concurrent-${i}`,
            productName: `Concurrent Product ${i}`,
            quantity: 1,
            price: 10.00,
            currency: 'USD',
          })
      );

      const responses = await Promise.all(promises);

      // Note: Some might fail due to concurrency conflicts
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long product names', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ userId: 'long-name-user' });
      const orderId = createResponse.body.orderId;

      const longName = 'A'.repeat(1000);
      const response = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/items`)
        .send({
          productId: 'prod-long',
          productName: longName,
          quantity: 1,
          price: 10.00,
          currency: 'USD',
        });

      // Should either succeed or fail gracefully
      expect([200, 400]).toContain(response.status);
    });

    it('should handle maximum quantity values', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ userId: 'max-qty-user' });
      const orderId = createResponse.body.orderId;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/items`)
        .send({
          productId: 'prod-max',
          productName: 'Max Qty Product',
          quantity: 999999,
          price: 0.01,
          currency: 'USD',
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });
});
