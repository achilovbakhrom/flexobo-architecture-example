import { AggregateRoot, DomainEvent } from '@flexobo/core';
import { v4 as uuidv4 } from 'uuid';
import {
  COMPANY_EVENT_TYPES,
  CompanyStatus,
  CompanyVerifyStatus,
  CompanyMemberRole,
  CompanyMemberData,
  CompanyDocumentData,
  CompanyStatusHistoryItem,
  CompanyDocumentType,
  CompanyCreatedEventData,
  CompanyUpdatedEventData,
  CompanyVerifiedEventData,
  CompanyRejectedEventData,
  CompanySuspendedEventData,
  CompanyReactivatedEventData,
  CompanyMemberAddedEventData,
  CompanyMemberUpdatedEventData,
  CompanyMemberRemovedEventData,
  CompanyDeletedEventData,
  CompanyDocumentAddedEventData,
  CompanyDocumentRemovedEventData,
  CompanyRatingUpdatedEventData,
} from '../events/company.events';

// Helper to generate company unique ID from name
function generateCompanyUniqueId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const random = Math.random().toString(36).substring(2, 8);
  return `${slug}-${random}`;
}

export interface CompanyState {
  ownerId: string;
  companyUniqueId: string;
  companyName: string;
  companyTypeId: string;
  companyDescription?: string;
  avatar?: string;
  phoneNumber?: string;
  email?: string;
  countryId?: string;
  city?: string;
  dotMc?: string;
  status: CompanyStatus;
  statusHistory: CompanyStatusHistoryItem[];
  verifyStatus: CompanyVerifyStatus;
  isLegalEntity: boolean;
  rating: number;
  countRatings: number;
  documents: CompanyDocumentData[];
  members: CompanyMemberData[];
  isDeleted: boolean;
  createdAt: string;
}

export class Company extends AggregateRoot {
  private ownerId!: string;
  private companyUniqueId!: string;
  private companyName!: string;
  private companyTypeId!: string;
  private companyDescription?: string;
  private avatar?: string;
  private phoneNumber?: string;
  private email?: string;
  private countryId?: string;
  private city?: string;
  private dotMc?: string;
  private status: CompanyStatus = 'ACTIVE';
  private statusHistory: CompanyStatusHistoryItem[] = [];
  private verifyStatus: CompanyVerifyStatus = 'PENDING';
  private isLegalEntity = true;
  private rating = 0;
  private countRatings = 0;
  private documents: CompanyDocumentData[] = [];
  private members: CompanyMemberData[] = [];
  private isDeleted = false;
  private createdAt!: string;

  static create(companyId: string, data: CompanyCreatedEventData): Company {
    const company = new Company(companyId);
    const event = company.createEvent(COMPANY_EVENT_TYPES.CREATED, data);
    company.addEvent(event);
    company.apply(event);
    return company;
  }

  static fromEvents(events: DomainEvent[]): Company {
    if (events.length === 0) {
      throw new Error('Cannot create Company from empty events');
    }
    const company = new Company(events[0].aggregateId);
    company.loadFromHistory(events);
    return company;
  }

  update(data: CompanyUpdatedEventData, userId: string): void {
    if (this.isDeleted) throw new Error('Cannot update deleted company');
    if (!this.canUserManage(userId)) {
      throw new Error('Only owner or admin can update company');
    }

    // If company is verified and key fields change, reset to pending
    const shouldResetVerification =
      this.verifyStatus === 'VERIFIED' &&
      (data.companyName !== undefined ||
        data.companyTypeId !== undefined ||
        data.dotMc !== undefined);

    const event = this.createEvent(COMPANY_EVENT_TYPES.UPDATED, {
      ...data,
      resetVerification: shouldResetVerification,
    });
    this.addEvent(event);
    this.apply(event);
  }

  verify(verifiedBy: string, notes?: string): void {
    if (this.isDeleted) throw new Error('Cannot verify deleted company');
    if (this.verifyStatus === 'VERIFIED')
      throw new Error('Company is already verified');
    const event = this.createEvent<
      typeof COMPANY_EVENT_TYPES.VERIFIED,
      CompanyVerifiedEventData
    >(COMPANY_EVENT_TYPES.VERIFIED, {
      verifiedAt: new Date().toISOString(),
      verifiedBy,
      notes,
    });
    this.addEvent(event);
    this.apply(event);
  }

