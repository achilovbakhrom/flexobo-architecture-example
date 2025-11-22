/**
 * Integration Tests for Order Service
 *
 * Tests the complete flow from HTTP request through domain logic to event persistence
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { OrderModule } from '../order.module';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

describe('Order Service Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OrderModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same configuration as production
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /orders', () => {
    it('should create a new order', async () => {
      const items: OrderItem[] = [
        {
          productId: 'prod-123',
          productName: 'Widget',
          quantity: 2,
          price: 29.99,
        },
        {
          productId: 'prod-456',
          productName: 'Gadget',
          quantity: 1,
          price: 49.99,
        },
      ];

      const response = await request(app.getHttpServer())
        .post('/orders')
        .send({
          items,
          shippingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: 'pending',
        totalAmount: 109.97,
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: 'prod-123',
            quantity: 2,
            price: 29.99,
          }),
        ]),
      });

      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should validate order items', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .send({
          items: [],
          shippingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        })
        .expect(400);

      expect(response.body.message).toContain('items');
    });

    it('should validate shipping address', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .send({
          items: [
            {
              productId: 'prod-123',
              productName: 'Widget',
              quantity: 1,
              price: 29.99,
            },
          ],
          shippingAddress: {
            street: '123 Main St',
            // Missing required fields
          },
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject negative quantities', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          items: [
            {
              productId: 'prod-123',
              productName: 'Widget',
              quantity: -1,
              price: 29.99,
            },
          ],
          shippingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        })
        .expect(400);
    });

    it('should reject negative prices', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          items: [
            {
              productId: 'prod-123',
              productName: 'Widget',
              quantity: 1,
              price: -29.99,
            },
          ],
          shippingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
        })
        .expect(400);
    });
  });

  describe('GET /orders/:id', () => {
    let orderId: string;

    beforeAll(async () => {
      // Create an order to retrieve
      const response = await request(app.getHttpServer())
        .post('/orders')
        .send({
          items: [
            {
              productId: 'prod-789',
              productName: 'Test Product',
              quantity: 1,
              price: 19.99,
            },
          ],
          shippingAddress: {
            street: '456 Test St',
            city: 'Boston',
            state: 'MA',
            zipCode: '02101',
            country: 'USA',
          },
        });

      orderId = response.body.id;
    });

    it('should retrieve an order by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: orderId,
        status: 'pending',
        totalAmount: 19.99,
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: 'prod-789',
            quantity: 1,
          }),
        ]),
      });
    });

    it('should return 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .get('/orders/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /orders', () => {
    beforeAll(async () => {
      // Create multiple orders for list testing
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/orders')
          .send({
            items: [
              {
                productId: `prod-list-${i}`,
                productName: `Product ${i}`,
                quantity: 1,
                price: 10.0,
              },
            ],
            shippingAddress: {
              street: '789 List St',
              city: 'Chicago',
              state: 'IL',
              zipCode: '60601',
              country: 'USA',
            },
          });
      }
    });

    it('should list orders with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        limit: 10,
        totalPages: expect.any(Number),
      });

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.total).toBeGreaterThanOrEqual(
        response.body.data.length
      );
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .query({ status: 'pending' })
        .expect(200);

      expect(
        response.body.data.every(
          (order: { status: string }) => order.status === 'pending'
        )
      ).toBe(true);
    });

    it('should respect pagination limits', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('POST /orders/:id/cancel', () => {
    let orderId: string;

    beforeEach(async () => {
      // Create a new order for each cancel test
      const response = await request(app.getHttpServer())
        .post('/orders')
        .send({
          items: [
            {
              productId: 'prod-cancel',
              productName: 'Cancellable Product',
              quantity: 1,
              price: 99.99,
            },
          ],
          shippingAddress: {
            street: '999 Cancel St',
            city: 'Seattle',
            state: 'WA',
            zipCode: '98101',
            country: 'USA',
          },
        });

      orderId = response.body.id;
    });

    it('should cancel an order', async () => {
      const response = await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: orderId,
        status: 'cancelled',
      });
    });

    it('should return 404 when cancelling non-existent order', async () => {
      await request(app.getHttpServer())
        .post('/orders/non-existent-id/cancel')
        .expect(404);
    });

    it('should not allow cancelling already cancelled order', async () => {
      // Cancel the order
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .expect(200);

      // Try to cancel again
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .expect(400);
    });
  });

  describe('Order Status Transitions', () => {
    it('should track order status changes', async () => {
      // Create order
      const createResponse = await request(app.getHttpServer())
        .post('/orders')
        .send({
          items: [
            {
              productId: 'prod-status',
              productName: 'Status Test Product',
              quantity: 1,
              price: 49.99,
            },
          ],
          shippingAddress: {
            street: '111 Status St',
            city: 'Portland',
            state: 'OR',
            zipCode: '97201',
            country: 'USA',
          },
        })
        .expect(201);

      const orderId = createResponse.body.id;
      expect(createResponse.body.status).toBe('pending');

      // Verify order is retrievable
      const getResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .expect(200);

      expect(getResponse.body.status).toBe('pending');

      // Cancel order
      const cancelResponse = await request(app.getHttpServer())
        .post(`/orders/${orderId}/cancel`)
        .expect(200);

      expect(cancelResponse.body.status).toBe('cancelled');

      // Verify cancellation persisted
      const finalResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .expect(200);

      expect(finalResponse.body.status).toBe('cancelled');
    });
  });

  describe('Order Total Calculation', () => {
    it('should calculate total correctly for single item', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .send({
          items: [
            {
              productId: 'prod-calc-1',
              productName: 'Single Item',
              quantity: 3,
              price: 10.0,
            },
          ],
          shippingAddress: {
            street: '222 Calc St',
            city: 'Denver',
            state: 'CO',
            zipCode: '80201',
            country: 'USA',
          },
        })
        .expect(201);

      expect(response.body.totalAmount).toBe(30.0);
    });

    it('should calculate total correctly for multiple items', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .send({
          items: [
            {
              productId: 'prod-calc-2a',
              productName: 'Item A',
              quantity: 2,
              price: 15.5,
            },
            {
              productId: 'prod-calc-2b',
              productName: 'Item B',
              quantity: 1,
              price: 25.0,
            },
            {
              productId: 'prod-calc-2c',
              productName: 'Item C',
              quantity: 3,
              price: 5.0,
            },
          ],
          shippingAddress: {
            street: '333 Calc St',
            city: 'Phoenix',
            state: 'AZ',
            zipCode: '85001',
            country: 'USA',
          },
        })
        .expect(201);

      // 2 * 15.5 + 1 * 25.0 + 3 * 5.0 = 31.0 + 25.0 + 15.0 = 71.0
      expect(response.body.totalAmount).toBe(71.0);
    });
  });
});
