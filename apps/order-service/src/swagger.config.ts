/**
 * Swagger Configuration Helper
 * Manually defines schemas for proper Swagger documentation
 */

import { DocumentBuilder } from '@nestjs/swagger';

export function createSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Order Service API')
    .setDescription(
      'Order management with event sourcing and CQRS pattern.\n\n' +
      '## Features\n' +
      '- Create and manage orders\n' +
      '- Add items to orders\n' +
      '- Order lifecycle management (confirm, ship, cancel)\n' +
      '- Event-driven architecture\n\n' +
      '## Architecture\n' +
      'This service implements CQRS (Command Query Responsibility Segregation) and Event Sourcing patterns.'
    )
    .setVersion('1.0')
    .addServer('http://localhost:3000', 'Order Service')
    .addTag('Orders', 'Order management endpoints')
    .build();
}

export const swaggerSchemas = {
  CreateOrderDto: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        description: 'User ID who is creating the order',
        example: 'user-123'
      }
    }
  },
  CreateOrderResponseDto: {
    type: 'object',
    properties: {
      orderId: {
        type: 'string',
        description: 'Created order ID',
        example: 'order-1234567890-abc123'
      }
    }
  },
  AddOrderItemDto: {
    type: 'object',
    required: ['productId', 'productName', 'quantity', 'price', 'currency'],
    properties: {
      productId: {
        type: 'string',
        description: 'Product ID',
        example: 'product-456'
      },
      productName: {
        type: 'string',
        description: 'Product name',
        example: 'Laptop'
      },
      quantity: {
        type: 'number',
        description: 'Quantity of the product',
        example: 2,
        minimum: 1
      },
      price: {
        type: 'number',
        description: 'Price per unit',
        example: 999.99,
        minimum: 0
      },
      currency: {
        type: 'string',
        description: 'Currency code',
        example: 'USD'
      }
    }
  },
  SuccessResponseDto: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        description: 'Operation success status',
        example: true
      }
    }
  },
  CancelOrderDto: {
    type: 'object',
    required: ['reason'],
    properties: {
      reason: {
        type: 'string',
        description: 'Reason for cancellation',
        example: 'Customer requested cancellation'
      }
    }
  },
  ShipOrderDto: {
    type: 'object',
    required: ['trackingNumber'],
    properties: {
      trackingNumber: {
        type: 'string',
        description: 'Shipping tracking number',
        example: 'TRACK123456789'
      }
    }
  }
};
