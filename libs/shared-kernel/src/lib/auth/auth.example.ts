/**
 * Authentication usage examples
 */

import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { JwtService } from './jwt.service';
import { PasswordService } from './password.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { CurrentUser } from './current-user.decorator';
import {
  UserRole,
  LoginCredentials,
  RegisterData,
  JwtPayload,
} from './auth.types';

/**
 * Example: Authentication Controller
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService
  ) {}

  /**
   * Public route - Login
   */
  @Public()
  @Post('login')
  async login(@Body() credentials: LoginCredentials) {
    // In production, validate against database
    const user = await this.validateUser(credentials);

    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }

    const accessToken = this.jwtService.generateAccessToken({
      sub: user.id,
      username: user.username,
      roles: user.roles,
    });

    const refreshToken = this.jwtService.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 minutes
      user: {
        id: user.id,
        username: user.username,
        roles: user.roles,
      },
    };
  }

  /**
   * Public route - Register
   */
  @Public()
  @Post('register')
  async register(@Body() data: RegisterData) {
    // Hash password
    const hashedPassword = await this.passwordService.hash(data.password);

    // In production, save to database
    const user = {
      id: `user-${Date.now()}`,
      username: data.username,
      email: data.email,
      password: hashedPassword,
      roles: data.roles || [UserRole.USER],
    };

    return {
      success: true,
      userId: user.id,
      username: user.username,
    };
  }

  /**
   * Protected route - Refresh token
   */
  @Public()
  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    const result = this.jwtService.validateToken(body.refreshToken);

    if (!result.valid || !result.payload) {
      return { success: false, message: 'Invalid refresh token' };
    }

    // Generate new access token
    // In production, fetch user from database
    const accessToken = this.jwtService.generateAccessToken({
      sub: result.payload.sub,
      username: 'user', // fetch from DB
      roles: [UserRole.USER], // fetch from DB
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }

  /**
   * Protected route - Get current user
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: JwtPayload) {
    return {
      id: user.sub,
      username: user.username,
      roles: user.roles,
    };
  }

  /**
   * Admin only route
   */
  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listUsers(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Admin access granted',
      requestedBy: user.username,
      users: [], // Fetch from database
    };
  }

  /**
   * Manager or Admin route
   */
  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async getReports(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Reports access',
      role: user.roles,
      reports: [],
    };
  }

  /**
   * Validate user credentials
   */
  private async validateUser(credentials: LoginCredentials) {
    // In production, fetch from database
    const mockUser = {
      id: 'user-123',
      username: 'demo',
      password: await this.passwordService.hash('password'),
      roles: [UserRole.USER, UserRole.ADMIN],
    };

    if (credentials.username !== mockUser.username) {
      return null;
    }

    const isValid = await this.passwordService.verify(
      credentials.password,
      mockUser.password
    );

    if (!isValid) {
      return null;
    }

    return mockUser;
  }
}

/**
 * Example: Using authentication in services
 */
class OrderService {
  async createOrder(userId: string, orderData: unknown) {
    // User ID is extracted from JWT token
    console.log(`Creating order for user: ${userId}`);
    return { orderId: 'order-123', userId, data: orderData };
  }
}

/**
 * Example: Protected order controller
 */
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(
    @CurrentUser('sub') userId: string,
    @Body() orderData: unknown
  ) {
    return this.orderService.createOrder(userId, orderData);
  }

  @Get()
  async getMyOrders(@CurrentUser() user: JwtPayload) {
    return {
      userId: user.sub,
      orders: [], // Fetch user's orders
    };
  }

  @Get('all')
  @Roles(UserRole.ADMIN)
  async getAllOrders() {
    return {
      orders: [], // Admin can see all orders
    };
  }
}

/**
 * Example: Module configuration
 */
/*
import { Module } from '@nestjs/common';
import { AuthModule } from '@flexobo/core';

@Module({
  imports: [
    AuthModule.forRoot({
      jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        accessTokenExpiry: 900, // 15 minutes
        refreshTokenExpiry: 604800, // 7 days
      },
      globalGuard: true, // Apply auth guard globally
      global: true,
    }),
  ],
  controllers: [AuthController, OrderController],
})
export class AppModule {}
*/

/**
 * Example: Testing authentication
 */
export const authExamples = {
  // 1. Login
  login: async () => {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'demo',
        password: 'password',
      }),
    });
    return response.json();
  },

  // 2. Access protected route
  getProfile: async (accessToken: string) => {
    const response = await fetch('http://localhost:3000/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.json();
  },

  // 3. Admin-only route
  adminRoute: async (accessToken: string) => {
    const response = await fetch('http://localhost:3000/auth/admin/users', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.json();
  },

  // 4. Refresh token
  refresh: async (refreshToken: string) => {
    const response = await fetch('http://localhost:3000/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    return response.json();
  },
};
