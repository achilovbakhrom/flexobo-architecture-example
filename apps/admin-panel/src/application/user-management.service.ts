/**
 * User Management Use Cases
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PasswordService } from '@flexobo/core';
import {
  User,
  UserDto,
  CreateUserCommand,
  UpdateUserCommand,
  UpdateUserRolesCommand,
  PaginatedResult,
  ListQueryParams,
} from '../domain/admin.types';
import { UserRole } from '@flexobo/core';

/**
 * In-memory user repository for demo purposes
 * In production, use Prisma with PostgreSQL
 */
@Injectable()
export class UserRepository {
  private users: Map<string, User> = new Map();

  async findAll(params: ListQueryParams): Promise<PaginatedResult<User>> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    let users = Array.from(this.users.values());

    // Apply search filter
    if (params.search) {
      const search = params.search.toLowerCase();
      users = users.filter(
        (user) =>
          user.email.toLowerCase().includes(search) ||
          user.username.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    if (params.sortBy) {
      users.sort((a, b) => {
        const aVal = a[params.sortBy as keyof User];
        const bVal = b[params.sortBy as keyof User];
        const order = params.sortOrder === 'desc' ? -1 : 1;

        // Handle undefined values
        if (aVal === undefined && bVal === undefined) return 0;
        if (aVal === undefined) return 1;
        if (bVal === undefined) return -1;

        return aVal > bVal ? order : aVal < bVal ? -order : 0;
      });
    }

    const total = users.length;
    const data = users.slice(offset, offset + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return (
      Array.from(this.users.values()).find((u) => u.email === email) || null
    );
  }

  async findByUsername(username: string): Promise<User | null> {
    return (
      Array.from(this.users.values()).find((u) => u.username === username) ||
      null
    );
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }
}

/**
 * User management service
 */
@Injectable()
export class UserManagementService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService
  ) {}

  /**
   * List all users
   */
  async listUsers(params: ListQueryParams): Promise<PaginatedResult<UserDto>> {
    const result = await this.userRepository.findAll(params);

    return {
      ...result,
      data: result.data.map((user) => this.toDto(user)),
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.toDto(user);
  }

  /**
   * Create new user
   */
  async createUser(command: CreateUserCommand): Promise<UserDto> {
    // Check if email already exists
    const existingEmail = await this.userRepository.findByEmail(command.email);
    if (existingEmail) {
      throw new ConflictException(
        `User with email ${command.email} already exists`
      );
    }

    // Check if username already exists
    const existingUsername = await this.userRepository.findByUsername(
      command.username
    );
    if (existingUsername) {
      throw new ConflictException(
        `User with username ${command.username} already exists`
      );
    }

    // Hash password
    // Store the hashed password in a production user store
    await this.passwordService.hash(command.password);

    // Create user
    const user: User = {
      id: randomUUID(),
      email: command.email,
      username: command.username,
      roles: command.roles || [UserRole.USER],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.userRepository.save(user);

    return this.toDto(user);
  }

  /**
   * Update user
   */
  async updateUser(id: string, command: UpdateUserCommand): Promise<UserDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if email is being changed and already exists
    if (command.email && command.email !== user.email) {
      const existingEmail = await this.userRepository.findByEmail(
        command.email
      );
      if (existingEmail) {
        throw new ConflictException(
          `User with email ${command.email} already exists`
        );
      }
      user.email = command.email;
    }

    // Check if username is being changed and already exists
    if (command.username && command.username !== user.username) {
      const existingUsername = await this.userRepository.findByUsername(
        command.username
      );
      if (existingUsername) {
        throw new ConflictException(
          `User with username ${command.username} already exists`
        );
      }
      user.username = command.username;
    }

    // Update password if provided
    if (command.password) {
      await this.passwordService.hash(command.password);
    }

    // Update active status
    if (command.isActive !== undefined) {
      user.isActive = command.isActive;
    }

    user.updatedAt = new Date();

    await this.userRepository.save(user);

    return this.toDto(user);
  }

  /**
   * Update user roles
   */
  async updateUserRoles(
    id: string,
    command: UpdateUserRolesCommand
  ): Promise<UserDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.roles = command.roles;
    user.updatedAt = new Date();

    await this.userRepository.save(user);

    return this.toDto(user);
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userRepository.delete(id);
  }

  /**
   * Convert user to DTO
   */
  private toDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
    };
  }
}
