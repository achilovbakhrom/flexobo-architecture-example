import { IAggregateStore } from '@flexobo/core';
import { Company } from '../domain/aggregates/company.aggregate';
import {
  CompanyStatus,
  CompanyVerifyStatus,
  CompanyMemberRole,
  CompanyDocumentType,
  CompanyStatusHistoryItem,
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

export interface CompanyDocumentReadDto {
  id: string;
  type: CompanyDocumentType;
  url: string;
  addedAt?: string;
}

export interface CountryReadDto {
  id: string;
  code: string;
  name: Record<string, string>; // { en: "...", ru: "...", uz: "..." }
}

export interface CompanyTypeReadDto {
  id: string;
  name: Record<string, string>; // { en: "...", ru: "...", uz: "..." }
  description?: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyReadDto {
  id: string;
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
  documents: CompanyDocumentReadDto[];
  members: CompanyMemberReadDto[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  // Populated fields for response
  country?: CountryReadDto;
  companyType?: CompanyTypeReadDto;
  ownerFio?: string; // Owner's name from user service
}

export interface CompanyFilters {
  status?: CompanyStatus;
  verifyStatus?: CompanyVerifyStatus;
  companyTypeId?: string;
  countryId?: string;
  city?: string;
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
  save(company: Omit<CompanyReadDto, 'country' | 'companyType' | 'ownerFio'>): Promise<void>;
  delete(id: string): Promise<void>;
  addMember(companyId: string, member: CompanyMemberReadDto): Promise<void>;
  updateMember(companyId: string, memberId: string, role: CompanyMemberRole): Promise<void>;
  removeMember(companyId: string, memberId: string): Promise<void>;
}

// Company Type repository
export const COMPANY_TYPE_READ_REPOSITORY = Symbol('COMPANY_TYPE_READ_REPOSITORY');

export interface ICompanyTypeReadRepository {
  findById(id: string): Promise<CompanyTypeReadDto | null>;
  findAll(includeInactive?: boolean): Promise<CompanyTypeReadDto[]>;
  save(companyType: Omit<CompanyTypeReadDto, 'createdAt' | 'updatedAt'> & { createdAt?: Date; updatedAt?: Date }): Promise<void>;
  delete(id: string): Promise<void>;
}

// Country repository
export const COUNTRY_READ_REPOSITORY = Symbol('COUNTRY_READ_REPOSITORY');

export interface ICountryReadRepository {
  findById(id: string): Promise<CountryReadDto | null>;
  findByCode(code: string): Promise<CountryReadDto | null>;
  findAll(includeInactive?: boolean): Promise<CountryReadDto[]>;
}
