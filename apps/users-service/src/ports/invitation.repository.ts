export const INVITATION_REPOSITORY = Symbol('INVITATION_REPOSITORY');

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';

export interface InvitationReadDto {
  id: string;
  email: string;
  phone: string | null;
  invitedBy: string;
  companyId: string;
  roleId: string | null;
  token: string;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedBy: string | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvitationRepository {
  findById(id: string): Promise<InvitationReadDto | null>;
  findByToken(token: string): Promise<InvitationReadDto | null>;
  findByEmail(email: string, status?: InvitationStatus): Promise<InvitationReadDto[]>;
  findByCompany(companyId: string, status?: InvitationStatus): Promise<InvitationReadDto[]>;
  findPendingByEmailAndCompany(email: string, companyId: string): Promise<InvitationReadDto | null>;
  create(data: {
    id: string;
    email: string;
    phone?: string;
    invitedBy: string;
    companyId: string;
    roleId?: string;
    token: string;
    expiresAt: Date;
  }): Promise<void>;
  updateStatus(
    id: string,
    status: InvitationStatus,
    data?: {
      acceptedAt?: Date;
      acceptedBy?: string;
      rejectedAt?: Date;
    }
  ): Promise<void>;
  delete(id: string): Promise<void>;
  deleteExpired(): Promise<number>; // Returns count of deleted invitations
}
