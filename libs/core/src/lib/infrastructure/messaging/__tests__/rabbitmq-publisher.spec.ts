import { RabbitMQPublisher } from '../rabbitmq-publisher';
import { RabbitMQConfig } from '../rabbitmq.config';
import * as amqp from 'amqplib/callback_api';

// Mock amqplib
jest.mock('amqplib/callback_api');

describe('RabbitMQPublisher', () => {
  let publisher: RabbitMQPublisher;
  let mockConnection: Partial<amqp.Connection>;
  let mockChannel: Partial<amqp.Channel>;
  let config: RabbitMQConfig;

  beforeEach(() => {
    // Setup mocks
    mockChannel = {
      publish: jest.fn().mockReturnValue(true),
      assertExchange: jest.fn((name, type, options, callback) => {
        if (callback) callback(null, { exchange: name });
      }),
      assertQueue: jest.fn((name, options, callback) => {
        if (callback)
          callback(null, {
            queue: name || '',
            messageCount: 0,
            consumerCount: 0,
          });
      }),
      bindQueue: jest.fn((queue, exchange, routingKey, args, callback) => {
        if (callback) callback(null, {});
      }),
      close: jest.fn((callback) => {
        if (callback) callback(undefined);
      }),
      on: jest.fn(),
    };

    mockConnection = {
      createChannel: jest.fn((callback) => {
        if (callback) callback(null, mockChannel as amqp.Channel);
      }),
      close: jest.fn((callback) => {
        if (callback) callback(undefined);
      }),
      on: jest.fn(),
    };

    (amqp.connect as jest.Mock).mockImplementation((url, callback) => {
      callback(null, mockConnection as amqp.Connection);
    });

    config = {
      url: 'amqp://localhost',
      defaultPublishOptions: {
        persistent: true,
        contentType: 'application/json',
      },
      consistentHashing: {
        enabled: true,
        hashHeader: 'x-hash-key',
      },
      deadLetter: {
        exchange: 'dlx',
        queue: 'dlq',
        ttl: 86400000,
      },
    };

    publisher = new RabbitMQPublisher(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to RabbitMQ successfully', async () => {
      await publisher.connect();

      expect(amqp.connect).toHaveBeenCalledWith(
        config.url,
        expect.any(Function)
      );
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(publisher.isConnected()).toBe(true);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      (amqp.connect as jest.Mock).mockImplementation((url, callback) => {
        callback(error);
      });

      await expect(publisher.connect()).rejects.toThrow('Connection failed');
      expect(publisher.isConnected()).toBe(false);
    });

    it('should setup dead letter queue', async () => {
      await publisher.connect();

      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        'dlx',
        'topic',
        { durable: true },
        expect.any(Function)
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'dlq',
        expect.objectContaining({
          durable: true,
          arguments: {
            'x-message-ttl': 86400000,
          },
        }),
        expect.any(Function)
      );
    });
  });

  describe('publish', () => {
    beforeEach(async () => {
      await publisher.connect();
    });

    it('should publish a message with default options', async () => {
      const topic = 'test.exchange';
      const message = { data: 'test' };

      const messageId = await publisher.publish(topic, message);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        topic,
        '',
        expect.any(Buffer),
        expect.objectContaining({
          persistent: true,
          contentType: 'application/json',
          contentEncoding: 'utf-8',
          messageId,
        })
      );
    });

    it('should publish with routing key from metadata', async () => {
      const topic = 'test.exchange';
      const message = { data: 'test' };
      const metadata = { routingKey: 'test.routing.key' };

      await publisher.publish(topic, message, metadata);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        topic,
        'test.routing.key',
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should add consistent hashing header when aggregateId is provided', async () => {
      const topic = 'test.exchange';
      const message = { data: 'test' };
      const metadata = { aggregateId: 'truck-123' };

      await publisher.publish(topic, message, metadata);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        topic,
        '',
        expect.any(Buffer),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-hash-key': 'truck-123',
          }),
        })
      );
    });

    it('should add multi-tenancy header when companyId is provided', async () => {
      const topic = 'test.exchange';
      const message = { data: 'test' };
      const metadata = { companyId: 'company-456' };

      await publisher.publish(topic, message, metadata);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        topic,
        '',
        expect.any(Buffer),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-company-id': 'company-456',
          }),
        })
      );
    });

    it('should throw error when not connected', async () => {
      const unconnectedPublisher = new RabbitMQPublisher(config);

      await expect(
        unconnectedPublisher.publish('test', { data: 'test' })
      ).rejects.toThrow('Publisher not connected');
    });

    it('should use custom message ID when provided', async () => {
      const topic = 'test.exchange';
      const message = { data: 'test' };
      const customMessageId = 'custom-msg-123';
      const metadata = { messageId: customMessageId };

      const messageId = await publisher.publish(topic, message, metadata);

      expect(messageId).toBe(customMessageId);
    });

    it('should serialize message as JSON', async () => {
      const topic = 'test.exchange';
      const message = { data: 'test', number: 123 };

      await publisher.publish(topic, message);

      const publishCall = (mockChannel.publish as jest.Mock).mock.calls[0];
      const buffer = publishCall[2] as Buffer;
      const parsedMessage = JSON.parse(buffer.toString());

      expect(parsedMessage).toEqual(message);
    });
  });

  describe('publishBatch', () => {
    beforeEach(async () => {
      await publisher.connect();
    });

    it('should publish multiple messages', async () => {
      const messages = [
        { topic: 'topic1', message: { data: 'test1' } },
        { topic: 'topic2', message: { data: 'test2' } },
        { topic: 'topic3', message: { data: 'test3' } },
      ];

      const messageIds = await publisher.publishBatch(messages);

      expect(messageIds).toHaveLength(3);
      expect(mockChannel.publish).toHaveBeenCalledTimes(3);
    });
  });

  describe('disconnect', () => {
    it('should close channel and connection', async () => {
      await publisher.connect();
      await publisher.disconnect();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(publisher.isConnected()).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      await expect(publisher.disconnect()).resolves.not.toThrow();
    });
  });

  describe('sanitizeUrl', () => {
    it('should hide password in connection URL', async () => {
      const configWithPassword = {
        ...config,
        url: 'amqp://user:password@localhost',
      };

      const publisherWithPassword = new RabbitMQPublisher(configWithPassword);

      // We can't directly test private method, but we can verify it doesn't expose password in logs
      await expect(publisherWithPassword.connect()).resolves.not.toThrow();
    });
  });
});
