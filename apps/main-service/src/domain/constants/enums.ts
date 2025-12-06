export enum LoadStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  BOOKED = 'BOOKED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TripStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  BOOKED = 'BOOKED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum BidStatus {
  PENDING = 'PENDING',
  COUNTERED = 'COUNTERED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
}

export enum PostType {
  LOAD = 'LOAD',
  TRIP = 'TRIP',
}

export enum TransportType {
  TRUCK = 'TRUCK',
  VAN = 'VAN',
  CONTAINER = 'CONTAINER',
  FLATBED = 'FLATBED',
  REFRIGERATED = 'REFRIGERATED',
  TANKER = 'TANKER',
}

export enum LoadingType {
  TOP = 'TOP',
  SIDE = 'SIDE',
  REAR = 'REAR',
}

export enum Feature {
  GPS = 'GPS',
  TEMP_CONTROL = 'TEMP_CONTROL',
  ADR = 'ADR',
  LIFT = 'LIFT',
  TRACKING = 'TRACKING',
}

export enum AggregateType {
  LOAD = 'LOAD',
  TRIP = 'TRIP',
  BID = 'BID',
  BOOKING = 'BOOKING',
  TRANSPORT = 'TRANSPORT',
  BOARD = 'BOARD',
}
