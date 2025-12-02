/**
 * Integration Tests for Admin Panel Service
 *
 * Tests user management, audit logging, and system metrics endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AdminPanelModule } from '../admin-panel.module';
import { UserRole, JwtService } from '@flexobo/shared-kernel';

describe('Admin Panel Integration Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AdminPanelModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    );

    await app.init();

    // Get JWT service and create admin token
    jwtService = moduleFixture.get<JwtService>(JwtService);
    adminToken = jwtService.generateAccessToken({
      sub: 'admin-123',
      username: 'admin',
      roles: [UserRole.ADMIN],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User Management', () => {
    describe('POST /api/v1/admin/users', () => {
      it('should create a new user with admin token', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'newuser@test.com',
            username: 'newuser',
            password: 'SecurePass123!',
            roles: ['USER'],
          })
          .expect(201);

        expect(response.body).toMatchObject({
          id: expect.any(String),
          email: 'newuser@test.com',
          username: 'newuser',
          roles: ['USER'],
          isActive: true,
        });
      });

      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/admin/users')
          .send({
            email: 'test@test.com',
            username: 'test',
            password: 'password',
          })
          .expect(401);
      });

      it('should validate email format', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'invalid-email',
            username: 'testuser',
            password: 'password',
          })
          .expect(400);
      });

      it('should reject duplicate email', async () => {
        const email = 'duplicate@test.com';

        // Create first user
        await request(app.getHttpServer())
          .post('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email,
            username: 'user1',
            password: 'password',
          })
          .expect(201);

        // Try to create second user with same email
        await request(app.getHttpServer())
          .post('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email,
            username: 'user2',
            password: 'password',
          })
          .expect(409);
      });

      it('should reject duplicate username', async () => {
        const username = 'duplicateuser';

        // Create first user
        await request(app.getHttpServer())
          .post('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'user1@test.com',
            username,
            password: 'password',
          })
          .expect(201);

        // Try to create second user with same username
        await request(app.getHttpServer())
          .post('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'user2@test.com',
            username,
            password: 'password',
          })
          .expect(409);
      });
    });

    describe('GET /api/v1/admin/users', () => {
      beforeAll(async () => {
        // Create test users
        for (let i = 0; i < 5; i++) {
          await request(app.getHttpServer())
            .post('/api/v1/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              email: `listuser${i}@test.com`,
              username: `listuser${i}`,
              password: 'password',
            });
        }
      });

      it('should list users with pagination', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
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
      });

      it('should search users by email', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ search: 'listuser1' })
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
        expect(
          response.body.data.some((u: { email: string }) =>
            u.email.includes('listuser1')
          )
        ).toBe(true);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/admin/users')
          .expect(401);
      });
    });

    describe('GET /api/v1/admin/users/:id', () => {
      let userId: string;

      beforeAll(async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'getuser@test.com',
            username: 'getuser',
            password: 'password',
          });

        userId = response.body.id;
      });

      it('should get user by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/admin/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          id: userId,
          email: 'getuser@test.com',
          username: 'getuser',
        });
      });

      it('should return 404 for non-existent user', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/admin/users/non-existent-id')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });
    });

    describe('PUT /api/v1/admin/users/:id', () => {
      let userId: string;

      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'updateuser@test.com',
            username: 'updateuser',
            password: 'password',
          });

        userId = response.body.id;
      });

      it('should update user email', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/v1/admin/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'newemail@test.com',
          })
          .expect(200);

        expect(response.body.email).toBe('newemail@test.com');
      });

      it('should deactivate user', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/v1/admin/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            isActive: false,
          })
          .expect(200);

        expect(response.body.isActive).toBe(false);
      });
    });

    describe('PUT /api/v1/admin/users/:id/roles', () => {
      let userId: string;

      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'roleuser@test.com',
            username: 'roleuser',
            password: 'password',
          });

        userId = response.body.id;
      });

      it('should update user roles', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/v1/admin/users/${userId}/roles`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            roles: ['USER', 'MANAGER'],
          })
          .expect(200);

        expect(response.body.roles).toEqual(['USER', 'MANAGER']);
      });
    });

    describe('DELETE /api/v1/admin/users/:id', () => {
      let userId: string;

      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'deleteuser@test.com',
            username: 'deleteuser',
            password: 'password',
          });

        userId = response.body.id;
      });

      it('should delete user', async () => {
        await request(app.getHttpServer())
          .delete(`/api/v1/admin/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(204);

        // Verify user is deleted
        await request(app.getHttpServer())
          .get(`/api/v1/admin/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });
    });
  });

  describe('Audit Logs', () => {
    describe('GET /api/v1/admin/audit-logs', () => {
      it('should list audit logs', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/admin/audit-logs')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ page: 1, limit: 20 })
          .expect(200);

        expect(response.body).toMatchObject({
          data: expect.any(Array),
          total: expect.any(Number),
          page: 1,
          limit: 20,
        });
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/admin/audit-logs')
          .expect(401);
      });
    });
  });

  describe('System Metrics', () => {
    describe('GET /api/v1/admin/metrics', () => {
      it('should get system metrics', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/admin/metrics')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          services: expect.any(Array),
          events: expect.objectContaining({
            totalEvents: expect.any(Number),
            eventsLast24h: expect.any(Number),
          }),
          cache: expect.objectContaining({
            totalKeys: expect.any(Number),
            hitRate: expect.any(Number),
          }),
        });
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/admin/metrics')
          .expect(401);
      });
    });

    describe('GET /api/v1/admin/metrics/services', () => {
      it('should get service health', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/admin/metrics/services')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          expect(response.body[0]).toMatchObject({
            name: expect.any(String),
            status: expect.any(String),
            uptime: expect.any(Number),
            responseTime: expect.any(Number),
          });
        }
      });
    });

    describe('GET /api/v1/admin/metrics/events', () => {
      it('should get event statistics', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/admin/metrics/events')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          totalEvents: expect.any(Number),
          eventsLast24h: expect.any(Number),
          eventsLast7d: expect.any(Number),
          averageProcessingTime: expect.any(Number),
        });
      });
    });
  });

  describe('Cache Management', () => {
    describe('GET /api/v1/admin/cache', () => {
      it('should list cache entries', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/admin/cache')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/admin/cache')
          .expect(401);
      });
    });

    describe('DELETE /api/v1/admin/cache/:key', () => {
      it('should invalidate cache entry', async () => {
        await request(app.getHttpServer())
          .delete('/api/v1/admin/cache/test-key')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(204);
      });
    });

    describe('DELETE /api/v1/admin/cache', () => {
      it('should clear all cache', async () => {
        await request(app.getHttpServer())
          .delete('/api/v1/admin/cache')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(204);
      });
    });
  });
});
