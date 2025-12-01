import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { QueryBus } from '@flexobo/core';
import {
  ValidateTokenQuery,
  GetUserByIdQuery,
  GetUsersByIdsQuery,
  IsTokenBlacklistedQuery,
} from '../../application/queries';
import { IUser, IValidateTokenResult } from '../../ports';

interface ValidateTokenRequest {
  token: string;
}

interface ValidateTokenResponse {
  valid: boolean;
  userId?: string;
  role?: string;
  jti?: string;
  error?: string;
}

interface GetUserRequest {
  userId: string;
}

interface GetUserResponse {
  found: boolean;
  user?: UserInfo;
}

interface GetUsersRequest {
  userIds: string[];
}

interface GetUsersResponse {
  users: UserInfo[];
}

interface IsTokenBlacklistedRequest {
  jti: string;
}

interface IsTokenBlacklistedResponse {
  blacklisted: boolean;
}

interface UserInfo {
  id: string;
  uniqueId: string;
  email?: string;
  phoneNumber?: string;
  telegramId?: string;
  fio: string;
  avatar?: string;
  role: string;
  userType?: string;
  status: string;
  language: string;
  isVerified: boolean;
}

@Controller()
export class UsersGrpcController {
  constructor(private readonly queryBus: QueryBus) {}

  @GrpcMethod('UsersService', 'ValidateToken')
  async validateToken(data: ValidateTokenRequest): Promise<ValidateTokenResponse> {
    const query = new ValidateTokenQuery(data.token);
    const result = await this.queryBus.execute<IValidateTokenResult>(query);

    return {
      valid: result.valid,
      userId: result.userId || '',
      role: result.role || '',
      jti: result.jti || '',
      error: result.error || '',
    };
  }

  @GrpcMethod('UsersService', 'GetUser')
  async getUser(data: GetUserRequest): Promise<GetUserResponse> {
    const query = new GetUserByIdQuery(data.userId);
    const user = await this.queryBus.execute<IUser | null>(query);

    if (!user) {
      return { found: false };
    }

    return {
      found: true,
      user: this.mapToUserInfo(user),
    };
  }

  @GrpcMethod('UsersService', 'GetUsers')
  async getUsers(data: GetUsersRequest): Promise<GetUsersResponse> {
    const query = new GetUsersByIdsQuery(data.userIds);
    const users = await this.queryBus.execute<IUser[]>(query);

    return {
      users: users.map((user) => this.mapToUserInfo(user)),
    };
  }

  @GrpcMethod('UsersService', 'IsTokenBlacklisted')
  async isTokenBlacklisted(
    data: IsTokenBlacklistedRequest
  ): Promise<IsTokenBlacklistedResponse> {
    const query = new IsTokenBlacklistedQuery(data.jti);
    const blacklisted = await this.queryBus.execute<boolean>(query);

    return { blacklisted };
  }

  private mapToUserInfo(user: IUser): UserInfo {
    return {
      id: user.id,
      uniqueId: user.uniqueId,
      email: user.email || undefined,
      phoneNumber: user.phoneNumber || undefined,
      telegramId: user.telegramId || undefined,
      fio: user.fio,
      avatar: user.avatar || undefined,
      role: user.role,
      userType: user.userType || undefined,
      status: user.status,
      language: user.language,
      isVerified: user.isVerified,
    };
  }
}
