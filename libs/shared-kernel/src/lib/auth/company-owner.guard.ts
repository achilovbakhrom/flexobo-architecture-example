import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Optional,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const COMPANY_OWNER_REQUIRED_KEY = 'company_owner_required';
export const COMPANY_ADMIN_REQUIRED_KEY = 'company_admin_required';
export const COMPANY_MEMBER_REQUIRED_KEY = 'company_member_required';

export const COMPANY_MEMBERSHIP_CHECKER = Symbol('COMPANY_MEMBERSHIP_CHECKER');

/**
 * Decorator to require company owner role
 */
export const RequireCompanyOwner = () =>
  SetMetadata(COMPANY_OWNER_REQUIRED_KEY, true);

/**
 * Decorator to require company admin (or owner) role
 */
export const RequireCompanyAdmin = () =>
  SetMetadata(COMPANY_ADMIN_REQUIRED_KEY, true);

/**
 * Decorator to require company membership
 */
export const RequireCompanyMember = () =>
  SetMetadata(COMPANY_MEMBER_REQUIRED_KEY, true);

export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/**
 * Interface for company membership checking service
 */
export interface ICompanyMembershipChecker {
  getMemberRole(userId: string, companyId: string): Promise<MemberRole | null>;
  isOwner(userId: string, companyId: string): Promise<boolean>;
  isAdmin(userId: string, companyId: string): Promise<boolean>;
  isMember(userId: string, companyId: string): Promise<boolean>;
}

@Injectable()
export class CompanyOwnerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(COMPANY_MEMBERSHIP_CHECKER)
    private readonly membershipChecker?: ICompanyMembershipChecker
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresOwner = this.reflector.getAllAndOverride<boolean>(
      COMPANY_OWNER_REQUIRED_KEY,
      [context.getHandler(), context.getClass()]
    );

    const requiresAdmin = this.reflector.getAllAndOverride<boolean>(
      COMPANY_ADMIN_REQUIRED_KEY,
      [context.getHandler(), context.getClass()]
    );

    const requiresMember = this.reflector.getAllAndOverride<boolean>(
      COMPANY_MEMBER_REQUIRED_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiresOwner && !requiresAdmin && !requiresMember) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const companyId = this.getCompanyId(context, request);

    if (!companyId) {
      throw new ForbiddenException('Company context required');
    }

    // If no membership checker is injected, check user context directly
    if (!this.membershipChecker) {
      const userCompanyRole = user.companyRole || user.memberRole;

      if (requiresOwner && userCompanyRole !== 'OWNER') {
        throw new ForbiddenException('Only company owners can perform this action');
      }

      if (
        requiresAdmin &&
        userCompanyRole !== 'OWNER' &&
        userCompanyRole !== 'ADMIN'
      ) {
        throw new ForbiddenException(
          'Only company owners and admins can perform this action'
        );
      }

      if (!userCompanyRole) {
        throw new ForbiddenException('You are not a member of this company');
      }

      return true;
    }

    const userId = user.id || user.user;

    if (requiresOwner) {
      const isOwner = await this.membershipChecker.isOwner(userId, companyId);
      if (!isOwner) {
        throw new ForbiddenException('Only company owners can perform this action');
      }
      return true;
    }

    if (requiresAdmin) {
      const isAdmin = await this.membershipChecker.isAdmin(userId, companyId);
      if (!isAdmin) {
        throw new ForbiddenException(
          'Only company owners and admins can perform this action'
        );
      }
      return true;
    }

    if (requiresMember) {
      const isMember = await this.membershipChecker.isMember(userId, companyId);
      if (!isMember) {
        throw new ForbiddenException('You are not a member of this company');
      }
      return true;
    }

    return true;
  }

  private getCompanyId(context: ExecutionContext, request: {
    headers?: { 'x-company-id'?: string };
    params?: { companyId?: string };
    query?: { companyId?: string };
    body?: { companyId?: string };
    user?: { companyId?: string };
  }): string | undefined {
    // Try header first
    if (request.headers?.['x-company-id']) {
      return request.headers['x-company-id'];
    }

    // Try route params
    if (request.params?.companyId) {
      return request.params.companyId;
    }

    // Try query params
    if (request.query?.companyId) {
      return request.query.companyId;
    }

    // Try request body
    if (request.body?.companyId) {
      return request.body.companyId;
    }

    // Try user context
    if (request.user?.companyId) {
      return request.user.companyId;
    }

    return undefined;
  }
}
