export const COMPANY_EVENT_TYPES = {
  CREATED: 'company.created',
  UPDATED: 'company.updated',
  VERIFIED: 'company.verified',
  REJECTED: 'company.rejected',
  SUSPENDED: 'company.suspended',
  REACTIVATED: 'company.reactivated',
  MEMBER_ADDED: 'company.member_added',
  MEMBER_UPDATED: 'company.member_updated',
  MEMBER_REMOVED: 'company.member_removed',
  DELETED: 'company.deleted',
} as const;

export type CompanyType = 'LOGISTICS' | 'CARRIER' | 'FORWARDER' | 'SHIPPER';
export type CompanyStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
export type CompanyMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface CompanyMemberData {
  id: string;
  userId: string;
  role: CompanyMemberRole;
  isActive: boolean;
  joinedAt: string;
}

export interface CompanyCreatedEventData extends Record<string, unknown> {
  ownerId: string;
  name: string;
  type: CompanyType;
  description?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  country?: string;
  city?: string;
  taxId?: string;
  website?: string;
}

export interface CompanyUpdatedEventData extends Record<string, unknown> {
  name?: string;
  description?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  country?: string;
  city?: string;
  taxId?: string;
  website?: string;
}

export interface CompanyVerifiedEventData extends Record<string, unknown> {
  verifiedAt: string;
  verifiedBy: string;
  notes?: string;
}

export interface CompanyRejectedEventData extends Record<string, unknown> {
  rejectedAt: string;
  rejectedBy: string;
  reason: string;
}

export interface CompanySuspendedEventData extends Record<string, unknown> {
  suspendedAt: string;
  suspendedBy: string;
  reason: string;
}

export interface CompanyReactivatedEventData extends Record<string, unknown> {
  reactivatedAt: string;
  reactivatedBy: string;
}

export interface CompanyMemberAddedEventData extends Record<string, unknown> {
  memberId: string;
  userId: string;
  role: CompanyMemberRole;
  addedBy: string;
}

export interface CompanyMemberUpdatedEventData extends Record<string, unknown> {
  memberId: string;
  userId: string;
  role: CompanyMemberRole;
  updatedBy: string;
}

export interface CompanyMemberRemovedEventData extends Record<string, unknown> {
  memberId: string;
  userId: string;
  removedBy: string;
}

export interface CompanyDeletedEventData extends Record<string, unknown> {
  deletedAt: string;
  deletedBy: string;
}