  reject(rejectedBy: string, reason: string): void {
    if (this.isDeleted) throw new Error('Cannot reject deleted company');
    if (this.verifyStatus === 'REJECTED')
      throw new Error('Company is already rejected');
    const event = this.createEvent<
      typeof COMPANY_EVENT_TYPES.REJECTED,
      CompanyRejectedEventData
    >(COMPANY_EVENT_TYPES.REJECTED, {
      rejectedAt: new Date().toISOString(),
      rejectedBy,
      reason,
    });
    this.addEvent(event);
    this.apply(event);
  }

  suspend(suspendedBy: string, reason: string): void {
    if (this.isDeleted) throw new Error('Cannot suspend deleted company');
    if (this.status === 'BLOCKED')
      throw new Error('Company is already blocked');
    const event = this.createEvent<
      typeof COMPANY_EVENT_TYPES.SUSPENDED,
      CompanySuspendedEventData
    >(COMPANY_EVENT_TYPES.SUSPENDED, {
      suspendedAt: new Date().toISOString(),
      suspendedBy,
      reason,
    });
    this.addEvent(event);
    this.apply(event);
  }

  reactivate(reactivatedBy: string): void {
    if (this.isDeleted) throw new Error('Cannot reactivate deleted company');
    if (this.status === 'ACTIVE')
      throw new Error('Company is already active');
    const event = this.createEvent<
      typeof COMPANY_EVENT_TYPES.REACTIVATED,
      CompanyReactivatedEventData
    >(COMPANY_EVENT_TYPES.REACTIVATED, {
      reactivatedAt: new Date().toISOString(),
      reactivatedBy,
    });
    this.addEvent(event);
    this.apply(event);
  }

  addDocument(
    type: CompanyDocumentType,
    url: string,
    addedBy: string
  ): string {
    if (this.isDeleted) throw new Error('Cannot add document to deleted company');
    if (!this.canUserManage(addedBy)) {
      throw new Error('Only owner or admin can add documents');
    }

    const documentId = uuidv4();
    const event = this.createEvent<
      typeof COMPANY_EVENT_TYPES.DOCUMENT_ADDED,
      CompanyDocumentAddedEventData
    >(COMPANY_EVENT_TYPES.DOCUMENT_ADDED, {
      documentId,
      type,
      url,
      addedBy,
    });
    this.addEvent(event);
    this.apply(event);
    return documentId;
  }

