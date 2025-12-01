import { IQuery } from '@flexobo/core';

export class GetUserByIdQuery implements IQuery {
  constructor(public readonly userId: string) {}
}

export class GetUsersByIdsQuery implements IQuery {
  constructor(public readonly userIds: string[]) {}
}

export class ValidateTokenQuery implements IQuery {
  constructor(public readonly token: string) {}
}

export class IsTokenBlacklistedQuery implements IQuery {
  constructor(public readonly jti: string) {}
}
