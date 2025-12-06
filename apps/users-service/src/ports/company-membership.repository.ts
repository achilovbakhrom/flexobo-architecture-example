export const COMPANY_MEMBERSHIP_REPOSITORY = Symbol('COMPANY_MEMBERSHIP_REPOSITORY');

export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface CompanyMembershipReadDto {
  id: string;
  userId: string;
  companyId: string;
  memberRole: MemberRole;
  isActive: boolean;
  isDefault: boolean;
  joinedAt: Date;
  leftAt: Date | null;
}

export interface ICompanyMembershipRepository {
  findById(id: string): Promise<CompanyMembershipReadDto | null>;
  findByUserAndCompany(userId: string, companyId: string): Promise<CompanyMembershipReadDto | null>;
  findByUser(userId: string, activeOnly?: boolean): Promise<CompanyMembershipReadDto[]>;
  findByCompany(companyId: string, activeOnly?: boolean): Promise<CompanyMembershipReadDto[]>;
  findDefaultForUser(userId: string): Promise<CompanyMembershipReadDto | null>;
  create(data: {
    id: string;
    userId: string;
    companyId: string;
    memberRole: MemberRole;
    isDefault?: boolean;
  }): Promise<void>;
  update(
    id: string,
    data: {
      memberRole?: MemberRole;
      isActive?: boolean;
      isDefault?: boolean;
      leftAt?: Date;
    }
  ): Promise<void>;
  setDefault(userId: string, companyId: string): Promise<void>;
  leave(userId: string, companyId: string): Promise<void>;
  delete(id: string): Promise<void>;
}
