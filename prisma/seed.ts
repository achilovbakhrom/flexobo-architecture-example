/**
 * Database Seed Script
 * Seeds the database with sample data for development
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.outboxMessage.deleteMany();
  await prisma.event.deleteMany();
  await prisma.snapshot.deleteMany();
  await prisma.saga.deleteMany();
  await prisma.twoPhaseCommit.deleteMany();

  // Seed Events (Event Store)
  console.log('📝 Seeding events...');

  const events = [
    {
      aggregateId: 'order-001',
      aggregateType: 'Order',
      eventType: 'OrderCreated',
      eventData: {
        orderId: 'order-001',
        customerId: 'customer-001',
        items: [
          { productId: 'prod-1', quantity: 2, price: 29.99 },
          { productId: 'prod-2', quantity: 1, price: 49.99 },
        ],
        totalAmount: 109.97,
        status: 'PENDING',
      },
      version: 1,
      occurredAt: new Date('2024-01-15T10:00:00Z'),
      metadata: { userId: 'user-admin', correlationId: 'corr-001' },
    },
    {
      aggregateId: 'order-001',
      aggregateType: 'Order',
      eventType: 'OrderConfirmed',
      eventData: {
        orderId: 'order-001',
        confirmedAt: '2024-01-15T10:05:00Z',
      },
      version: 2,
      occurredAt: new Date('2024-01-15T10:05:00Z'),
      metadata: { userId: 'system', correlationId: 'corr-001' },
    },
    {
      aggregateId: 'order-002',
      aggregateType: 'Order',
      eventType: 'OrderCreated',
      eventData: {
        orderId: 'order-002',
        customerId: 'customer-002',
        items: [{ productId: 'prod-3', quantity: 3, price: 19.99 }],
        totalAmount: 59.97,
        status: 'PENDING',
      },
      version: 1,
      occurredAt: new Date('2024-01-15T11:00:00Z'),
      metadata: { userId: 'user-manager', correlationId: 'corr-002' },
    },
    {
      aggregateId: 'order-003',
      aggregateType: 'Order',
      eventType: 'OrderCreated',
      eventData: {
        orderId: 'order-003',
        customerId: 'customer-001',
        items: [{ productId: 'prod-4', quantity: 1, price: 99.99 }],
        totalAmount: 99.99,
        status: 'PENDING',
      },
      version: 1,
      occurredAt: new Date('2024-01-15T12:00:00Z'),
      metadata: { userId: 'user-001', correlationId: 'corr-003' },
    },
    {
      aggregateId: 'order-003',
      aggregateType: 'Order',
      eventType: 'OrderCancelled',
      eventData: {
        orderId: 'order-003',
        reason: 'Customer requested cancellation',
        cancelledAt: '2024-01-15T12:30:00Z',
      },
      version: 2,
      occurredAt: new Date('2024-01-15T12:30:00Z'),
      metadata: { userId: 'user-001', correlationId: 'corr-003' },
    },
  ];

  for (const event of events) {
    await prisma.event.create({ data: event });
  }

  console.log(`✅ Created ${events.length} events`);

  // Seed Snapshots
  console.log('📸 Seeding snapshots...');

  const snapshots = [
    {
      aggregateId: 'order-001',
      aggregateType: 'Order',
      version: 2,
      snapshotData: {
        orderId: 'order-001',
        customerId: 'customer-001',
        items: [
          { productId: 'prod-1', quantity: 2, price: 29.99 },
          { productId: 'prod-2', quantity: 1, price: 49.99 },
        ],
        totalAmount: 109.97,
        status: 'CONFIRMED',
        createdAt: '2024-01-15T10:00:00Z',
        confirmedAt: '2024-01-15T10:05:00Z',
      },
      createdAt: new Date('2024-01-15T10:05:00Z'),
    },
  ];

  for (const snapshot of snapshots) {
    await prisma.snapshot.create({ data: snapshot });
  }

  console.log(`✅ Created ${snapshots.length} snapshots`);

  // Seed Outbox Messages
  console.log('📮 Seeding outbox messages...');

  const outboxMessages = [
    {
      aggregateId: 'order-001',
      aggregateType: 'Order',
      eventType: 'OrderConfirmed',
      payload: {
        orderId: 'order-001',
        customerId: 'customer-001',
        totalAmount: 109.97,
      },
      status: 'PUBLISHED',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date('2024-01-15T10:05:00Z'),
      publishedAt: new Date('2024-01-15T10:05:01Z'),
    },
    {
      aggregateId: 'order-002',
      aggregateType: 'Order',
      eventType: 'OrderCreated',
      payload: {
        orderId: 'order-002',
        customerId: 'customer-002',
        totalAmount: 59.97,
      },
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date('2024-01-15T11:00:00Z'),
    },
  ];

  for (const message of outboxMessages) {
    await prisma.outboxMessage.create({ data: message });
  }

  console.log(`✅ Created ${outboxMessages.length} outbox messages`);

  // Seed Sagas
  console.log('🔄 Seeding sagas...');

  const sagas = [
    {
      sagaType: 'OrderFulfillmentSaga',
      status: 'COMPLETED',
      context: {
        orderId: 'order-001',
        currentStep: 'PAYMENT_COMPLETED',
      },
      steps: [
        {
          step: 'PAYMENT_COMPLETED',
          status: 'COMPLETED',
          completedAt: '2024-01-15T10:06:00Z',
        },
        {
          step: 'INVENTORY_RESERVED',
          status: 'COMPLETED',
          completedAt: '2024-01-15T10:08:00Z',
        },
        {
          step: 'SHIPPED',
          status: 'COMPLETED',
          completedAt: '2024-01-15T10:10:00Z',
        },
      ],
      startedAt: new Date('2024-01-15T10:05:00Z'),
      completedAt: new Date('2024-01-15T10:10:00Z'),
    },
    {
      sagaType: 'OrderFulfillmentSaga',
      status: 'RUNNING',
      context: {
        orderId: 'order-002',
        currentStep: 'PAYMENT_PENDING',
      },
      steps: [
        {
          step: 'PAYMENT_PENDING',
          status: 'RUNNING',
          startedAt: '2024-01-15T11:00:00Z',
        },
      ],
      startedAt: new Date('2024-01-15T11:00:00Z'),
    },
  ];

  for (const saga of sagas) {
    await prisma.saga.create({ data: saga });
  }

  console.log(`✅ Created ${sagas.length} sagas`);

  console.log('');
  console.log('✨ Seed completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - Events: ${events.length}`);
  console.log(`   - Snapshots: ${snapshots.length}`);
  console.log(`   - Outbox Messages: ${outboxMessages.length}`);
  console.log(`   - Sagas: ${sagas.length}`);
  console.log('');
  console.log('🎉 Your database is ready for development!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
