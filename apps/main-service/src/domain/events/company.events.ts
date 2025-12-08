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
  DOCUMENT_ADDED: 'company.document_added',
  DOCUMENT_REMOVED: 'company.document_removed',
  RATING_UPDATED: 'company.rating_updated',
} as const;

export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type CompanyVerifyStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type CompanyMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type CompanyDocumentType =
  | 'CERTIFICATE'
  | 'BUSINESS_ACTIVITY_LICENSE'
  | 'DIRECTOR_PASSPORT'
  | 'OTHER';

export interface CompanyMemberData {
  id: string;
  userId: string;
  role: CompanyMemberRole;
  isActive: boolean;
  joinedAt: string;
}

export interface CompanyDocumentData {
  id: string;
  type: CompanyDocumentType;
  url: string;
  addedAt: string;
}

export interface CompanyStatusHistoryItem {
  status: CompanyStatus;
  reason?: string;
  changedAt: string;
  changedBy?: string;
}

export interface CompanyCreatedEventData extends Record<string, unknown> {
  ownerId: string;
  companyName: string;
  companyTypeId: string; // Reference to CompanyType entity
  companyDescription?: string;
  avatar?: string;
  phoneNumber?: string;
  email?: string;
  countryId?: string; // Reference to Country entity
  city?: string;
  dotMc?: string; // DOT/MC number for carriers
  isLegalEntity?: boolean;
  documents?: CompanyDocumentData[];
}

export interface CompanyUpdatedEventData extends Record<string, unknown> {
  companyName?: string;
  companyTypeId?: string;
  companyDescription?: string;
  avatar?: string;
  phoneNumber?: string;
  email?: string;
  countryId?: string;
  city?: string;
  dotMc?: string;
  isLegalEntity?: boolean;
  status?: CompanyStatus;
  statusReason?: string;
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

export interface CompanyDocumentAddedEventData extends Record<string, unknown> {
  documentId: string;
  type: CompanyDocumentType;
  url: string;
  addedBy: string;
}

export interface CompanyDocumentRemovedEventData extends Record<string, unknown> {
  documentId: string;
  removedBy: string;
}

export interface CompanyRatingUpdatedEventData extends Record<string, unknown> {
  rating: number;
  countRatings: number;
}
