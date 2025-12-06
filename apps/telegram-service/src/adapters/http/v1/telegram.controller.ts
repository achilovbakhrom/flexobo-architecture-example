import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@flexobo/core';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

import {
  SendOtpCommand,
  VerifyOtpCommand,
  PublishContentCommand,
  ValidateWebAppCommand,
} from '../../../application/commands';
import {
  GetPublicationQuery,
  GetTelegramUserQuery,
} from '../../../application/queries';

// DTOs
class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  telegramId!: string;

  @IsOptional()
  @IsEnum(['REGISTRATION', 'LOGIN', 'RESET_PASSWORD'])
  type?: 'REGISTRATION' | 'LOGIN' | 'RESET_PASSWORD';
}

class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  type?: string;
}

class ValidateWebAppDto {
  @IsString()
  @IsNotEmpty()
  initData!: string;
}

class PublishContentDto {
  @IsEnum(['LOAD', 'TRIP'])
  contentType!: 'LOAD' | 'TRIP';

  @IsString()
  @IsNotEmpty()
  contentId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  details?: Record<string, string>;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  channelId?: string;
}

@ApiTags('Telegram')
@Controller('api/v1/telegram')
export class TelegramController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP via Telegram' })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Failed to send OTP' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.commandBus.execute(
      new SendOtpCommand(dto.phone, dto.telegramId, dto.type || 'LOGIN')
    );
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verification result' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.commandBus.execute(
      new VerifyOtpCommand(dto.phone, dto.code, dto.type)
    );
  }

  @Post('webapp/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate Telegram WebApp data' })
  @ApiBody({ type: ValidateWebAppDto })
  @ApiResponse({ status: 200, description: 'WebApp validation result' })
  async validateWebApp(@Body() dto: ValidateWebAppDto) {
    return this.commandBus.execute(
      new ValidateWebAppCommand(dto.initData)
    );
  }

  @Post('publish')
  @ApiOperation({ summary: 'Publish content to Telegram channel' })
  @ApiBody({ type: PublishContentDto })
  @ApiResponse({ status: 201, description: 'Content published successfully' })
  @ApiResponse({ status: 400, description: 'Failed to publish content' })
  async publishContent(@Body() dto: PublishContentDto) {
    return this.commandBus.execute(
      new PublishContentCommand(
        dto.contentType,
        dto.contentId,
        dto.title,
        dto.description,
        dto.details || {},
        dto.link,
        dto.channelId
      )
    );
  }

  @Get('publication/:contentType/:contentId')
  @ApiOperation({ summary: 'Get publication status by content' })
  @ApiResponse({ status: 200, description: 'Publication details' })
  async getPublication(
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string
  ) {
    return this.queryBus.execute(
      new GetPublicationQuery(contentType, contentId)
    );
  }

  @Get('user')
  @ApiOperation({ summary: 'Get Telegram user by telegramId or userId' })
  @ApiResponse({ status: 200, description: 'Telegram user details' })
  async getTelegramUser(
    @Query('telegramId') telegramId?: string,
    @Query('userId') userId?: string
  ) {
    return this.queryBus.execute(
      new GetTelegramUserQuery(telegramId, userId)
    );
  }
}
