import {
  Controller,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@flexobo/core';
import { UpdateUserLanguageDto, UserResponseDto, USER_LANGS } from '../dto';
import { UpdateUserProfileCommand } from '../../../application/commands';
import { GetUserByIdQuery } from '../../../application/queries';
import { JwtAuthGuard } from '../guards';
import { IUser } from '../../../ports/user.interface';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Put(':id/lang')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user language' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserLanguageDto })
  @ApiResponse({ status: 200, description: 'Language updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserLanguage(
    @Param('id') id: string,
    @Body() dto: UpdateUserLanguageDto
  ): Promise<{ data: UserResponseDto }> {
    // First check if user exists
    const existingUser = await this.queryBus.execute<IUser | null>(
      new GetUserByIdQuery(id)
    );

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Update user language using existing command
    const command = new UpdateUserProfileCommand(
      id,
      undefined, // fio
      undefined, // phoneNumber
      dto.lang,  // language
      undefined  // avatar
    );

    const result = await this.commandBus.execute<void>(command);

    if (result.isFailure) {
      throw result.error;
    }

    // Fetch updated user
    const updatedUser = await this.queryBus.execute<IUser | null>(
      new GetUserByIdQuery(id)
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return { data: this.mapToUserResponse(updatedUser) };
  }

  private mapToUserResponse(user: IUser): UserResponseDto {
    return {
      _id: user.id,
      user_unique_id: user.uniqueId,
      email: user.email ?? undefined,
      phone_number: user.phoneNumber ?? undefined,
      telegram_id: user.telegramId ?? undefined,
      fio: user.fio,
      avatar: user.avatar ?? undefined,
      role: user.role,
      user_type: user.userType ?? undefined,
      status: user.status,
      user_lang: user.language as USER_LANGS,
      is_subscribed_newsletter: user.isSubscribedNewsletter,
      is_privacy_policy_accepted: user.isPrivacyPolicyAccepted,
      platform: user.platform ?? undefined,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };
  }
}
