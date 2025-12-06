import { IAggregateStore } from '@flexobo/core';
import { Company } from '../domain/aggregates/company.aggregate';
import {
  CompanyType,
  CompanyStatus,
  CompanyMemberRole,
} from '../domain/events/company.events';

export const COMPANY_AGGREGATE_STORE = Symbol('COMPANY_AGGREGATE_STORE');
export const COMPANY_READ_REPOSITORY = Symbol('COMPANY_READ_REPOSITORY');

export type ICompanyAggregateStore = IAggregateStore<Company>;

export interface CompanyMemberReadDto {
  id: string;
  userId: string;
  role: CompanyMemberRole;
  isActive: boolean;
  joinedAt: Date;
}

export interface CompanyReadDto {
  id: string;
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
  members: CompanyMemberReadDto[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyFilters {
  status?: CompanyStatus;
  type?: CompanyType;
  country?: string;
  city?: string;
  isActive?: boolean;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface ICompanyReadRepository {
  findById(id: string): Promise<CompanyReadDto | null>;
  findByOwner(ownerId: string): Promise<CompanyReadDto | null>;
  findByMember(userId: string): Promise<CompanyReadDto[]>;
  findAll(filters?: CompanyFilters): Promise<CompanyReadDto[]>;
  count(filters?: CompanyFilters): Promise<number>;
  save(company: CompanyReadDto): Promise<void>;
  delete(id: string): Promise<void>;
  addMember(companyId: string, member: CompanyMemberReadDto): Promise<void>;
  updateMember(companyId: string, memberId: string, role: CompanyMemberRole): Promise<void>;
  removeMember(companyId: string, memberId: string): Promise<void>;
}
