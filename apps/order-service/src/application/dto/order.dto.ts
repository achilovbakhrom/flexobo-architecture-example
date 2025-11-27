export interface OrderItemDto {
  productId: string;
  productName: string;
  quantity: number;
  priceAmount: number;
  priceCurrency: string;
}

export interface OrderDto {
  id: string;
  userId: string;
  items: OrderItemDto[];
  status: string;
  totalAmount: number;
  currency: string;
  trackingNumber?: string;
  version: number;
}

export interface StoredEventDto {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, unknown>;
  version: number;
  occurredAt: Date;
  metadata?: Record<string, unknown> | null;
}

export interface OrderReadModelDto {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  trackingNumber?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemReadModelDto {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  priceAmount: number;
  priceCurrency: string;
}

export interface OrderWithItemsReadModelDto extends OrderReadModelDto {
  items: OrderItemReadModelDto[];
}
