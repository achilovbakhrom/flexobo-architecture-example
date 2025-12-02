import { IQuery } from '@flexobo/core';

/**
 * Get File By ID Query
 */
export class GetFileByIdQuery implements IQuery {
  constructor(public readonly fileId: string) {}
}

/**
 * Get Files By User Query (paginated)
 */
export class GetFilesByUserQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly limit?: number,
    public readonly offset?: number
  ) {}
}

/**
 * Get Files By Company Query (paginated)
 */
export class GetFilesByCompanyQuery implements IQuery {
  constructor(
    public readonly companyId: string,
    public readonly limit?: number,
    public readonly offset?: number
  ) {}
}

/**
 * Get Storage Stats Query
 *
 * Returns total storage used and file count for a user.
 */
export class GetStorageStatsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly companyId?: string
  ) {}
}

/**
 * Get Download URL Query
 *
 * Returns a URL to download the file.
 */
export class GetDownloadUrlQuery implements IQuery {
  constructor(
    public readonly fileId: string,
    public readonly userId: string
  ) {}
}
