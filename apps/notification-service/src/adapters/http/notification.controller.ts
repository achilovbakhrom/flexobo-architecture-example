import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@flexobo/core';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@flexobo/shared-kernel';
import {
  MarkNotificationReadCommand,
  MarkAllNotificationsReadCommand,
  RegisterDeviceTokenCommand,
  RemoveDeviceTokenCommand,
} from '../../application/commands';
import {
  GetNotificationsQuery,
  GetUnreadCountQuery,
} from '../../application/queries';
import { NotificationType } from '../../domain/constants/enums';

@ApiTags('Notifications')
@Controller('api/v1/notifications')
export class NotificationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('type') type?: NotificationType,
    @Query('unreadOnly') unreadOnly?: string
  ) {
    return this.queryBus.execute(
      new GetNotificationsQuery(
        user.userId,
        page ? parseInt(page, 10) : 1,
        pageSize ? parseInt(pageSize, 10) : 20,
        type,
        unreadOnly === 'true'
      )
    );
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.queryBus.execute(
      new GetUnreadCountQuery(user.userId)
    );
    return { count };
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') notificationId: string
  ) {
    await this.commandBus.execute(
      new MarkNotificationReadCommand(notificationId, user.userId)
    );
    return { success: true };
  }

  @Post('mark-all-read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.commandBus.execute(
      new MarkAllNotificationsReadCommand(user.userId)
    );
    return { success: true, count };
  }

  @Post('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register device token for push notifications' })
  async registerDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { token: string; platform: 'IOS' | 'ANDROID' | 'WEB' }
  ) {
    await this.commandBus.execute(
      new RegisterDeviceTokenCommand(user.userId, body.token, body.platform)
    );
    return { success: true };
  }

  @Delete('devices/:token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove device token' })
  async removeDevice(@Param('token') token: string) {
    await this.commandBus.execute(new RemoveDeviceTokenCommand(token));
    return { success: true };
  }
}
