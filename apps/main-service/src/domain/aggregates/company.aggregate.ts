import { AggregateRoot, DomainEvent } from '@flexobo/core';
import { v4 as uuidv4 } from 'uuid';
import {
  COMPANY_EVENT_TYPES,
  CompanyType,
  CompanyStatus,
  CompanyMemberRole,
  CompanyMemberData,
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
} from '../events/company.events';

export interface CompanyState {
  ownerId: string;
  name: string;
  type: CompanyType;
  status: CompanyStatus;
  description?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  country?: string;
  city?: string;
  taxId?: string;
  website?: string;
  members: CompanyMemberData[];
  isActive: boolean;
  isDeleted: boolean;
}

export class Company extends AggregateRoot {
  private ownerId!: string;
  private name!: string;
  private type!: CompanyType;
  private status: CompanyStatus = 'PENDING';
  private description?: string;
  private logo?: string;
  private phone?: string;
  private email?: string;
  private address?: string;
  private country?: string;
  private city?: string;
  private taxId?: string;
  private website?: string;
  private members: CompanyMemberData[] = [];
  private isActive: boolean = true;
  private isDeleted: boolean = false;

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
    const event = this.createEvent(COMPANY_EVENT_TYPES.UPDATED, data);
    this.addEvent(event);
    this.apply(event);
  }

  verify(verifiedBy: string, notes?: string): void {
    if (this.isDeleted) throw new Error('Cannot verify deleted company');
    if (this.status === 'VERIFIED') throw new Error('Company is already verified');
    const event = this.createEvent<typeof COMPANY_EVENT_TYPES.VERIFIED, CompanyVerifiedEventData>(
      COMPANY_EVENT_TYPES.VERIFIED,
      {
        verifiedAt: new Date().toISOString(),
        verifiedBy,
        notes,
      }
    );
    this.addEvent(event);
    this.apply(event);
  }

  reject(rejectedBy: string, reason: string): void {
    if (this.isDeleted) throw new Error('Cannot reject deleted company');
    if (this.status === 'REJECTED') throw new Error('Company is already rejected');
    const event = this.createEvent<typeof COMPANY_EVENT_TYPES.REJECTED, CompanyRejectedEventData>(
      COMPANY_EVENT_TYPES.REJECTED,
      {
        rejectedAt: new Date().toISOString(),
        rejectedBy,
        reason,
      }
    );
    this.addEvent(event);
    this.apply(event);
  }

  suspend(suspendedBy: string, reason: string): void {
    if (this.isDeleted) throw new Error('Cannot suspend deleted company');
    if (this.status === 'SUSPENDED') throw new Error('Company is already suspended');
    const event = this.createEvent<typeof COMPANY_EVENT_TYPES.SUSPENDED, CompanySuspendedEventData>(
      COMPANY_EVENT_TYPES.SUSPENDED,
      {
        suspendedAt: new Date().toISOString(),
        suspendedBy,
        reason,
      }
    );
    this.addEvent(event);
    this.apply(event);
  }

  reactivate(reactivatedBy: string): void {
    if (this.isDeleted) throw new Error('Cannot reactivate deleted company');
    if (this.status !== 'SUSPENDED') throw new Error('Only suspended companies can be reactivated');
    const event = this.createEvent<typeof COMPANY_EVENT_TYPES.REACTIVATED, CompanyReactivatedEventData>(
      COMPANY_EVENT_TYPES.REACTIVATED,
      {
        reactivatedAt: new Date().toISOString(),
        reactivatedBy,
      }
    );
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
    const event = this.createEvent<typeof COMPANY_EVENT_TYPES.MEMBER_ADDED, CompanyMemberAddedEventData>(
      COMPANY_EVENT_TYPES.MEMBER_ADDED,
      {
        memberId,
        userId,
        role,
        addedBy,
      }
    );
    this.addEvent(event);
    this.apply(event);
  }

  updateMember(memberId: string, role: CompanyMemberRole, updatedBy: string): void {
    if (this.isDeleted) throw new Error('Cannot update member in deleted company');
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

    const event = this.createEvent<typeof COMPANY_EVENT_TYPES.MEMBER_UPDATED, CompanyMemberUpdatedEventData>(
      COMPANY_EVENT_TYPES.MEMBER_UPDATED,
      {
        memberId,
        userId: member.userId,
        role,
        updatedBy,
      }
    );
    this.addEvent(event);
    this.apply(event);
  }

  removeMember(memberId: string, removedBy: string): void {
    if (this.isDeleted) throw new Error('Cannot remove member from deleted company');
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

    const event = this.createEvent<typeof COMPANY_EVENT_TYPES.MEMBER_REMOVED, CompanyMemberRemovedEventData>(
      COMPANY_EVENT_TYPES.MEMBER_REMOVED,
      {
        memberId,
        userId: member.userId,
        removedBy,
      }
    );
    this.addEvent(event);
    this.apply(event);
  }

  delete(userId: string): void {
    if (this.isDeleted) throw new Error('Company is already deleted');
    if (userId !== this.ownerId) {
      throw new Error('Only the owner can delete the company');
    }

    const event = this.createEvent<typeof COMPANY_EVENT_TYPES.DELETED, CompanyDeletedEventData>(
      COMPANY_EVENT_TYPES.DELETED,
      {
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      }
    );
    this.addEvent(event);
    this.apply(event);
  }

  getState(): CompanyState {
    return {
      ownerId: this.ownerId,
      name: this.name,
      type: this.type,
      status: this.status,
      description: this.description,
      logo: this.logo,
      phone: this.phone,
      email: this.email,
      address: this.address,
      country: this.country,
      city: this.city,
      taxId: this.taxId,
      website: this.website,
      members: this.members.filter((m) => m.isActive).map((m) => ({ ...m })),
      isActive: this.isActive,
      isDeleted: this.isDeleted,
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
        this.applyUpdated(event.data as CompanyUpdatedEventData);
        break;
      case COMPANY_EVENT_TYPES.VERIFIED:
        this.status = 'VERIFIED';
        break;
      case COMPANY_EVENT_TYPES.REJECTED:
        this.status = 'REJECTED';
        this.isActive = false;
        break;
      case COMPANY_EVENT_TYPES.SUSPENDED:
        this.status = 'SUSPENDED';
        this.isActive = false;
        break;
      case COMPANY_EVENT_TYPES.REACTIVATED:
        this.status = 'VERIFIED';
        this.isActive = true;
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
        this.isActive = false;
        break;
    }
  }

  private applyCreated(data: CompanyCreatedEventData): void {
    this.ownerId = data.ownerId;
    this.name = data.name;
    this.type = data.type;
    this.status = 'PENDING';
    this.description = data.description;
    this.logo = data.logo;
    this.phone = data.phone;
    this.email = data.email;
    this.address = data.address;
    this.country = data.country;
    this.city = data.city;
    this.taxId = data.taxId;
    this.website = data.website;
    this.isActive = true;

    // Add owner as first member
    const ownerMemberId = uuidv4();
    this.members = [
      {
        id: ownerMemberId,
        userId: data.ownerId,
        role: 'OWNER',
        isActive: true,
        joinedAt: new Date().toISOString(),
      },
    ];
  }

  private applyUpdated(data: CompanyUpdatedEventData): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.description !== undefined) this.description = data.description;
    if (data.logo !== undefined) this.logo = data.logo;
    if (data.phone !== undefined) this.phone = data.phone;
    if (data.email !== undefined) this.email = data.email;
    if (data.address !== undefined) this.address = data.address;
    if (data.country !== undefined) this.country = data.country;
    if (data.city !== undefined) this.city = data.city;
    if (data.taxId !== undefined) this.taxId = data.taxId;
    if (data.website !== undefined) this.website = data.website;
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
