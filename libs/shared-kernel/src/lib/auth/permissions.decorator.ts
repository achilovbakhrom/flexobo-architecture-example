import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for an endpoint
 * @param permissions - Array of permission strings required
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Common permission constants
 */
export const Permissions = {
  // Load permissions
  LOADS_CREATE: 'loads:create',
  LOADS_READ: 'loads:read',
  LOADS_UPDATE: 'loads:update',
  LOADS_DELETE: 'loads:delete',

  // Trip permissions
  TRIPS_CREATE: 'trips:create',
  TRIPS_READ: 'trips:read',
  TRIPS_UPDATE: 'trips:update',
  TRIPS_DELETE: 'trips:delete',

  // Bid permissions
  BIDS_CREATE: 'bids:create',
  BIDS_READ: 'bids:read',
  BIDS_UPDATE: 'bids:update',
  BIDS_DELETE: 'bids:delete',
  BIDS_ACCEPT: 'bids:accept',
  BIDS_REJECT: 'bids:reject',

  // Booking permissions
  BOOKINGS_CREATE: 'bookings:create',
  BOOKINGS_READ: 'bookings:read',
  BOOKINGS_UPDATE: 'bookings:update',
  BOOKINGS_CANCEL: 'bookings:cancel',

  // Company permissions
  COMPANY_READ: 'company:read',
  COMPANY_UPDATE: 'company:update',
  COMPANY_DELETE: 'company:delete',
  COMPANY_MEMBERS_MANAGE: 'company:members:manage',
  COMPANY_INVITATIONS_MANAGE: 'company:invitations:manage',

  // Billing permissions
  BILLING_READ: 'billing:read',
  BILLING_MANAGE: 'billing:manage',

  // Admin permissions
  ADMIN_USERS_READ: 'admin:users:read',
  ADMIN_USERS_MANAGE: 'admin:users:manage',
  ADMIN_SYSTEM_MANAGE: 'admin:system:manage',
} as const;

export type PermissionString = (typeof Permissions)[keyof typeof Permissions];