  removeDocument(documentId: string, removedBy: string): void {
    if (this.isDeleted)
      throw new Error('Cannot remove document from deleted company');
    if (!this.canUserManage(removedBy)) {
      throw new Error('Only owner or admin can remove documents');
    }

    const document = this.documents.find((d) => d.id === documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const event = this.createEvent<
      typeof COMPANY_EVENT_TYPES.DOCUMENT_REMOVED,
      CompanyDocumentRemovedEventData
    >(COMPANY_EVENT_TYPES.DOCUMENT_REMOVED, {
      documentId,
      removedBy,
    });
    this.addEvent(event);
    this.apply(event);
  }

  updateRating(rating: number, countRatings: number): void {
    if (this.isDeleted) throw new Error('Cannot update rating of deleted company');
    const event = this.createEvent<
      typeof COMPANY_EVENT_TYPES.RATING_UPDATED,
      CompanyRatingUpdatedEventData
    >(COMPANY_EVENT_TYPES.RATING_UPDATED, {
      rating,
      countRatings,
    });
    this.addEvent(event);
    this.apply(event);
  }

  addMember(userId: string, role: CompanyMemberRole, addedBy: string): void {
    if (this.isDeleted) throw new Error('Cannot add member to deleted company');
    if (!this.canUserManage(addedBy)) {
      throw new Error('Only owner or admin can add members');
    }
    if (this.members.some((m) => m.userId === userId && m.isActive)) {
      throw new Error('User is already a member of this company');
    }
    if (role === 'OWNER') {
      throw new Error('Cannot add another owner');
    }

    const memberId = uuidv4();
    const event = this.createEvent<
      typeof COMPANY_EVENT_TYPES.MEMBER_ADDED,
      CompanyMemberAddedEventData
    >(COMPANY_EVENT_TYPES.MEMBER_ADDED, {
      memberId,
      userId,
      role,
      addedBy,
    });
    this.addEvent(event);
    this.apply(event);
  }

  updateMember(
    memberId: string,
    role: CompanyMemberRole,
    updatedBy: string
  ): void {
    if (this.isDeleted)
      throw new Error('Cannot update member in deleted company');
    if (!this.canUserManage(updatedBy)) {
      throw new Error('Only owner or admin can update members');
    }

    const member = this.members.find((m) => m.id === memberId && m.isActive);
    if (!member) {
      throw new Error('Member not found');
    }
    if (member.role === 'OWNER') {
      throw new Error('Cannot change owner role');
    }
    if (role === 'OWNER') {
      throw new Error('Cannot promote to owner');
    }

    const event = this.createEvent<
      typeof COMPANY_EVENT_TYPES.MEMBER_UPDATED,
      CompanyMemberUpdatedEventData
    >(COMPANY_EVENT_TYPES.MEMBER_UPDATED, {
      memberId,
      userId: member.userId,
      role,
      updatedBy,
    });
    this.addEvent(event);
    this.apply(event);
  }

  removeMember(memberId: string, removedBy: string): void {
    if (this.isDeleted)
      throw new Error('Cannot remove member from deleted company');
    if (!this.canUserManage(removedBy)) {
      throw new Error('Only owner or admin can remove members');
    }

    const member = this.members.find((m) => m.id === memberId && m.isActive);
    if (!member) {
      throw new Error('Member not found');
    }
    if (member.role === 'OWNER') {
      throw new Error('Cannot remove the company owner');
    }

    const event = this.createEvent<
      typeof COMPANY_EVENT_TYPES.MEMBER_REMOVED,
      CompanyMemberRemovedEventData
    >(COMPANY_EVENT_TYPES.MEMBER_REMOVED, {
      memberId,
      userId: member.userId,
      removedBy,
    });
    this.addEvent(event);
    this.apply(event);
  }

  delete(userId: string): void {
    if (this.isDeleted) throw new Error('Company is already deleted');
    if (userId !== this.ownerId) {
      throw new Error('Only the owner can delete the company');
    }

    const event = this.createEvent<
      typeof COMPANY_EVENT_TYPES.DELETED,
      CompanyDeletedEventData
    >(COMPANY_EVENT_TYPES.DELETED, {
      deletedAt: new Date().toISOString(),
      deletedBy: userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  getState(): CompanyState {
    return {
      ownerId: this.ownerId,
      companyUniqueId: this.companyUniqueId,
      companyName: this.companyName,
      companyTypeId: this.companyTypeId,
      companyDescription: this.companyDescription,
      avatar: this.avatar,
      phoneNumber: this.phoneNumber,
      email: this.email,
      countryId: this.countryId,
      city: this.city,
      dotMc: this.dotMc,
      status: this.status,
      statusHistory: [...this.statusHistory],
      verifyStatus: this.verifyStatus,
      isLegalEntity: this.isLegalEntity,
      rating: this.rating,
      countRatings: this.countRatings,
      documents: this.documents.map((d) => ({ ...d })),
      members: this.members.filter((m) => m.isActive).map((m) => ({ ...m })),
      isDeleted: this.isDeleted,
      createdAt: this.createdAt,
    };
  }

  getDetails() {
    return { id: this.id, ...this.getState(), version: this.version };
  }

  getOwnerId(): string {
    return this.ownerId;
  }

  private canUserManage(userId: string): boolean {
    if (userId === this.ownerId) return true;
    const member = this.members.find((m) => m.userId === userId && m.isActive);
    return member?.role === 'ADMIN';
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case COMPANY_EVENT_TYPES.CREATED:
        this.applyCreated(event.data as CompanyCreatedEventData);
        break;
      case COMPANY_EVENT_TYPES.UPDATED:
        this.applyUpdated(event.data as CompanyUpdatedEventData & { resetVerification?: boolean });
        break;
      case COMPANY_EVENT_TYPES.VERIFIED:
        this.verifyStatus = 'VERIFIED';
        break;
      case COMPANY_EVENT_TYPES.REJECTED:
        this.verifyStatus = 'REJECTED';
        break;
      case COMPANY_EVENT_TYPES.SUSPENDED:
        this.applyStatusChange('BLOCKED', (event.data as CompanySuspendedEventData).reason);
        break;
      case COMPANY_EVENT_TYPES.REACTIVATED:
        this.applyStatusChange('ACTIVE');
        break;
      case COMPANY_EVENT_TYPES.DOCUMENT_ADDED:
        this.applyDocumentAdded(event.data as CompanyDocumentAddedEventData);
        break;
      case COMPANY_EVENT_TYPES.DOCUMENT_REMOVED:
        this.applyDocumentRemoved(event.data as CompanyDocumentRemovedEventData);
        break;
      case COMPANY_EVENT_TYPES.RATING_UPDATED:
        this.applyRatingUpdated(event.data as CompanyRatingUpdatedEventData);
        break;
      case COMPANY_EVENT_TYPES.MEMBER_ADDED:
        this.applyMemberAdded(event.data as CompanyMemberAddedEventData);
        break;
      case COMPANY_EVENT_TYPES.MEMBER_UPDATED:
        this.applyMemberUpdated(event.data as CompanyMemberUpdatedEventData);
        break;
      case COMPANY_EVENT_TYPES.MEMBER_REMOVED:
        this.applyMemberRemoved(event.data as CompanyMemberRemovedEventData);
        break;
      case COMPANY_EVENT_TYPES.DELETED:
        this.isDeleted = true;
        this.applyStatusChange('INACTIVE');
        break;
    }
  }

  private applyCreated(data: CompanyCreatedEventData): void {
    this.ownerId = data.ownerId;
    this.companyName = data.companyName;
    this.companyUniqueId = generateCompanyUniqueId(data.companyName);
    this.companyTypeId = data.companyTypeId;
    this.companyDescription = data.companyDescription;
    this.avatar = data.avatar;
    this.phoneNumber = data.phoneNumber;
    this.email = data.email;
    this.countryId = data.countryId;
    this.city = data.city;
    this.dotMc = data.dotMc;
    this.isLegalEntity = data.isLegalEntity ?? true;
    this.status = 'ACTIVE';
    this.verifyStatus = 'PENDING';
    this.rating = 0;
    this.countRatings = 0;
    this.createdAt = new Date().toISOString();

    // Initialize status history
    this.statusHistory = [
      {
        status: 'ACTIVE',
        changedAt: this.createdAt,
      },
    ];

    // Initialize documents if provided
    if (data.documents) {
      this.documents = data.documents.map((doc) => ({
        ...doc,
        id: doc.id || uuidv4(),
        addedAt: doc.addedAt || this.createdAt,
      }));
    } else {
      this.documents = [];
    }

    // Add owner as first member
    const ownerMemberId = uuidv4();
    this.members = [
      {
        id: ownerMemberId,
        userId: data.ownerId,
        role: 'OWNER',
        isActive: true,
        joinedAt: this.createdAt,
      },
    ];
  }

  private applyUpdated(data: CompanyUpdatedEventData & { resetVerification?: boolean }): void {
    if (data.companyName !== undefined) this.companyName = data.companyName;
    if (data.companyTypeId !== undefined) this.companyTypeId = data.companyTypeId;
    if (data.companyDescription !== undefined) this.companyDescription = data.companyDescription;
    if (data.avatar !== undefined) this.avatar = data.avatar;
    if (data.phoneNumber !== undefined) this.phoneNumber = data.phoneNumber;
    if (data.email !== undefined) this.email = data.email;
    if (data.countryId !== undefined) this.countryId = data.countryId;
    if (data.city !== undefined) this.city = data.city;
    if (data.dotMc !== undefined) this.dotMc = data.dotMc;
    if (data.isLegalEntity !== undefined) this.isLegalEntity = data.isLegalEntity;

    // Handle status change
    if (data.status !== undefined && data.status !== this.status) {
      this.applyStatusChange(data.status, data.statusReason);
    }

    // Reset verification if key fields changed
    if (data.resetVerification) {
      this.verifyStatus = 'PENDING';
    }
  }

  private applyStatusChange(newStatus: CompanyStatus, reason?: string): void {
    this.status = newStatus;
    this.statusHistory.push({
      status: newStatus,
      reason,
      changedAt: new Date().toISOString(),
    });
  }

  private applyDocumentAdded(data: CompanyDocumentAddedEventData): void {
    this.documents.push({
      id: data.documentId,
      type: data.type,
      url: data.url,
      addedAt: new Date().toISOString(),
    });
  }

  private applyDocumentRemoved(data: CompanyDocumentRemovedEventData): void {
    this.documents = this.documents.filter((d) => d.id !== data.documentId);
  }

  private applyRatingUpdated(data: CompanyRatingUpdatedEventData): void {
    this.rating = data.rating;
    this.countRatings = data.countRatings;
  }

  private applyMemberAdded(data: CompanyMemberAddedEventData): void {
    this.members.push({
      id: data.memberId,
      userId: data.userId,
      role: data.role,
      isActive: true,
      joinedAt: new Date().toISOString(),
    });
  }

  private applyMemberUpdated(data: CompanyMemberUpdatedEventData): void {
    const member = this.members.find((m) => m.id === data.memberId);
    if (member) {
      member.role = data.role;
    }
  }

  private applyMemberRemoved(data: CompanyMemberRemovedEventData): void {
    const member = this.members.find((m) => m.id === data.memberId);
    if (member) {
      member.isActive = false;
    }
  }
}
