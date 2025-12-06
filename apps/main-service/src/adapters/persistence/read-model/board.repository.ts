import { Injectable, Inject } from '@nestjs/common';
import {
  IBoardReadRepository,
  BoardReadDto,
  BoardFilters,
} from '../../../ports/board.repository';

interface BoardPrismaClient {
  boardReadModel: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    upsert: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
}

@Injectable()
export class PrismaBoardReadRepository implements IBoardReadRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: BoardPrismaClient
  ) {}

  async findById(id: string): Promise<BoardReadDto | null> {
    const board = await this.prisma.boardReadModel.findUnique({
      where: { id },
    });

    return board ? this.mapToDto(board) : null;
  }

  async findByOwner(
    ownerId: string,
    filters?: BoardFilters
  ): Promise<BoardReadDto[]> {
    const { isActive, offset = 0, limit = 20 } = filters || {};

    const boards = await this.prisma.boardReadModel.findMany({
      where: {
        ownerId,
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return boards.map((b: any) => this.mapToDto(b));
  }

  async findByMember(
    userId: string,
    filters?: BoardFilters
  ): Promise<BoardReadDto[]> {
    const { isActive, offset = 0, limit = 20 } = filters || {};

    // Find boards where user is a member
    // members is a JSON array of {userId, role}
    const boards = await this.prisma.boardReadModel.findMany({
      where: {
        members: {
          path: '$[*].userId',
          array_contains: userId,
        },
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return boards.map((b: any) => this.mapToDto(b));
  }

  async findByCompany(
    companyId: string,
    filters?: BoardFilters
  ): Promise<BoardReadDto[]> {
    const { isActive, offset = 0, limit = 20 } = filters || {};

    const boards = await this.prisma.boardReadModel.findMany({
      where: {
        companyId,
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return boards.map((b: any) => this.mapToDto(b));
  }

  async countByOwner(ownerId: string, filters?: BoardFilters): Promise<number> {
    const { isActive } = filters || {};

    return this.prisma.boardReadModel.count({
      where: {
        ownerId,
        ...(isActive !== undefined && { isActive }),
      },
    });
  }

  async countByMember(userId: string, filters?: BoardFilters): Promise<number> {
    const { isActive } = filters || {};

    return this.prisma.boardReadModel.count({
      where: {
        members: {
          path: '$[*].userId',
          array_contains: userId,
        },
        ...(isActive !== undefined && { isActive }),
      },
    });
  }

  async save(board: BoardReadDto): Promise<void> {
    await this.prisma.boardReadModel.upsert({
      where: { id: board.id },
      create: {
        id: board.id,
        ownerId: board.ownerId,
        companyId: board.companyId,
        name: board.name,
        description: board.description,
        members: board.members,
        isActive: board.isActive,
      },
      update: {
        name: board.name,
        description: board.description,
        members: board.members,
        isActive: board.isActive,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.boardReadModel.delete({
      where: { id },
    });
  }

  private mapToDto(board: any): BoardReadDto {
    return {
      id: board.id,
      ownerId: board.ownerId,
      companyId: board.companyId,
      name: board.name,
      description: board.description,
      members: board.members || [],
      isActive: board.isActive,
      version: board.version ?? 0,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    };
  }
}
