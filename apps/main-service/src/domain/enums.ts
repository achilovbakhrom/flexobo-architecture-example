/**
 * Domain Enums for Main Service
 * These match the Prisma schema enums
 */

export enum LoadStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum TruckLoadType {
  FTL = 'FTL', // Full Truck Load
  LTL = 'LTL', // Less Than Truck Load
}

export enum PriceMode {
  FIXED = 'FIXED',
  NEGOTIABLE = 'NEGOTIABLE',
  PER_KM = 'PER_KM',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  NDS = 'NDS',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum WeightUnit {
  KG = 'KG',
  TON = 'TON',
  LB = 'LB',
}

export enum CapacityUnit {
  M3 = 'M3',
  TON = 'TON',
  PALLET = 'PALLET',
}

export enum TransportTypeFeature {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  REFRIGERATED = 'REFRIGERATED',
}

export enum TransportLoadingFeature {
  SIDE_LOADING = 'SIDE_LOADING',
  TOP_LOADING = 'TOP_LOADING',
  REAR_LOADING = 'REAR_LOADING',
}

export enum LoadDocumentType {
  TTN = 'TTN',
  INVOICE = 'INVOICE',
  CMR = 'CMR',
}

export enum TripDocumentType {
  PASSPORT = 'PASSPORT',
  INVOICE = 'INVOICE',
  CMR = 'CMR',
  OTHER = 'OTHER',
}
